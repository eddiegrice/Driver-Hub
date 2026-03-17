/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
/**
 * Traffic Scotland DATEX II receiver (Supabase Edge Function).
 * Fetches SituationPublication (Unplanned Events, Current/Future Roadworks), TravelTimeData,
 * TravelTimeSites, TrafficStatusData, TrafficStatusSites, VMS, VMSTable; parses SOAP/DATEX II
 * and upserts into traffic_situations, traffic_travel_times, traffic_travel_time_sites,
 * traffic_traffic_status, traffic_traffic_status_sites, traffic_vms, traffic_vms_table.
 *
 * Required secrets: TRAFFIC_SCOTLAND_CLIENT_ID, TRAFFIC_SCOTLAND_CLIENT_KEY.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set automatically for deployed functions.
 */

import { XMLParser } from "npm:fast-xml-parser@4.3.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const BASE_URL = "https://datex2.trafficscotland.org/rest/2.3/";
const PUBLICATIONS = [
  { path: "publications/UnplannedEvents/Content.xml", type: "unplanned_event", kind: "situation" },
  { path: "publications/CurrentRoadworks/Content.xml", type: "current_roadworks", kind: "situation" },
  { path: "publications/FutureRoadworks/Content.xml", type: "future_roadworks", kind: "situation" },
  { path: "publications/TravelTimeData/Content.xml", type: "travel_time", kind: "travel_time" },
  { path: "publications/TravelTimeSites/Content.xml", type: "travel_time_sites", kind: "travel_time_sites" },
  { path: "publications/TrafficStatusData/Content.xml", type: "traffic_status", kind: "traffic_status" },
  { path: "publications/TrafficStatusSites/Content.xml", type: "traffic_status_sites", kind: "traffic_status_sites" },
  { path: "publications/VMS/Content.xml", type: "vms", kind: "vms" },
  { path: "publications/VMSTable/Content.xml", type: "vms_table", kind: "vms_table" },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
  trimValues: true,
});

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function base64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function fetchXml(url: string, clientId: string, clientKey: string): Promise<string> {
  const auth = base64(`${clientId}:${clientKey}`);
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

function findIn(obj: any, ...keys: string[]): any {
  if (obj == null) return undefined;
  if (typeof obj !== "object") return obj;
  const lower = (k: string) => k.toLowerCase();
  const keyMatches = (k: string) => keys.some((w) => lower(k).includes(lower(w)));
  for (const [k, v] of Object.entries(obj)) {
    if (keyMatches(k)) {
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object" && !("@_id" in v) && !("#text" in v)) return v;
      return v;
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const found = findIn(v as any, ...keys);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function textOf(obj: any): string | undefined {
  if (obj == null) return undefined;
  if (typeof obj === "string") return obj.trim() || undefined;
  if (obj["#text"]) return String(obj["#text"]).trim() || undefined;
  return undefined;
}

function firstValueFromValues(obj: any): string | undefined {
  if (obj == null) return undefined;
  if (typeof obj === "string") return obj.trim() || undefined;
  const v = obj.value ?? obj.Value;
  if (v == null) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (Array.isArray(v) && v.length) return textOf(v[0]) ?? firstValueFromValues(v[0]);
  return textOf(v) ?? (v["#text"] ? String(v["#text"]).trim() : undefined);
}

function firstRecord(records: any): any {
  if (Array.isArray(records) && records.length) return records[0];
  if (records && typeof records === "object" && !Array.isArray(records)) return records;
  return undefined;
}

function collectFirstText(obj: any, maxLen = 500): string | undefined {
  if (obj == null) return undefined;
  if (typeof obj === "string") {
    const t = obj.trim();
    return t.length > 0 ? t.slice(0, maxLen) : undefined;
  }
  if (obj["#text"]) {
    const t = String(obj["#text"]).trim();
    return t.length > 0 ? t.slice(0, maxLen) : undefined;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const t = collectFirstText(item, maxLen);
      if (t) return t;
    }
    return undefined;
  }
  if (typeof obj === "object") {
    const prefer = ["generalPublicComment", "comment", "headline", "description", "value", "comment"];
    for (const key of prefer) {
      for (const [k, v] of Object.entries(obj)) {
        if (String(k).toLowerCase().includes(key.toLowerCase())) {
          const t = collectFirstText(v, maxLen);
          if (t) return t;
        }
      }
    }
    for (const v of Object.values(obj)) {
      const t = collectFirstText(v as any, maxLen);
      if (t) return t;
    }
  }
  return undefined;
}

function getLocationFromGroupOfLocations(groupOfLocations: any): { name?: string; direction?: string } {
  if (!groupOfLocations || typeof groupOfLocations !== "object") return { name: undefined, direction: undefined };
  const linear = groupOfLocations.tpegLinearLocation ?? groupOfLocations.tpeglinearlocation;
  const linArr = Array.isArray(linear) ? linear : linear ? [linear] : [];
  const seg = linArr[0];
  if (!seg) return { name: undefined, direction: undefined };
  const dir = seg.tpegDirection ?? seg.tpegdirection;
  const dirLabel =
    dir === "northBound" || dir === "northbound"
      ? "northbound"
      : dir === "southBound" || dir === "southbound"
        ? "southbound"
        : dir === "eastBound" || dir === "eastbound"
          ? "eastbound"
          : dir === "westBound" || dir === "westbound"
            ? "westbound"
            : dir
              ? String(dir).replace(/Bound$/, "bound")
              : undefined;
  const fromPoint = seg.from;
  const toPoint = seg.to;
  const getName = (point: any) => {
    if (!point || typeof point !== "object") return undefined;
    let other = point.otherName ?? point.othername ?? point.name;
    if (Array.isArray(other)) {
      const preferNonLinked = other.find(
        (n: any) =>
          n?.descriptor?.values &&
          (n.tpegOtherPointDescriptorType === "nonLinkedPointName" || n["tpegOtherPointDescriptorType"] === "nonLinkedPointName")
      );
      other = preferNonLinked ?? other.find((n: any) => n?.descriptor?.values) ?? other[0];
    }
    if (other?.descriptor?.values) return firstValueFromValues(other.descriptor.values);
    const ilc = point.ilc;
    const ilcArr = Array.isArray(ilc) ? ilc : ilc ? [ilc] : [];
    const firstIlc = ilcArr[0];
    if (firstIlc?.descriptor?.values) return firstValueFromValues(firstIlc.descriptor.values);
    return undefined;
  };
  const fromName = getName(fromPoint);
  const toName = getName(toPoint);
  const roadPart = [fromName, toName].filter(Boolean).join(" → ");
  const ilcList = fromPoint?.ilc ?? toPoint?.ilc;
  const ilcArr = Array.isArray(ilcList) ? ilcList : ilcList ? [ilcList] : [];
  const roadLabel = ilcArr[0]?.descriptor?.values ? firstValueFromValues(ilcArr[0].descriptor.values) : undefined;
  const name =
    roadLabel && roadPart ? `${roadLabel} ${dirLabel || ""}: ${roadPart}`.trim() : roadPart || roadLabel || undefined;
  return { name: name || undefined, direction: dirLabel };
}

function getLocationText(loc: any): string | undefined {
  if (!loc || typeof loc !== "object") return undefined;
  const t = textOf(loc.locationName ?? loc.name ?? loc.roadName ?? loc.roadNumber ?? loc.pointName);
  if (t) return t;
  const group = loc.groupOfLocations ?? loc.GroupOfLocations;
  const groupArr = Array.isArray(group) ? group : group ? [group] : [];
  for (const g of groupArr) {
    const { name } = getLocationFromGroupOfLocations(g);
    if (name) return name;
  }
  const contained = loc.locationContainedInGroup ?? loc.groupOfLocations;
  const arr = Array.isArray(contained) ? contained : contained ? [contained] : [];
  for (const g of arr) {
    const inner = (g as any)?.location ?? (g as any)?.locationReference ?? (g as any)?.tpegLinearLocation;
    const innerArr = Array.isArray(inner) ? inner : inner ? [inner] : [];
    for (const loc2 of innerArr) {
      const t2 = textOf((loc2 as any)?.name ?? (loc2 as any)?.locationName ?? (loc2 as any)?.roadNumber);
      if (t2) return t2;
    }
  }
  return collectFirstText(loc, 120);
}

function situationTypeLabel(path: string): string {
  if (path.includes("Unplanned")) return "Unplanned event";
  if (path.includes("CurrentRoadworks")) return "Current roadworks";
  if (path.includes("FutureRoadworks")) return "Planned roadworks";
  return path;
}

function extractSituations(parsed: any, sourcePublication: string, situationType: string): any[] {
  const out: any[] = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.["soapenv:Envelope"];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.["soapenv:Body"];
  const model = body?.["d2LogicalModel"] ?? body?.["D2LogicalModel"];
  if (!model) return out;
  const payload = findIn(model, "payloadPublication", "situationPublication");
  const pub = payload?.situationPublication ?? payload?.SituationPublication ?? payload;
  if (!pub) return out;
  let situations = pub.situation ?? pub.Situation;
  if (!situations) return out;
  if (!Array.isArray(situations)) situations = [situations];
  for (const sit of situations) {
    const id = sit["@_id"] ?? sit["@_identifier"] ?? sit.id ?? sit.identifier;
    const externalId = id || `unknown-${sourcePublication}-${out.length}-${Date.now()}`;
    const rec = sit.situationRecord ?? sit.SituationRecord ?? sit.header ?? sit.Header;
    const records = Array.isArray(rec) ? rec : rec ? [rec] : [];
    const first = firstRecord(records) ?? sit;
    const validity = first.validity ?? first.Validity ?? first.validityTime ?? first.validityPeriod;
    const validityObj = Array.isArray(validity) ? validity[0] : validity;
    const spec = validityObj?.validityTimeSpecification ?? validityObj?.validityTimeSpec;
    const specArr = Array.isArray(spec) ? spec : spec ? [spec] : [];
    const specObj = specArr[0] ?? validityObj;
    const startTime = specObj?.overallStartTime ?? validityObj?.overallStartTime ?? first.overallStartTime;
    const endTime = specObj?.overallEndTime ?? validityObj?.overallEndTime ?? first.overallEndTime;
    const headline = textOf(sit.headerInformation?.headline ?? sit.header?.headline ?? sit.headline ?? sit.Headline);
    const gpc = first.generalPublicComment ?? first.GeneralPublicComment;
    const commentText = gpc?.comment?.values ? firstValueFromValues(gpc.comment.values) : null;
    const description =
      commentText ||
      headline ||
      textOf(first.comment ?? first.description) ||
      collectFirstText(first) ||
      collectFirstText(sit);
    const severity = textOf(sit.overallSeverity ?? sit.overallseverity ?? first.severity) ?? undefined;
    const groupOfLocations = first.groupOfLocations ?? first.GroupOfLocations ?? first.location ?? sit.groupOfLocations;
    const locGroup = Array.isArray(groupOfLocations) ? groupOfLocations[0] : groupOfLocations;
    let locationName: string | undefined;
    let locationDirection: string | undefined;
    if (locGroup) {
      const locInfo = getLocationFromGroupOfLocations(locGroup);
      locationName = locInfo.name ?? getLocationText(locGroup);
      locationDirection = locInfo.direction ?? textOf(locGroup?.direction ?? locGroup?.tpegDirection);
    }
    if (!locationName) locationName = getLocationText(locGroup) ?? textOf(locGroup?.locationName ?? locGroup?.name);
    const title =
      headline ||
      (description ? description.slice(0, 100).replace(/\s+/g, " ").trim() : null) ||
      (locationName ? `${situationTypeLabel(sourcePublication)} – ${locationName}` : null) ||
      situationTypeLabel(sourcePublication) + " – Traffic situation";
    out.push({
      external_id: String(externalId),
      source_publication: sourcePublication,
      situation_type: situationType,
      title: title,
      description: description || null,
      location_name: locationName,
      location_direction: locationDirection,
      severity: severity,
      start_time: startTime || null,
      end_time: endTime || null,
      raw_payload: null,
    });
  }
  return out;
}

function extractTravelTimeMeasurements(parsed: any): any[] {
  const out: any[] = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.["soapenv:Envelope"];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.["soapenv:Body"];
  const model = body?.["d2LogicalModel"] ?? body?.["D2LogicalModel"];
  if (!model) return out;
  const payload = findIn(model, "payloadPublication", "measuredDataPublication");
  const pub = payload?.measuredDataPublication ?? payload?.MeasuredDataPublication ?? payload;
  if (!pub) return out;
  let siteMeasurements = pub.siteMeasurements ?? pub.SiteMeasurements;
  if (!siteMeasurements) return out;
  if (!Array.isArray(siteMeasurements)) siteMeasurements = [siteMeasurements];
  for (const sm of siteMeasurements) {
    const ref = sm.measurementSiteReference ?? sm.MeasurementSiteReference;
    const siteId = ref?.["@_id"] ?? ref?.id ?? sm["@_id"];
    if (!siteId) continue;
    const measuredAt = sm.measurementTimeDefault ?? sm.MeasurementTimeDefault ?? sm.measurementTime;
    if (!measuredAt) continue;
    let mv = sm.measuredValue ?? sm.MeasuredValue;
    if (Array.isArray(mv)) mv = mv[0];
    const inner = mv?.measuredValue ?? mv?.MeasuredValue;
    const innerMv = Array.isArray(inner) ? inner[0] : inner;
    const basicData = innerMv?.basicData ?? innerMv?.BasicData;
    if (!basicData) continue;
    const travelTime = basicData.travelTime ?? basicData.TravelTime;
    const freeFlow = basicData.freeFlowTravelTime ?? basicData.FreeFlowTravelTime;
    const normal = basicData.normallyExpectedTravelTime ?? basicData.NormallyExpectedTravelTime;
    const speed = basicData.freeFlowSpeed ?? basicData.FreeFlowSpeed;
    const num = (o: any) => {
      if (o == null) return null;
      const d = o.duration ?? o.Duration ?? o["#text"];
      const s = o.speed ?? o.Speed;
      const n = d != null ? Number(d) : s != null ? Number(s) : null;
      return Number.isFinite(n) ? n : null;
    };
    out.push({
      site_id: String(siteId),
      measured_at: String(measuredAt).trim(),
      travel_time_sec: num(travelTime),
      free_flow_travel_time_sec: num(freeFlow),
      normally_expected_travel_time_sec: num(normal),
      free_flow_speed_kmh: num(speed),
    });
  }
  return out;
}

function extractTravelTimeSites(parsed: any): any[] {
  const out: any[] = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.["soapenv:Envelope"];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.["soapenv:Body"];
  const model = body?.["d2LogicalModel"] ?? body?.["D2LogicalModel"];
  if (!model) return out;
  const payload = findIn(model, "payloadPublication", "measurementSiteTablePublication");
  const pub = payload?.measurementSiteTablePublication ?? payload?.MeasurementSiteTablePublication ?? payload;
  if (!pub) return out;
  const table = pub.measurementSiteTable ?? pub.MeasurementSiteTable ?? findIn(pub, "measurementSiteTable");
  if (!table) return out;
  let records = table.measurementSiteRecord ?? table.MeasurementSiteRecord;
  if (!records) return out;
  if (!Array.isArray(records)) records = [records];
  for (const rec of records) {
    const siteId = rec["@_id"] ?? rec.id;
    if (!siteId) continue;
    const nameObj = rec.measurementSiteName ?? rec.MeasurementSiteName;
    const siteName = nameObj?.values ? firstValueFromValues(nameObj.values) : undefined;
    const side = rec.measurementSide ?? rec.MeasurementSide;
    const direction =
      side === "northBound" || side === "northbound"
        ? "northbound"
        : side === "southBound" || side === "southbound"
          ? "southbound"
          : side === "eastBound" || side === "eastbound"
            ? "eastbound"
            : side === "westBound" || side === "westbound"
              ? "westbound"
              : side
                ? String(side).replace(/Bound$/, "bound")
                : null;
    out.push({ site_id: String(siteId), site_name: siteName || null, direction: direction || null });
  }
  return out;
}

function extractTrafficStatusSites(parsed: any): any[] {
  const out: any[] = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.["soapenv:Envelope"];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.["soapenv:Body"];
  const model = body?.["d2LogicalModel"] ?? body?.["D2LogicalModel"];
  if (!model) return out;
  const payload = findIn(model, "payloadPublication", "measurementSiteTablePublication");
  const pub = payload?.measurementSiteTablePublication ?? payload?.MeasurementSiteTablePublication ?? payload;
  if (!pub) return out;
  const table = pub.measurementSiteTable ?? pub.MeasurementSiteTable ?? findIn(pub, "measurementSiteTable");
  if (!table) return out;
  let records = table.measurementSiteRecord ?? table.MeasurementSiteRecord;
  if (!records) return out;
  if (!Array.isArray(records)) records = [records];
  for (const rec of records) {
    const siteId = rec["@_id"] ?? rec.id;
    if (!siteId) continue;
    const nameObj = rec.measurementSiteName ?? rec.MeasurementSiteName;
    const siteName = nameObj?.values ? firstValueFromValues(nameObj.values) : undefined;
    const side = rec.measurementSide ?? rec.MeasurementSide;
    const direction =
      side === "northBound" || side === "northbound"
        ? "northbound"
        : side === "southBound" || side === "southbound"
          ? "southbound"
          : side === "eastBound" || side === "eastbound"
            ? "eastbound"
            : side === "westBound" || side === "westbound"
              ? "westbound"
              : side
                ? String(side).replace(/Bound$/, "bound")
                : null;
    out.push({ site_id: String(siteId), site_name: siteName || null, direction: direction || null });
  }
  return out;
}

function extractTrafficStatusMeasurements(parsed: any): any[] {
  const out: any[] = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.["soapenv:Envelope"];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.["soapenv:Body"];
  const model = body?.["d2LogicalModel"] ?? body?.["D2LogicalModel"];
  if (!model) return out;
  const payload = findIn(model, "payloadPublication", "measuredDataPublication");
  const pub = payload?.measuredDataPublication ?? payload?.MeasuredDataPublication ?? payload;
  if (!pub) return out;
  let siteMeasurements = pub.siteMeasurements ?? pub.SiteMeasurements;
  if (!siteMeasurements) return out;
  if (!Array.isArray(siteMeasurements)) siteMeasurements = [siteMeasurements];
  for (const sm of siteMeasurements) {
    const ref = sm.measurementSiteReference ?? sm.MeasurementSiteReference;
    const siteId = ref?.["@_id"] ?? ref?.id ?? sm["@_id"];
    if (!siteId) continue;
    const measuredAt = sm.measurementTimeDefault ?? sm.MeasurementTimeDefault ?? sm.measurementTime;
    if (!measuredAt) continue;
    let mv = sm.measuredValue ?? sm.MeasuredValue;
    if (Array.isArray(mv)) mv = mv[0];
    const inner = mv?.measuredValue ?? mv?.MeasuredValue;
    const innerMv = Array.isArray(inner) ? inner[0] : inner;
    const basicData = innerMv?.basicData ?? innerMv?.BasicData;
    if (!basicData) continue;
    const trafficStatus = basicData.trafficStatus ?? basicData.TrafficStatus;
    const value = trafficStatus?.trafficStatusValue ?? trafficStatus?.TrafficStatusValue ?? trafficStatus?.["#text"];
    out.push({
      site_id: String(siteId),
      measured_at: String(measuredAt).trim(),
      traffic_status_value: value != null ? String(value).trim() || null : null,
    });
  }
  return out;
}

function collectVmsTextLines(obj: any, lines: string[] = []): string[] {
  if (obj == null) return lines;
  if (typeof obj === "string") {
    const t = obj.trim();
    if (t) lines.push(t);
    return lines;
  }
  if (obj["#text"]) {
    const t = String(obj["#text"]).trim();
    if (t) lines.push(t);
    return lines;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) collectVmsTextLines(item, lines);
    return lines;
  }
  if (typeof obj === "object") {
    const line = obj.vmsTextLine ?? obj.VmsTextLine;
    if (line !== undefined) {
      collectVmsTextLines(line, lines);
      return lines;
    }
    const vmsText = obj.vmsText ?? obj.VmsText;
    if (vmsText !== undefined) {
      collectVmsTextLines(vmsText, lines);
      return lines;
    }
    for (const v of Object.values(obj)) collectVmsTextLines(v as any, lines);
  }
  return lines;
}

function extractVms(parsed: any): any[] {
  const out: any[] = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.["soapenv:Envelope"];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.["soapenv:Body"];
  const model = body?.["d2LogicalModel"] ?? body?.["D2LogicalModel"];
  if (!model) return out;
  const payload = findIn(model, "payloadPublication", "vmsPublication");
  const pub = payload?.vmsPublication ?? payload?.VmsPublication ?? payload;
  if (!pub) return out;
  let units = pub.vmsUnit ?? pub.VmsUnit;
  if (!units) return out;
  if (!Array.isArray(units)) units = [units];
  for (const unit of units) {
    const ref = unit.vmsUnitReference ?? unit.VmsUnitReference;
    const vmsId = ref?.["@_id"] ?? unit["@_id"];
    if (!vmsId) continue;
    let vmsBlock = unit.vms ?? unit.Vms;
    if (Array.isArray(vmsBlock)) vmsBlock = vmsBlock[0];
    const vms = vmsBlock?.vms ?? vmsBlock?.Vms;
    const inner = Array.isArray(vms) ? vms[0] : vms;
    if (!inner) {
      out.push({
        vms_id: String(vmsId),
        message_text: null,
        time_last_set: null,
        vms_working: null,
        text_lanterns_on: null,
      });
      continue;
    }
    const vmsWorking = inner.vmsWorking ?? inner.VmsWorking;
    const working = vmsWorking === true || vmsWorking === "true";
    let msg = inner.vmsMessage ?? inner.VmsMessage;
    if (Array.isArray(msg)) msg = msg[0];
    const msgInner = msg?.vmsMessage ?? msg?.VmsMessage;
    const msgObj = Array.isArray(msgInner) ? msgInner[0] : msgInner;
    const timeLastSet = msgObj?.timeLastSet ?? msgObj?.TimeLastSet ?? null;
    const textPage = msgObj?.textPage ?? msgObj?.TextPage;
    const textPageArr = Array.isArray(textPage) ? textPage : textPage ? [textPage] : [];
    const lines: string[] = [];
    for (const page of textPageArr) {
      collectVmsTextLines((page as any)?.vmsText ?? (page as any)?.VmsText ?? page, lines);
    }
    const messageText = lines.length ? lines.join(" ").trim() || null : null;
    const settings = inner.textDisplayAreaSettings ?? inner.TextDisplayAreaSettings;
    const settingsArr = Array.isArray(settings) ? settings : settings ? [settings] : [];
    const firstSettings = settingsArr[0];
    const lanterns = firstSettings?.textLanternsOn ?? firstSettings?.TextLanternsOn;
    const textLanternsOn = lanterns === true || lanterns === "true";
    out.push({
      vms_id: String(vmsId),
      message_text: messageText,
      time_last_set: timeLastSet || null,
      vms_working: working,
      text_lanterns_on: textLanternsOn,
    });
  }
  return out;
}

function getPointDisplayName(point: any): string | undefined {
  if (!point || typeof point !== "object") return undefined;
  let names = point.name ?? point.otherName ?? point.othername;
  if (!Array.isArray(names)) names = names ? [names] : [];
  const preferNonLinked = names.find(
    (n: any) =>
      n?.descriptor?.values &&
      (n.tpegOtherPointDescriptorType === "nonLinkedPointName" || n["tpegOtherPointDescriptorType"] === "nonLinkedPointName")
  );
  const entry = preferNonLinked ?? names.find((n: any) => n?.descriptor?.values) ?? names[0];
  return entry?.descriptor?.values ? firstValueFromValues(entry.descriptor.values) : undefined;
}

function extractVmsTable(parsed: any): any[] {
  const out: any[] = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.["soapenv:Envelope"];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.["soapenv:Body"];
  const model = body?.["d2LogicalModel"] ?? body?.["D2LogicalModel"];
  if (!model) return out;
  const payload = findIn(model, "payloadPublication", "vmsTablePublication");
  const pub = payload?.vmsTablePublication ?? payload?.VmsTablePublication ?? payload;
  if (!pub) return out;
  const table = pub.vmsUnitTable ?? pub.VmsUnitTable ?? findIn(pub, "vmsUnitTable");
  if (!table) return out;
  let records = table.vmsUnitRecord ?? table.VmsUnitRecord;
  if (!records) return out;
  if (!Array.isArray(records)) records = [records];
  for (const rec of records) {
    const vmsId = rec["@_id"] ?? rec.id;
    if (!vmsId) continue;
    let vmsRecord = rec.vmsRecord ?? rec.VmsRecord;
    if (Array.isArray(vmsRecord)) vmsRecord = vmsRecord[0];
    const inner = vmsRecord?.vmsRecord ?? vmsRecord?.VmsRecord;
    const recordObj = Array.isArray(inner) ? inner[0] : inner;
    const location = recordObj?.vmsLocation ?? recordObj?.VmsLocation;
    if (!location) {
      out.push({ vms_id: String(vmsId), location_name: null, direction: null, latitude: null, longitude: null });
      continue;
    }
    const pointLoc = location.tpegPointLocation ?? location.TpegPointLocation;
    const framed = pointLoc?.framedPoint ?? pointLoc?.FramedPoint;
    const directionRaw = pointLoc?.tpegDirection ?? pointLoc?.TpegDirection;
    const direction =
      directionRaw === "northBound" || directionRaw === "northbound"
        ? "northbound"
        : directionRaw === "southBound" || directionRaw === "southbound"
          ? "southbound"
          : directionRaw === "eastBound" || directionRaw === "eastbound"
            ? "eastbound"
            : directionRaw === "westBound" || directionRaw === "westbound"
              ? "westbound"
              : directionRaw
                ? String(directionRaw).replace(/Bound$/, "bound")
                : null;
    const locationName = framed ? getPointDisplayName(framed) : undefined;
    const coords = framed?.pointCoordinates ?? framed?.PointCoordinates;
    const lat = coords?.latitude ?? coords?.Latitude;
    const lon = coords?.longitude ?? coords?.Longitude;
    const latitude = lat != null && Number.isFinite(Number(lat)) ? Number(lat) : null;
    const longitude = lon != null && Number.isFinite(Number(lon)) ? Number(lon) : null;
    out.push({
      vms_id: String(vmsId),
      location_name: locationName || null,
      direction: direction || null,
      latitude,
      longitude,
    });
  }
  return out;
}

async function run(): Promise<{
  situations: number;
  travelTimes: number;
  travelTimeSites: number;
  trafficStatus: number;
  trafficStatusSites: number;
  vms: number;
  vmsTable: number;
}> {
  const clientId = getEnv("TRAFFIC_SCOTLAND_CLIENT_ID");
  const clientKey = getEnv("TRAFFIC_SCOTLAND_CLIENT_KEY");
  const supabaseUrl = getEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const allSituations: any[] = [];
  const allTravelTimes: any[] = [];
  const allTravelTimeSites: any[] = [];
  const allTrafficStatus: any[] = [];
  const allTrafficStatusSites: any[] = [];
  const allVms: any[] = [];
  const allVmsTable: any[] = [];

  for (const pub of PUBLICATIONS) {
    const url = `${BASE_URL}${pub.path}`;
    try {
      const xml = await fetchXml(url, clientId, clientKey);
      const parsed = parser.parse(xml);
      if (pub.kind === "travel_time") {
        allTravelTimes.push(...extractTravelTimeMeasurements(parsed));
      } else if (pub.kind === "travel_time_sites") {
        allTravelTimeSites.push(...extractTravelTimeSites(parsed));
      } else if (pub.kind === "traffic_status") {
        allTrafficStatus.push(...extractTrafficStatusMeasurements(parsed));
      } else if (pub.kind === "traffic_status_sites") {
        allTrafficStatusSites.push(...extractTrafficStatusSites(parsed));
      } else if (pub.kind === "vms") {
        allVms.push(...extractVms(parsed));
      } else if (pub.kind === "vms_table") {
        allVmsTable.push(...extractVmsTable(parsed));
      } else {
        const situations = extractSituations(
          parsed,
          pub.path.replace("/Content.xml", "").replace("publications/", ""),
          pub.type
        );
        allSituations.push(...situations);
      }
    } catch (e) {
      console.error(`Error fetching ${pub.path}:`, (e as Error).message);
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date().toISOString();

  if (allSituations.length > 0) {
    const { error } = await supabase
      .from("traffic_situations")
      .upsert(allSituations.map((row) => ({ ...row, updated_at: now })), { onConflict: "external_id,source_publication" });
    if (error) throw new Error(`traffic_situations: ${error.message}`);
  }
  if (allTravelTimes.length > 0) {
    const { error } = await supabase
      .from("traffic_travel_times")
      .upsert(allTravelTimes.map((row) => ({ ...row, updated_at: now })), { onConflict: "site_id,measured_at" });
    if (error) throw new Error(`traffic_travel_times: ${error.message}`);
  }
  if (allTravelTimeSites.length > 0) {
    const { error } = await supabase
      .from("traffic_travel_time_sites")
      .upsert(allTravelTimeSites.map((row) => ({ ...row, updated_at: now })), { onConflict: "site_id" });
    if (error) throw new Error(`traffic_travel_time_sites: ${error.message}`);
  }
  if (allTrafficStatus.length > 0) {
    const { error } = await supabase
      .from("traffic_traffic_status")
      .upsert(allTrafficStatus.map((row) => ({ ...row, updated_at: now })), { onConflict: "site_id,measured_at" });
    if (error) throw new Error(`traffic_traffic_status: ${error.message}`);
  }
  if (allTrafficStatusSites.length > 0) {
    const { error } = await supabase
      .from("traffic_traffic_status_sites")
      .upsert(allTrafficStatusSites.map((row) => ({ ...row, updated_at: now })), { onConflict: "site_id" });
    if (error) throw new Error(`traffic_traffic_status_sites: ${error.message}`);
  }
  if (allVms.length > 0) {
    const { error } = await supabase
      .from("traffic_vms")
      .upsert(allVms.map((row) => ({ ...row, updated_at: now })), { onConflict: "vms_id" });
    if (error) throw new Error(`traffic_vms: ${error.message}`);
  }
  if (allVmsTable.length > 0) {
    const { error } = await supabase
      .from("traffic_vms_table")
      .upsert(allVmsTable.map((row) => ({ ...row, updated_at: now })), { onConflict: "vms_id" });
    if (error) throw new Error(`traffic_vms_table: ${error.message}`);
  }

  return {
    situations: allSituations.length,
    travelTimes: allTravelTimes.length,
    travelTimeSites: allTravelTimeSites.length,
    trafficStatus: allTrafficStatus.length,
    trafficStatusSites: allTrafficStatusSites.length,
    vms: allVms.length,
    vmsTable: allVmsTable.length,
  };
}

Deno.serve(async () => {
  try {
    const summary = await run();
    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

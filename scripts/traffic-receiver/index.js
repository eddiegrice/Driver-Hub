/**
 * Traffic Scotland DATEX II receiver.
 * Fetches SituationPublication (Unplanned Events, Current/Future Roadworks), TravelTimeData,
 * TravelTimeSites, TrafficStatusData, TrafficStatusSites, and VMS; parses SOAP-wrapped DATEX II
 * and upserts into traffic_situations, traffic_travel_times, traffic_travel_time_sites,
 * traffic_traffic_status, traffic_traffic_status_sites, traffic_vms, traffic_vms_table.
 *
 * Required env vars:
 *   TRAFFIC_SCOTLAND_CLIENT_ID
 *   TRAFFIC_SCOTLAND_CLIENT_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: node index.js  (or npm run run from scripts/traffic-receiver)
 * With .env in scripts/traffic-receiver/: npm install then node index.js (dotenv loads .env automatically).
 */

try {
  await import('dotenv/config');
} catch {
  // dotenv optional; rely on env vars if not installed
}
import { XMLParser } from 'fast-xml-parser';
import fetch from 'node-fetch';

const BASE_URL = 'https://datex2.trafficscotland.org/rest/2.3/';
const PUBLICATIONS = [
  { path: 'publications/UnplannedEvents/Content.xml', type: 'unplanned_event', kind: 'situation' },
  { path: 'publications/CurrentRoadworks/Content.xml', type: 'current_roadworks', kind: 'situation' },
  { path: 'publications/FutureRoadworks/Content.xml', type: 'future_roadworks', kind: 'situation' },
  { path: 'publications/TravelTimeData/Content.xml', type: 'travel_time', kind: 'travel_time' },
  { path: 'publications/TravelTimeSites/Content.xml', type: 'travel_time_sites', kind: 'travel_time_sites' },
  { path: 'publications/TrafficStatusData/Content.xml', type: 'traffic_status', kind: 'traffic_status' },
  { path: 'publications/TrafficStatusSites/Content.xml', type: 'traffic_status_sites', kind: 'traffic_status_sites' },
  { path: 'publications/VMS/Content.xml', type: 'vms', kind: 'vms' },
  { path: 'publications/VMSTable/Content.xml', type: 'vms_table', kind: 'vms_table' },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  trimValues: true,
});

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function base64(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

async function fetchXml(url, clientId, clientKey) {
  const auth = base64(`${clientId}:${clientKey}`);
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

/**
 * Recursively find values in a nested object (XML parsed to JS).
 * Keys may be with or without namespace prefix (e.g. "situation" or "datex2:situation").
 */
function findIn(obj, ...keys) {
  if (obj == null) return undefined;
  if (typeof obj !== 'object') return obj;
  const lower = (k) => k.toLowerCase();
  const keyMatches = (k) => keys.some((w) => lower(k).includes(lower(w)));
  for (const [k, v] of Object.entries(obj)) {
    if (keyMatches(k)) {
      if (Array.isArray(v)) return v;
      if (v && typeof v === 'object' && !('@_id' in v) && !('#text' in v)) return v;
      return v;
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const found = findIn(v, ...keys);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function textOf(obj) {
  if (obj == null) return undefined;
  if (typeof obj === 'string') return obj.trim() || undefined;
  if (obj['#text']) return String(obj['#text']).trim() || undefined;
  return undefined;
}

/** Get first string from DATEX II values/value (comment.values.value or descriptor.values.value). */
function firstValueFromValues(obj) {
  if (obj == null) return undefined;
  if (typeof obj === 'string') return obj.trim() || undefined;
  const v = obj.value ?? obj.Value;
  if (v == null) return undefined;
  if (typeof v === 'string') return v.trim() || undefined;
  if (Array.isArray(v) && v.length) return textOf(v[0]) ?? firstValueFromValues(v[0]);
  return textOf(v) ?? (v['#text'] ? String(v['#text']).trim() : undefined);
}

function firstRecord(records) {
  if (Array.isArray(records) && records.length) return records[0];
  if (records && typeof records === 'object' && !Array.isArray(records)) return records;
  return undefined;
}

/** Recursively collect first substantial string from an object (for description fallback). */
function collectFirstText(obj, maxLen = 500) {
  if (obj == null) return undefined;
  if (typeof obj === 'string') {
    const t = obj.trim();
    return t.length > 0 ? t.slice(0, maxLen) : undefined;
  }
  if (obj['#text']) {
    const t = String(obj['#text']).trim();
    return t.length > 0 ? t.slice(0, maxLen) : undefined;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const t = collectFirstText(item, maxLen);
      if (t) return t;
    }
    return undefined;
  }
  if (typeof obj === 'object') {
    const prefer = ['generalPublicComment', 'comment', 'headline', 'description', 'value', 'comment'];
    for (const key of prefer) {
      for (const [k, v] of Object.entries(obj)) {
        if (k.toLowerCase().includes(key.toLowerCase())) {
          const t = collectFirstText(v, maxLen);
          if (t) return t;
        }
      }
    }
    for (const v of Object.values(obj)) {
      const t = collectFirstText(v, maxLen);
      if (t) return t;
    }
  }
  return undefined;
}

/**
 * Get location text from Traffic Scotland DATEX II structure.
 * groupOfLocations (Linear) → tpegLinearLocation: tpegDirection, from/to (TpegJunction)
 * with otherName/ilc → descriptor.values.value (e.g. "A78/B746", "A90 Brechin").
 */
function getLocationFromGroupOfLocations(groupOfLocations) {
  if (!groupOfLocations || typeof groupOfLocations !== 'object') return { name: undefined, direction: undefined };
  const linear = groupOfLocations.tpegLinearLocation ?? groupOfLocations.tpeglinearlocation;
  const linArr = Array.isArray(linear) ? linear : linear ? [linear] : [];
  const seg = linArr[0];
  if (!seg) return { name: undefined, direction: undefined };

  const dir = seg.tpegDirection ?? seg.tpegdirection;
  const dirLabel =
    dir === 'northBound' || dir === 'northbound'
      ? 'northbound'
      : dir === 'southBound' || dir === 'southbound'
        ? 'southbound'
        : dir === 'eastBound' || dir === 'eastbound'
          ? 'eastbound'
          : dir === 'westBound' || dir === 'westbound'
            ? 'westbound'
            : dir
              ? String(dir).replace(/Bound$/, 'bound')
              : undefined;

  const fromPoint = seg.from;
  const toPoint = seg.to;
  const getName = (point) => {
    if (!point || typeof point !== 'object') return undefined;
    let other = point.otherName ?? point.othername ?? point.name;
    // Current/Future Roadworks: name can be an array of { descriptor, tpegOtherPointDescriptorType }
    if (Array.isArray(other)) {
      const preferNonLinked = other.find(
        (n) => n?.descriptor?.values && (n.tpegOtherPointDescriptorType === 'nonLinkedPointName' || n['tpegOtherPointDescriptorType'] === 'nonLinkedPointName')
      );
      other = preferNonLinked ?? other.find((n) => n?.descriptor?.values) ?? other[0];
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
  const roadPart = [fromName, toName].filter(Boolean).join(' → ');
  const ilcList = fromPoint?.ilc ?? toPoint?.ilc;
  const ilcArr = Array.isArray(ilcList) ? ilcList : ilcList ? [ilcList] : [];
  const roadLabel = ilcArr[0]?.descriptor?.values ? firstValueFromValues(ilcArr[0].descriptor.values) : undefined;
  const name = roadLabel && roadPart
    ? `${roadLabel} ${dirLabel || ''}: ${roadPart}`.trim()
    : roadPart || roadLabel || undefined;
  return { name: name || undefined, direction: dirLabel };
}

/** Fallback: get location text from other DATEX II location structures. */
function getLocationText(loc) {
  if (!loc || typeof loc !== 'object') return undefined;
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
    const inner = g?.location ?? g?.locationReference ?? g?.tpegLinearLocation;
    const innerArr = Array.isArray(inner) ? inner : inner ? [inner] : [];
    for (const loc2 of innerArr) {
      const t2 = textOf(loc2?.name ?? loc2?.locationName ?? loc2?.roadNumber);
      if (t2) return t2;
    }
  }
  return collectFirstText(loc, 120);
}

/**
 * Extract situations from parsed SOAP/DATEX II structure.
 * Handles namespace variants and nested payload.
 */
function extractSituations(parsed, sourcePublication, situationType) {
  const out = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.['soapenv:Envelope'];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.['soapenv:Body'];
  const model = body?.['d2LogicalModel'] ?? body?.['D2LogicalModel'];
  if (!model) return out;

  // Traffic Scotland uses payloadPublication (xsi:type="SituationPublication"), not situationPublication
  const payload = findIn(model, 'payloadPublication', 'situationPublication');
  const pub = payload?.situationPublication ?? payload?.SituationPublication ?? payload;
  if (!pub) return out;

  let situations = pub.situation ?? pub.Situation;
  if (!situations) return out;
  if (!Array.isArray(situations)) situations = [situations];

  for (const sit of situations) {
    const id = sit['@_id'] ?? sit['@_identifier'] ?? sit.id ?? sit.identifier;
    const externalId = id || `unknown-${sourcePublication}-${out.length}-${Date.now()}`;

    const rec = sit.situationRecord ?? sit.SituationRecord ?? sit.header ?? sit.Header;
    const records = Array.isArray(rec) ? rec : rec ? [rec] : [];
    const first = firstRecord(records) ?? sit;

    // Validity: Traffic Scotland uses validity.validityTimeSpecification.overallStartTime
    const validity = first.validity ?? first.Validity ?? first.validityTime ?? first.validityPeriod;
    const validityObj = Array.isArray(validity) ? validity[0] : validity;
    const spec = validityObj?.validityTimeSpecification ?? validityObj?.validityTimeSpec;
    const specArr = Array.isArray(spec) ? spec : spec ? [spec] : [];
    const specObj = specArr[0] ?? validityObj;
    const startTime = specObj?.overallStartTime ?? validityObj?.overallStartTime ?? first.overallStartTime;
    const endTime = specObj?.overallEndTime ?? validityObj?.overallEndTime ?? first.overallEndTime;

    const headline = textOf(sit.headerInformation?.headline ?? sit.header?.headline ?? sit.headline ?? sit.Headline);
    // Traffic Scotland: generalPublicComment.comment.values.value (string or array of { value })
    const gpc = first.generalPublicComment ?? first.GeneralPublicComment;
    const commentText =
      gpc?.comment?.values ? firstValueFromValues(gpc.comment.values) : null;
    const description =
      commentText ||
      headline ||
      textOf(first.comment ?? first.description) ||
      collectFirstText(first) ||
      collectFirstText(sit);

    const severity = textOf(sit.overallSeverity ?? sit.overallseverity ?? first.severity) ?? undefined;

    // Traffic Scotland: groupOfLocations (Linear) → tpegLinearLocation with from/to, otherName, ilc
    const groupOfLocations = first.groupOfLocations ?? first.GroupOfLocations ?? first.location ?? sit.groupOfLocations;
    const locGroup = Array.isArray(groupOfLocations) ? groupOfLocations[0] : groupOfLocations;
    let locationName = undefined;
    let locationDirection = undefined;
    if (locGroup) {
      const locInfo = getLocationFromGroupOfLocations(locGroup);
      locationName = locInfo.name ?? getLocationText(locGroup);
      locationDirection = locInfo.direction ?? textOf(locGroup?.direction ?? locGroup?.tpegDirection);
    }
    if (!locationName) locationName = getLocationText(locGroup) ?? textOf(locGroup?.locationName ?? locGroup?.name);

    const title =
      headline ||
      (description ? description.slice(0, 100).replace(/\s+/g, ' ').trim() : null) ||
      (locationName ? `${situationTypeLabel(sourcePublication)} – ${locationName}` : null) ||
      situationTypeLabel(sourcePublication) + ' – Traffic situation';

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
      raw_payload: process.env.KEEP_RAW_PAYLOAD ? sit : null,
    });
  }
  return out;
}

/**
 * Extract travel time measurements from MeasuredDataPublication (TravelTimeData).
 * Payload: siteMeasurements[] with measurementSiteReference @_id, measurementTimeDefault,
 * measuredValue.basicData (TravelTimeData): travelTime.duration, freeFlowTravelTime.duration,
 * normallyExpectedTravelTime.duration, freeFlowSpeed.speed.
 */
function extractTravelTimeMeasurements(parsed) {
  const out = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.['soapenv:Envelope'];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.['soapenv:Body'];
  const model = body?.['d2LogicalModel'] ?? body?.['D2LogicalModel'];
  if (!model) return out;

  const payload = findIn(model, 'payloadPublication', 'measuredDataPublication');
  const pub = payload?.measuredDataPublication ?? payload?.MeasuredDataPublication ?? payload;
  if (!pub) return out;

  let siteMeasurements = pub.siteMeasurements ?? pub.SiteMeasurements;
  if (!siteMeasurements) return out;
  if (!Array.isArray(siteMeasurements)) siteMeasurements = [siteMeasurements];

  for (const sm of siteMeasurements) {
    const ref = sm.measurementSiteReference ?? sm.MeasurementSiteReference;
    const siteId = ref?.['@_id'] ?? ref?.id ?? sm['@_id'];
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

    const num = (o) => {
      if (o == null) return null;
      const d = o.duration ?? o.Duration ?? o['#text'];
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

/**
 * Extract travel time site records from MeasurementSiteTablePublication (TravelTimeSites).
 * Payload: measurementSiteTable.measurementSiteRecord[] with id, measurementSiteName.values,
 * measurementSide, measurementSiteLocation (Linear) with tpegLinearLocation from/to.
 */
function extractTravelTimeSites(parsed) {
  const out = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.['soapenv:Envelope'];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.['soapenv:Body'];
  const model = body?.['d2LogicalModel'] ?? body?.['D2LogicalModel'];
  if (!model) return out;

  const payload = findIn(model, 'payloadPublication', 'measurementSiteTablePublication');
  const pub = payload?.measurementSiteTablePublication ?? payload?.MeasurementSiteTablePublication ?? payload;
  if (!pub) return out;

  const table = pub.measurementSiteTable ?? pub.MeasurementSiteTable ?? findIn(pub, 'measurementSiteTable');
  if (!table) return out;

  let records = table.measurementSiteRecord ?? table.MeasurementSiteRecord;
  if (!records) return out;
  if (!Array.isArray(records)) records = [records];

  for (const rec of records) {
    const siteId = rec['@_id'] ?? rec.id;
    if (!siteId) continue;

    const nameObj = rec.measurementSiteName ?? rec.MeasurementSiteName;
    const siteName = nameObj?.values ? firstValueFromValues(nameObj.values) : undefined;

    const side = rec.measurementSide ?? rec.MeasurementSide;
    const direction =
      side === 'northBound' || side === 'northbound'
        ? 'northbound'
        : side === 'southBound' || side === 'southbound'
          ? 'southbound'
          : side === 'eastBound' || side === 'eastbound'
            ? 'eastbound'
            : side === 'westBound' || side === 'westbound'
              ? 'westbound'
              : side
                ? String(side).replace(/Bound$/, 'bound')
                : null;

    out.push({
      site_id: String(siteId),
      site_name: siteName || null,
      direction: direction || null,
    });
  }
  return out;
}

/**
 * Extract traffic status site records from MeasurementSiteTablePublication (TrafficStatusSites).
 * Same structure as TravelTimeSites: measurementSiteTable.measurementSiteRecord[] with id,
 * measurementSiteName.values, measurementSide.
 */
function extractTrafficStatusSites(parsed) {
  const out = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.['soapenv:Envelope'];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.['soapenv:Body'];
  const model = body?.['d2LogicalModel'] ?? body?.['D2LogicalModel'];
  if (!model) return out;

  const payload = findIn(model, 'payloadPublication', 'measurementSiteTablePublication');
  const pub = payload?.measurementSiteTablePublication ?? payload?.MeasurementSiteTablePublication ?? payload;
  if (!pub) return out;

  const table = pub.measurementSiteTable ?? pub.MeasurementSiteTable ?? findIn(pub, 'measurementSiteTable');
  if (!table) return out;

  let records = table.measurementSiteRecord ?? table.MeasurementSiteRecord;
  if (!records) return out;
  if (!Array.isArray(records)) records = [records];

  for (const rec of records) {
    const siteId = rec['@_id'] ?? rec.id;
    if (!siteId) continue;

    const nameObj = rec.measurementSiteName ?? rec.MeasurementSiteName;
    const siteName = nameObj?.values ? firstValueFromValues(nameObj.values) : undefined;

    const side = rec.measurementSide ?? rec.MeasurementSide;
    const direction =
      side === 'northBound' || side === 'northbound'
        ? 'northbound'
        : side === 'southBound' || side === 'southbound'
          ? 'southbound'
          : side === 'eastBound' || side === 'eastbound'
            ? 'eastbound'
            : side === 'westBound' || side === 'westbound'
              ? 'westbound'
              : side
                ? String(side).replace(/Bound$/, 'bound')
                : null;

    out.push({
      site_id: String(siteId),
      site_name: siteName || null,
      direction: direction || null,
    });
  }
  return out;
}

/**
 * Extract traffic status measurements from MeasuredDataPublication (TrafficStatusData).
 * Same siteMeasurements structure as TravelTimeData but basicData xsi:type="TrafficStatus"
 * with trafficStatus.trafficStatusValue (freeFlow, congested, unknown, etc.).
 */
function extractTrafficStatusMeasurements(parsed) {
  const out = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.['soapenv:Envelope'];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.['soapenv:Body'];
  const model = body?.['d2LogicalModel'] ?? body?.['D2LogicalModel'];
  if (!model) return out;

  const payload = findIn(model, 'payloadPublication', 'measuredDataPublication');
  const pub = payload?.measuredDataPublication ?? payload?.MeasuredDataPublication ?? payload;
  if (!pub) return out;

  let siteMeasurements = pub.siteMeasurements ?? pub.SiteMeasurements;
  if (!siteMeasurements) return out;
  if (!Array.isArray(siteMeasurements)) siteMeasurements = [siteMeasurements];

  for (const sm of siteMeasurements) {
    const ref = sm.measurementSiteReference ?? sm.MeasurementSiteReference;
    const siteId = ref?.['@_id'] ?? ref?.id ?? sm['@_id'];
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
    const value = trafficStatus?.trafficStatusValue ?? trafficStatus?.TrafficStatusValue ?? trafficStatus?.['#text'];

    out.push({
      site_id: String(siteId),
      measured_at: String(measuredAt).trim(),
      traffic_status_value: value != null ? String(value).trim() || null : null,
    });
  }
  return out;
}

/** Collect all line text from VMS vmsText / vmsTextLine (nested). */
function collectVmsTextLines(obj, lines = []) {
  if (obj == null) return lines;
  if (typeof obj === 'string') {
    const t = obj.trim();
    if (t) lines.push(t);
    return lines;
  }
  if (obj['#text']) {
    const t = String(obj['#text']).trim();
    if (t) lines.push(t);
    return lines;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) collectVmsTextLines(item, lines);
    return lines;
  }
  if (typeof obj === 'object') {
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
    for (const v of Object.values(obj)) collectVmsTextLines(v, lines);
  }
  return lines;
}

/**
 * Extract VMS (variable message sign) units from VmsPublication.
 * vmsUnit[]: vmsUnitReference @_id, vms.vmsWorking, vmsMessage.timeLastSet, textPage.vmsText.vmsTextLine, textDisplayAreaSettings.textLanternsOn.
 */
function extractVms(parsed) {
  const out = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.['soapenv:Envelope'];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.['soapenv:Body'];
  const model = body?.['d2LogicalModel'] ?? body?.['D2LogicalModel'];
  if (!model) return out;

  const payload = findIn(model, 'payloadPublication', 'vmsPublication');
  const pub = payload?.vmsPublication ?? payload?.VmsPublication ?? payload;
  if (!pub) return out;

  let units = pub.vmsUnit ?? pub.VmsUnit;
  if (!units) return out;
  if (!Array.isArray(units)) units = [units];

  for (const unit of units) {
    const ref = unit.vmsUnitReference ?? unit.VmsUnitReference;
    const vmsId = ref?.['@_id'] ?? unit['@_id'];
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
    const working = vmsWorking === true || vmsWorking === 'true';

    let msg = inner.vmsMessage ?? inner.VmsMessage;
    if (Array.isArray(msg)) msg = msg[0];
    const msgInner = msg?.vmsMessage ?? msg?.VmsMessage;
    const msgObj = Array.isArray(msgInner) ? msgInner[0] : msgInner;
    const timeLastSet = msgObj?.timeLastSet ?? msgObj?.TimeLastSet ?? null;
    const textPage = msgObj?.textPage ?? msgObj?.TextPage;
    const textPageArr = Array.isArray(textPage) ? textPage : textPage ? [textPage] : [];
    const lines = [];
    for (const page of textPageArr) {
      collectVmsTextLines(page?.vmsText ?? page?.VmsText ?? page, lines);
    }
    const messageText = lines.length ? lines.join(' ').trim() || null : null;

    const settings = inner.textDisplayAreaSettings ?? inner.TextDisplayAreaSettings;
    const settingsArr = Array.isArray(settings) ? settings : settings ? [settings] : [];
    const firstSettings = settingsArr[0];
    const lanterns = firstSettings?.textLanternsOn ?? firstSettings?.TextLanternsOn;
    const textLanternsOn = lanterns === true || lanterns === 'true';

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

/** Get display name from TPEG point with name[] (linkName, nonLinkedPointName). Prefer nonLinkedPointName. */
function getPointDisplayName(point) {
  if (!point || typeof point !== 'object') return undefined;
  let names = point.name ?? point.otherName ?? point.othername;
  if (!Array.isArray(names)) names = names ? [names] : [];
  const preferNonLinked = names.find(
    (n) => n?.descriptor?.values && (n.tpegOtherPointDescriptorType === 'nonLinkedPointName' || n['tpegOtherPointDescriptorType'] === 'nonLinkedPointName')
  );
  const entry = preferNonLinked ?? names.find((n) => n?.descriptor?.values) ?? names[0];
  return entry?.descriptor?.values ? firstValueFromValues(entry.descriptor.values) : undefined;
}

/**
 * Extract VMS unit locations from VmsTablePublication (VMSTable).
 * vmsUnitTable.vmsUnitRecord[]: id, vmsRecord.vmsRecord.vmsLocation (Point) → tpegPointLocation
 * with framedPoint (coordinates, name), tpegDirection.
 */
function extractVmsTable(parsed) {
  const out = [];
  const envelope = parsed?.Envelope ?? parsed?.envelope ?? parsed?.['soapenv:Envelope'];
  const body = envelope?.Body ?? envelope?.body ?? envelope?.['soapenv:Body'];
  const model = body?.['d2LogicalModel'] ?? body?.['D2LogicalModel'];
  if (!model) return out;

  const payload = findIn(model, 'payloadPublication', 'vmsTablePublication');
  const pub = payload?.vmsTablePublication ?? payload?.VmsTablePublication ?? payload;
  if (!pub) return out;

  const table = pub.vmsUnitTable ?? pub.VmsUnitTable ?? findIn(pub, 'vmsUnitTable');
  if (!table) return out;

  let records = table.vmsUnitRecord ?? table.VmsUnitRecord;
  if (!records) return out;
  if (!Array.isArray(records)) records = [records];

  for (const rec of records) {
    const vmsId = rec['@_id'] ?? rec.id;
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
      directionRaw === 'northBound' || directionRaw === 'northbound'
        ? 'northbound'
        : directionRaw === 'southBound' || directionRaw === 'southbound'
          ? 'southbound'
          : directionRaw === 'eastBound' || directionRaw === 'eastbound'
            ? 'eastbound'
            : directionRaw === 'westBound' || directionRaw === 'westbound'
              ? 'westbound'
              : directionRaw
                ? String(directionRaw).replace(/Bound$/, 'bound')
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

function situationTypeLabel(path) {
  if (path.includes('Unplanned')) return 'Unplanned event';
  if (path.includes('CurrentRoadworks')) return 'Current roadworks';
  if (path.includes('FutureRoadworks')) return 'Planned roadworks';
  return path;
}

async function run() {
  const clientId = getEnv('TRAFFIC_SCOTLAND_CLIENT_ID');
  const clientKey = getEnv('TRAFFIC_SCOTLAND_CLIENT_KEY');
  const supabaseUrl = getEnv('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  const allSituations = [];
  const allTravelTimes = [];
  const allTravelTimeSites = [];
  const allTrafficStatus = [];
  const allTrafficStatusSites = [];
  const allVms = [];
  const allVmsTable = [];
  for (const pub of PUBLICATIONS) {
    const url = `${BASE_URL}${pub.path}`;
    console.log(`Fetching ${pub.path}...`);
    try {
      const xml = await fetchXml(url, clientId, clientKey);
      const parsed = parser.parse(xml);
      if (pub.kind === 'travel_time') {
        const rows = extractTravelTimeMeasurements(parsed);
        console.log(`  ${rows.length} travel time measurement(s)`);
        allTravelTimes.push(...rows);
      } else if (pub.kind === 'travel_time_sites') {
        const rows = extractTravelTimeSites(parsed);
        console.log(`  ${rows.length} travel time site(s)`);
        allTravelTimeSites.push(...rows);
      } else if (pub.kind === 'traffic_status') {
        const rows = extractTrafficStatusMeasurements(parsed);
        console.log(`  ${rows.length} traffic status measurement(s)`);
        allTrafficStatus.push(...rows);
      } else if (pub.kind === 'traffic_status_sites') {
        const rows = extractTrafficStatusSites(parsed);
        console.log(`  ${rows.length} traffic status site(s)`);
        allTrafficStatusSites.push(...rows);
      } else if (pub.kind === 'vms') {
        const rows = extractVms(parsed);
        console.log(`  ${rows.length} VMS unit(s)`);
        allVms.push(...rows);
      } else if (pub.kind === 'vms_table') {
        const rows = extractVmsTable(parsed);
        console.log(`  ${rows.length} VMS table record(s)`);
        allVmsTable.push(...rows);
      } else {
        const situations = extractSituations(
          parsed,
          pub.path.replace('/Content.xml', '').replace('publications/', ''),
          pub.type
        );
        console.log(`  ${situations.length} situation(s)`);
        allSituations.push(...situations);
      }
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);

  if (allSituations.length > 0) {
    console.log(`Upserting ${allSituations.length} situation(s) to traffic_situations...`);
    const { error } = await supabase.from('traffic_situations').upsert(
      allSituations.map((row) => ({ ...row, updated_at: new Date().toISOString() })),
      { onConflict: 'external_id,source_publication' }
    );
    if (error) console.error('traffic_situations upsert error:', error.message);
  }

  if (allTravelTimes.length > 0) {
    console.log(`Upserting ${allTravelTimes.length} travel time(s) to traffic_travel_times...`);
    const { error } = await supabase.from('traffic_travel_times').upsert(
      allTravelTimes.map((row) => ({ ...row, updated_at: new Date().toISOString() })),
      { onConflict: 'site_id,measured_at' }
    );
    if (error) console.error('traffic_travel_times upsert error:', error.message);
  }

  if (allTravelTimeSites.length > 0) {
    console.log(`Upserting ${allTravelTimeSites.length} travel time site(s) to traffic_travel_time_sites...`);
    const { error } = await supabase.from('traffic_travel_time_sites').upsert(
      allTravelTimeSites.map((row) => ({ ...row, updated_at: new Date().toISOString() })),
      { onConflict: 'site_id' }
    );
    if (error) console.error('traffic_travel_time_sites upsert error:', error.message);
  }

  if (allTrafficStatus.length > 0) {
    console.log(`Upserting ${allTrafficStatus.length} traffic status row(s) to traffic_traffic_status...`);
    const { error } = await supabase.from('traffic_traffic_status').upsert(
      allTrafficStatus.map((row) => ({ ...row, updated_at: new Date().toISOString() })),
      { onConflict: 'site_id,measured_at' }
    );
    if (error) console.error('traffic_traffic_status upsert error:', error.message);
  }

  if (allTrafficStatusSites.length > 0) {
    console.log(`Upserting ${allTrafficStatusSites.length} traffic status site(s) to traffic_traffic_status_sites...`);
    const { error } = await supabase.from('traffic_traffic_status_sites').upsert(
      allTrafficStatusSites.map((row) => ({ ...row, updated_at: new Date().toISOString() })),
      { onConflict: 'site_id' }
    );
    if (error) console.error('traffic_traffic_status_sites upsert error:', error.message);
  }

  if (allVms.length > 0) {
    console.log(`Upserting ${allVms.length} VMS unit(s) to traffic_vms...`);
    const { error } = await supabase.from('traffic_vms').upsert(
      allVms.map((row) => ({ ...row, updated_at: new Date().toISOString() })),
      { onConflict: 'vms_id' }
    );
    if (error) console.error('traffic_vms upsert error:', error.message);
  }

  if (allVmsTable.length > 0) {
    console.log(`Upserting ${allVmsTable.length} VMS table record(s) to traffic_vms_table...`);
    const { error } = await supabase.from('traffic_vms_table').upsert(
      allVmsTable.map((row) => ({ ...row, updated_at: new Date().toISOString() })),
      { onConflict: 'vms_id' }
    );
    if (error) console.error('traffic_vms_table upsert error:', error.message);
  }

  if (allSituations.length === 0 && allTravelTimes.length === 0 && allTravelTimeSites.length === 0 && allTrafficStatus.length === 0 && allTrafficStatusSites.length === 0 && allVms.length === 0 && allVmsTable.length === 0) {
    console.log('No data to upsert.');
  }
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

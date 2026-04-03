/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
/**
 * CMS image upload (admin-only).
 *
 * Multipart only: fields postId, mimeType (optional), file (binary).
 * Validates JWT + members.is_admin before reading the upload body.
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Deploy with verify_jwt disabled (supabase/config.toml): platform JWT gate conflicts
 * with RN FormData; auth is enforced here.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function safeExt(mimeType: string): string {
  const m = (mimeType || "").toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  return "jpg";
}

async function requireAdminUser(
  admin: ReturnType<typeof createClient>,
  jwt: string,
): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: "invalid token" };
  }
  const userId = userData.user.id;

  const { data: memberRow, error: memberErr } = await admin
    .from("members")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (memberErr) {
    return { ok: false, status: 500, error: `member lookup failed: ${memberErr.message}` };
  }
  if (!memberRow?.is_admin) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return { ok: true, userId };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(500, { ok: false, error: "missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!jwt) return json(401, { ok: false, error: "missing bearer token" });

  const admin = createClient(supabaseUrl, serviceKey);

  const gate = await requireAdminUser(admin, jwt);
  if (!gate.ok) {
    return json(gate.status, { ok: false, error: gate.error });
  }

  const ct = req.headers.get("Content-Type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return json(400, { ok: false, error: "expected multipart/form-data" });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json(400, { ok: false, error: "invalid multipart body" });
  }

  const postId = String(form.get("postId") ?? "").trim();
  const mimeType = String(form.get("mimeType") ?? "").trim() || "image/jpeg";
  const file = form.get("file");
  if (!postId || file == null) {
    return json(400, { ok: false, error: "missing postId or file" });
  }
  if (typeof file === "string") {
    return json(400, { ok: false, error: "file must be binary" });
  }

  const ab = await (file as Blob).arrayBuffer();
  const bytes = new Uint8Array(ab);

  const ext = safeExt(mimeType);
  const objectPath = `news/${postId}/${Date.now()}.${ext}`;

  const { error: upErr } = await admin.storage.from("cms-images").upload(objectPath, bytes, {
    upsert: true,
    contentType: mimeType,
    cacheControl: "3600",
  });
  if (upErr) return json(400, { ok: false, error: `upload failed: ${upErr.message}` });

  const { data: pub } = admin.storage.from("cms-images").getPublicUrl(objectPath);
  const publicUrl = pub?.publicUrl ?? null;
  if (!publicUrl) return json(500, { ok: false, error: "failed to generate public url" });

  return json(200, { ok: true, publicUrl, objectPath });
});

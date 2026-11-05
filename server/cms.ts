import seedContent from "../data/seed-content.json";
import { InputError, MAX_CONTENT_BYTES, MAX_UPLOAD_BYTES, MAX_AUDIO_UPLOAD_BYTES, MIME_TYPES, normalizeSubscriber, normalizeUploadMime, validateContent, validateUpload } from "./validation.mjs";

type CmsEnv = Pick<Cloudflare.Env, "DB" | "BUCKET" | "ADMIN_PASSWORD_HASH">;
type AdminSession = {userId: "password:root"; token: string; tokenHash: string; expiresAt: number};
type ContentRow = {content_json: string; revision: number; updated_at: string};
const encoder = new TextEncoder();
const sessionTtl = 4 * 60 * 60;
const audioChunkBytes = 8 * 1024 * 1024;
const multipartTtl = 2 * 60 * 60;
type MultipartHandle = {version: 1; key: string; uploadId: string; marker: string; mimeType: string; name: string; size: number; chunkSize: number; partCount: number; expiresAt: number; ownerTokenHash: string};
const adminOrigins = new Set(["https://kirinsounds.art", "https://www.kirinsounds.art"]);
const publicPortfolioOrigins = new Set([
  "https://hliu13-jms.github.io",
  "https://kirinsounds.art",
  "https://www.kirinsounds.art",
]);

function json(value: unknown, status = 200, extra: HeadersInit = {}) {
  const headers = new Headers(extra);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(value), {status, headers});
}
function db(env: CmsEnv): D1Database {
  if (!env.DB) throw new InputError("STORAGE_UNAVAILABLE", "Content storage is not configured.", 503);
  return env.DB;
}
function sameOrigin(request: Request) {
  if (request.headers.get("Origin") !== new URL(request.url).origin || request.headers.get("Sec-Fetch-Site") === "cross-site") {
    throw new InputError("ORIGIN_REJECTED", "This request must come from the portfolio website.", 403);
  }
}
function publicSubscribeOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (origin === new URL(request.url).origin) { sameOrigin(request); return; }
  if (!origin || !publicPortfolioOrigins.has(origin)) {
    throw new InputError("ORIGIN_REJECTED", "This subscription must come from the portfolio website.", 403);
  }
}
function publicCors(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  const vary = headers.get("Vary");
  headers.set("Vary", vary ? `${vary}, Origin` : "Origin");
  // The public bridge never shares administrator credentials or sets cookies.
  headers.delete("Access-Control-Allow-Credentials");
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Set-Cookie");
  const origin = request.headers.get("Origin");
  if (origin && publicPortfolioOrigins.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}
function publicPreflight(request: Request, pathname: string) {
  const origin = request.headers.get("Origin");
  const method = pathname === "/api/content" ? "GET" : "POST";
  const requestedHeaders = (request.headers.get("Access-Control-Request-Headers") || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!origin || !publicPortfolioOrigins.has(origin) || request.headers.get("Access-Control-Request-Method") !== method || requestedHeaders.some(value => value !== "content-type")) {
    throw new InputError("CORS_REJECTED", "This cross-origin request is not allowed.", 403);
  }
  return new Response(null, {status: 204, headers: {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": method,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
    "Cache-Control": "no-store",
  }});
}
async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}
function passwordRecord(env: CmsEnv) {
  return /^pbkdf2-sha256\$100000\$([a-f0-9]{64})\$([a-f0-9]{64})$/.exec(env.ADMIN_PASSWORD_HASH || "");
}
function equalSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function adminOrigin(request: Request, write = false) {
  const origin = request.headers.get("Origin"), ownOrigin = new URL(request.url).origin;
  if (origin && adminOrigins.has(origin)) return;
  if (origin === ownOrigin && request.headers.get("Sec-Fetch-Site") !== "cross-site") return;
  if (!write && !origin && request.headers.get("Sec-Fetch-Site") === "same-origin") return;
  throw new InputError("ORIGIN_REJECTED", "Open the administration page on kirinsounds.art.", 403);
}
function adminCors(request: Request, response: Response) {
  const headers = new Headers(response.headers), origin = request.headers.get("Origin");
  headers.delete("Set-Cookie"); headers.delete("Access-Control-Allow-Credentials"); headers.delete("Access-Control-Allow-Origin");
  const vary = headers.get("Vary");
  headers.set("Vary", vary ? `${vary}, Origin` : "Origin");
  if (origin && (adminOrigins.has(origin) || origin === new URL(request.url).origin)) headers.set("Access-Control-Allow-Origin", origin);
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}
function adminMethod(path: string) {
  if (path === "/api/auth/status" || path === "/api/admin/subscribers" || path === "/api/admin/subscribers.csv") return "GET";
  if (path === "/api/auth/login" || path === "/api/auth/logout" || path === "/api/admin/upload") return "POST";
  if (["/api/admin/upload/multipart", "/api/admin/upload/multipart/complete", "/api/admin/upload/multipart/abort"].includes(path)) return "POST";
  if (path === "/api/admin/upload/multipart/part") return "PUT";
  if (path === "/api/admin/content") return "PUT";
  if (/^\/api\/admin\/subscribers\/[a-f0-9-]{36}$/.test(path)) return "DELETE";
  return null;
}
function adminPreflight(request: Request, path: string) {
  adminOrigin(request, true);
  const allowed = new Set(["authorization", "content-type", "x-csrf-token", "x-filename", "x-upload-token", "x-part-number"]);
  const requested = (request.headers.get("Access-Control-Request-Headers") || "").split(",").map(h => h.trim().toLowerCase()).filter(Boolean);
  const method = adminMethod(path);
  if (!method || request.headers.get("Access-Control-Request-Method") !== method || requested.some(h => !allowed.has(h))) {
    throw new InputError("CORS_REJECTED", "This administration request is not allowed.", 403);
  }
  return new Response(null, {status: 204, headers: {"Access-Control-Allow-Origin": request.headers.get("Origin")!, "Access-Control-Allow-Methods": method, "Access-Control-Allow-Headers": "Authorization, Content-Type, X-CSRF-Token, X-Filename, X-Upload-Token, X-Part-Number", "Access-Control-Max-Age": "600", "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers", "Cache-Control": "no-store"}});
}
async function session(request: Request, env: CmsEnv): Promise<AdminSession | null> {
  // This CMS deliberately does not use platform identities or ambient cookies.
  // A password secret must be configured privately before any access is possible.
  if (!passwordRecord(env)) return null;
  const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get("Authorization") || "")?.[1];
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await db(env).prepare("SELECT expires_at FROM admin_sessions WHERE token_hash = ? AND credential_hash = ? AND expires_at > ?")
    .bind(tokenHash, await sha256(env.ADMIN_PASSWORD_HASH!), Math.floor(Date.now() / 1000)).first<{expires_at: number}>();
  return row ? {userId: "password:root", token, tokenHash, expiresAt: row.expires_at * 1000} : null;
}
async function admin(request: Request, env: CmsEnv) {
  adminOrigin(request);
  const user = await session(request, env);
  if (!user) throw new InputError("ADMIN_REQUIRED", "Unlock the administration page with your password.", 401);
  return user;
}
async function authenticatedWrite(request: Request, env: CmsEnv) {
  adminOrigin(request, true);
  const user = await admin(request, env);
  if (!equalSecret(request.headers.get("X-CSRF-Token") || "", user.token)) throw new InputError("CSRF_REJECTED", "Your admin session expired. Unlock the page again.", 403);
  return user;
}
async function loginLimit(request: Request, env: CmsEnv) {
  const database = db(env), now = Math.floor(Date.now() / 1000);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipKey = "login:ip:" + await sha256(env.ADMIN_PASSWORD_HASH! + "\0" + ip);
  // Reserve an attempt before expensive work so concurrent failures cannot
  // bypass the limit. A successful unlock clears only this credential/IP key.
  // Credential rotation gets a fresh failure window; global cost stays capped.
  for (const [key, seconds, maximum] of [[ipKey, 900, 5], ["login:global", 60, 100]] as const) {
    const row = await database.prepare("INSERT INTO request_limits (key, window_start, count) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start > ? THEN count + 1 ELSE 1 END, window_start = CASE WHEN window_start > ? THEN window_start ELSE excluded.window_start END RETURNING count")
      .bind(key, now, now - seconds, now - seconds).first<{count: number}>();
    if ((row?.count || 0) > maximum) throw new InputError("LOGIN_RATE_LIMIT", "Too many unlock attempts. Try again in 15 minutes.", 429);
  }
  await database.prepare("DELETE FROM request_limits WHERE window_start < ?").bind(now - 86400).run();
  return ipKey;
}
async function login(request: Request, env: CmsEnv) {
  adminOrigin(request, true);
  const record = passwordRecord(env);
  if (!record) throw new InputError("ADMIN_NOT_CONFIGURED", "The administration password has not been configured.", 503);
  const ipKey = await loginLimit(request, env);
  const body = await readJson(request, 4096);
  const password = typeof body?.password === "string" && body.password.length <= 1024 ? body.password : "";
  const salt = Uint8Array.from(record[1].match(/../g)!, value => parseInt(value, 16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000}, key, 256);
  const actual = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
  if (!equalSecret(actual, record[2]) || body?.username !== "root" || !password) throw new InputError("INVALID_CREDENTIALS", "The password is incorrect.", 401);
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
  const database = db(env), now = Math.floor(Date.now() / 1000), expiresAt = now + sessionTtl;
  await database.batch([
    database.prepare("DELETE FROM request_limits WHERE key = ?").bind(ipKey),
    database.prepare("DELETE FROM admin_sessions WHERE expires_at <= ? OR credential_hash != ?").bind(now, await sha256(env.ADMIN_PASSWORD_HASH!)),
    database.prepare("INSERT INTO admin_sessions (token_hash, credential_hash, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), await sha256(env.ADMIN_PASSWORD_HASH!), expiresAt),
  ]);
  return json({ok: true, mode: "password", authenticated: true, sessionToken: token, csrfToken: token, expiresAt: expiresAt * 1000});
}
async function readBytes(request: Request, maximum: number) {
  const declared = request.headers.get("Content-Length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximum)) throw new InputError("BODY_TOO_LARGE", "The request exceeds the size limit.", 413);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.byteLength;
    if (length > maximum) { await reader.cancel(); throw new InputError("BODY_TOO_LARGE", "The request exceeds the size limit.", 413); }
    chunks.push(part.value);
  }
  const output = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}
async function readJson(request: Request, maximum = MAX_CONTENT_BYTES) {
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new InputError("JSON_REQUIRED", "Send this request as JSON.", 415);
  try { return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(await readBytes(request, maximum))); }
  catch (error) { if (error instanceof InputError) throw error; throw new InputError("INVALID_JSON", "The request contains invalid JSON."); }
}
async function contentRow(env: CmsEnv): Promise<ContentRow> {
  const database = db(env);
  let row = await database.prepare("SELECT content_json, revision, updated_at FROM portfolio_content WHERE id = 'portfolio'").first<ContentRow>();
  if (!row) {
    // Application seed data is inserted once, never schema DDL or an overwrite.
    const seed = validateContent(seedContent), updatedAt = new Date().toISOString();
    await database.prepare("INSERT INTO portfolio_content (id, content_json, revision, updated_at, updated_by) VALUES ('portfolio', ?, 1, ?, NULL) ON CONFLICT(id) DO NOTHING")
      .bind(JSON.stringify(seed), updatedAt).run();
    row = await database.prepare("SELECT content_json, revision, updated_at FROM portfolio_content WHERE id = 'portfolio'").first<ContentRow>();
  }
  if (!row) throw new InputError("STORAGE_UNAVAILABLE", "Content could not be loaded.", 503);
  return row;
}
async function subscribe(request: Request, env: CmsEnv) {
  publicSubscribeOrigin(request);
  const subscriber = normalizeSubscriber(await readJson(request, 8192));
  if ("honeypot" in subscriber) return json({ok: true});
  const database = db(env), now = Math.floor(Date.now() / 1000), windowStart = now - (now % 3600);
  const address = request.headers.get("CF-Connecting-IP") || "unknown", key = "subscribe:" + await sha256(address);
  const limit = await database.prepare("INSERT INTO request_limits (key, window_start, count) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END, window_start = excluded.window_start RETURNING count")
    .bind(key, windowStart).first<{count: number}>();
  if ((limit?.count || 0) > 20) throw new InputError("RATE_LIMITED", "Please try again later.", 429);
  await database.prepare("DELETE FROM request_limits WHERE window_start < ?").bind(windowStart - 86400).run();
  await database.prepare("INSERT INTO subscribers (id, email, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING")
    .bind(crypto.randomUUID(), subscriber.email, subscriber.name, new Date().toISOString()).run();
  return json({ok: true});
}
function csvField(value: string) {
  const safe = /^[\s]*[=+\-@\t\r]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
function validUploadName(name: unknown): name is string {
  return typeof name === "string" && name.length > 0 && name.length <= 255 && !/[\u0000-\u001f\u007f/\\]/.test(name);
}
async function multipartKey(env: CmsEnv) {
  const material = await crypto.subtle.digest("SHA-256", encoder.encode("kirin-audio-multipart-v1\0" + env.ADMIN_PASSWORD_HASH));
  return crypto.subtle.importKey("raw", material, {name: "HMAC", hash: "SHA-256"}, false, ["sign", "verify"]);
}
async function signMultipart(handle: MultipartHandle, env: CmsEnv) {
  const payload = btoa(String.fromCharCode(...encoder.encode(JSON.stringify(handle)))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", await multipartKey(env), encoder.encode(payload)));
  return payload + "." + [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function readMultipart(value: unknown, user: AdminSession, env: CmsEnv): Promise<MultipartHandle> {
  const invalid = () => new InputError("UPLOAD_TOKEN_INVALID", "This upload expired or belongs to a different session. Start the upload again.", 403);
  if (typeof value !== "string" || value.length > 8192) throw invalid();
  const match = /^([A-Za-z0-9_-]+)\.([a-f0-9]{64})$/.exec(value);
  if (!match) throw invalid();
  const signature = Uint8Array.from(match[2].match(/../g)!, v => parseInt(v, 16));
  if (!(await crypto.subtle.verify("HMAC", await multipartKey(env), signature, encoder.encode(match[1])))) throw invalid();
  let handle: MultipartHandle;
  try {
    const base64 = match[1].replaceAll("-", "+").replaceAll("_", "/");
    handle = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0))));
  } catch { throw invalid(); }
  if (!handle || handle.version !== 1 || !validUploadName(handle.name) || typeof handle.mimeType !== "string" || !handle.mimeType.startsWith("audio/") || normalizeUploadMime(handle.mimeType) !== handle.mimeType ||
      !Number.isSafeInteger(handle.size) || handle.size < 1 || handle.size > MAX_AUDIO_UPLOAD_BYTES || handle.chunkSize !== audioChunkBytes || handle.partCount !== Math.ceil(handle.size / audioChunkBytes) ||
      !Number.isSafeInteger(handle.expiresAt) || handle.expiresAt <= Math.floor(Date.now() / 1000) || !equalSecret(handle.ownerTokenHash || "", user.tokenHash) ||
      typeof handle.uploadId !== "string" || handle.uploadId.length < 1 || handle.uploadId.length > 2048 || /[\u0000-\u001f\u007f]/.test(handle.uploadId) ||
      typeof handle.marker !== "string" || !/^[a-f0-9-]{36}$/.test(handle.marker) || typeof handle.key !== "string" ||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.[a-z0-9]{2,5}$/.test(handle.key) || !handle.key.endsWith("." + MIME_TYPES[handle.mimeType as keyof typeof MIME_TYPES])) throw invalid();
  return handle;
}
function multipartResult(handle: MultipartHandle) {
  return json({url: `/uploads/${handle.key}`, mimeType: handle.mimeType, size: handle.size, name: handle.name}, 201);
}
function matchingMultipart(object: R2Object | null, handle: MultipartHandle) {
  return !!object && object.size === handle.size && object.httpMetadata?.contentType === handle.mimeType && object.customMetadata?.multipartMarker === handle.marker && object.customMetadata?.uploadOwner === handle.ownerTokenHash;
}
async function multipartUpload(request: Request, env: CmsEnv, path: string) {
  const user = await authenticatedWrite(request, env);
  if (!env.BUCKET) throw new InputError("STORAGE_UNAVAILABLE", "Media storage is not configured.", 503);
  const bucket = env.BUCKET;
  if (path === "/api/admin/upload/multipart") {
    const body = await readJson(request, 8192), mimeType = normalizeUploadMime(body?.mimeType);
    if (!mimeType.startsWith("audio/")) throw new InputError("AUDIO_REQUIRED", "Large uploads support audio files only.", 415);
    if (!validUploadName(body?.name)) throw new InputError("INVALID_FILENAME", "Use a filename without folders or control characters.");
    if (!Number.isSafeInteger(body.size) || body.size < 1 || body.size > MAX_AUDIO_UPLOAD_BYTES) throw new InputError("UPLOAD_TOO_LARGE", "Audio files must be non-empty and no larger than 1 GiB.", 413);
    const key = `${crypto.randomUUID()}.${MIME_TYPES[mimeType as keyof typeof MIME_TYPES]}`, marker = crypto.randomUUID();
    const upload = await bucket.createMultipartUpload(key, {httpMetadata: {contentType: mimeType}, customMetadata: {originalName: encodeURIComponent(body.name), multipartMarker: marker, uploadOwner: user.tokenHash}});
    const handle: MultipartHandle = {version: 1, key, uploadId: upload.uploadId, marker, mimeType, name: body.name, size: body.size, chunkSize: audioChunkBytes, partCount: Math.ceil(body.size / audioChunkBytes), expiresAt: Math.floor(Date.now() / 1000) + multipartTtl, ownerTokenHash: user.tokenHash};
    return json({uploadToken: await signMultipart(handle, env), chunkSize: handle.chunkSize, partCount: handle.partCount}, 201);
  }
  if (path === "/api/admin/upload/multipart/part") {
    const handle = await readMultipart(request.headers.get("X-Upload-Token"), user, env);
    const partHeader = request.headers.get("X-Part-Number") || "";
    if (!/^[1-9][0-9]{0,2}$/.test(partHeader) || Number(partHeader) > handle.partCount) throw new InputError("INVALID_PART", "This audio part number is invalid.");
    if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/octet-stream") throw new InputError("BINARY_REQUIRED", "Send the audio part as binary data.", 415);
    const partNumber = Number(partHeader), expected = Math.min(audioChunkBytes, handle.size - (partNumber - 1) * audioChunkBytes);
    // One bounded part is buffered, never the full audio file. The reader also
    // rejects chunked/undeclared bodies as soon as they exceed the part size.
    const bytes = await readBytes(request, expected);
    if (bytes.length !== expected) throw new InputError("PART_SIZE_MISMATCH", "The audio part was interrupted or has the wrong size.");
    if (partNumber === 1) validateUpload(handle.mimeType, bytes);
    const part = await bucket.resumeMultipartUpload(handle.key, handle.uploadId).uploadPart(partNumber, bytes);
    return json({partNumber: part.partNumber, etag: part.etag});
  }
  const body = await readJson(request, 32768), handle = await readMultipart(body?.uploadToken, user, env);
  if (path === "/api/admin/upload/multipart/abort") {
    const object = await bucket.head(handle.key);
    // An abort retry after successful completion must never delete published
    // media. Completed objects are identified by this signed upload's marker.
    if (!matchingMultipart(object, handle)) await bucket.resumeMultipartUpload(handle.key, handle.uploadId).abort();
    return json({ok: true});
  }
  if (!Array.isArray(body.parts) || body.parts.length !== handle.partCount || body.parts.some((part: {partNumber?: unknown; etag?: unknown}, i: number) => !part || part.partNumber !== i + 1 || typeof part.etag !== "string" || !part.etag.length || part.etag.length > 256 || /[\u0000-\u001f\u007f]/.test(part.etag))) {
    throw new InputError("PARTS_INCOMPLETE", "Upload every audio part before completing the file.");
  }
  const parts = body.parts.map((part: R2UploadedPart) => ({partNumber: part.partNumber, etag: part.etag}));
  // Retrying a completion after a lost response returns the same media path.
  if (matchingMultipart(await bucket.head(handle.key), handle)) return multipartResult(handle);
  try { await bucket.resumeMultipartUpload(handle.key, handle.uploadId).complete(parts); }
  catch (error) {
    if (matchingMultipart(await bucket.head(handle.key), handle)) return multipartResult(handle);
    throw error;
  }
  // A completion response may omit the metadata supplied at initiation. Read
  // the authoritative stored object before validating or removing any media.
  const object = await bucket.head(handle.key);
  if (!object || !object.httpMetadata?.contentType || !object.customMetadata?.multipartMarker || !object.customMetadata?.uploadOwner) {
    throw new InputError("UPLOAD_VERIFICATION_PENDING", "The audio is stored but could not yet be verified. Please retry completing the upload.", 503);
  }
  if (!matchingMultipart(object, handle)) {
    // Only clean up a verified object belonging to this exact upload/session.
    // Missing metadata alone must never cause a valid completed file to vanish.
    if (object.customMetadata.multipartMarker === handle.marker && object.customMetadata.uploadOwner === handle.ownerTokenHash) await bucket.delete(handle.key);
    throw new InputError("UPLOAD_SIZE_MISMATCH", "The audio upload did not finish correctly. Please upload it again.");
  }
  return multipartResult(handle);
}
async function upload(request: Request, env: CmsEnv) {
  await authenticatedWrite(request, env);
  if (!env.BUCKET) throw new InputError("STORAGE_UNAVAILABLE", "Media storage is not configured.", 503);
  const mimeType = normalizeUploadMime(request.headers.get("Content-Type"));
  let name = "upload";
  try { name = decodeURIComponent(request.headers.get("X-Filename") || "upload"); }
  catch { throw new InputError("INVALID_FILENAME", "The filename could not be read."); }
  if (!name || name.length > 255 || /[\u0000-\u001f\u007f/\\]/.test(name)) throw new InputError("INVALID_FILENAME", "Use a filename without folders or control characters.");
  const bytes = await readBytes(request, MAX_UPLOAD_BYTES), media = validateUpload(mimeType, bytes), key = `${crypto.randomUUID()}.${media.extension}`;
  await env.BUCKET.put(key, bytes, {httpMetadata: {contentType: media.mimeType}, customMetadata: {originalName: encodeURIComponent(name)}});
  return json({url: `/uploads/${key}`, mimeType: media.mimeType, size: bytes.byteLength, name}, 201);
}
async function serveUpload(request: Request, env: CmsEnv, pathname: string) {
  if (!env.BUCKET) throw new InputError("STORAGE_UNAVAILABLE", "Media storage is not configured.", 503);
  if (!/^(GET|HEAD)$/.test(request.method)) return json({ok: false, error: {code: "METHOD_NOT_ALLOWED", message: "Use GET or HEAD."}}, 405, {Allow: "GET, HEAD"});
  const key = pathname.slice("/uploads/".length);
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.[a-z0-9]{2,5}$/.test(key)) throw new InputError("NOT_FOUND", "This media file was not found.", 404);
  const object = await env.BUCKET.head(key);
  if (!object) throw new InputError("NOT_FOUND", "This media file was not found.", 404);
  const headers = new Headers({"Content-Type": object.httpMetadata?.contentType || "application/octet-stream", "Content-Length": String(object.size), "ETag": object.httpEtag, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Disposition": `inline; filename="${key}"`});
  if (request.headers.get("If-None-Match") === object.httpEtag) return new Response(null, {status: 304, headers});
  const range = request.headers.get("Range"); let offset = 0, length = object.size, partial = false;
  if (range && (!request.headers.get("If-Range") || request.headers.get("If-Range") === object.httpEtag)) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null, {status: 416, headers: {"Content-Range": `bytes */${object.size}`}});
    if (!match[1]) { offset = Math.max(0, object.size - Number(match[2])); length = object.size - offset; }
    else { offset = Number(match[1]); const end = match[2] ? Math.min(Number(match[2]), object.size - 1) : object.size - 1; length = end - offset + 1; }
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || offset >= object.size || length <= 0) return new Response(null, {status: 416, headers: {"Content-Range": `bytes */${object.size}`}});
    partial = true; headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`); headers.set("Content-Length", String(length));
  }
  if (request.method === "HEAD") return new Response(null, {status: partial ? 206 : 200, headers});
  const body = await env.BUCKET.get(key, partial ? {range: {offset, length}} : undefined);
  if (!body) throw new InputError("NOT_FOUND", "This media file was not found.", 404);
  return new Response(body.body, {status: partial ? 206 : 200, headers});
}

async function handleCmsCore(request: Request, env: CmsEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/") && !path.startsWith("/uploads/")) return null;
  const publicEndpoint = (path === "/api/content" && request.method === "GET") || (path === "/api/subscribe" && request.method === "POST");
  try {
    if (request.method === "OPTIONS" && (path === "/api/content" || path === "/api/subscribe")) return publicPreflight(request, path);
    if (path.startsWith("/api/auth/") || path.startsWith("/api/admin/")) {
      if (request.method === "OPTIONS") return adminPreflight(request, path);
      adminOrigin(request, request.method !== "GET");
    }
    if (path.startsWith("/uploads/")) return await serveUpload(request, env, path);
    if (path === "/api/auth/status" && request.method === "GET") {
      const user = await session(request, env);
      return json({mode: "password", initialized: !!passwordRecord(env), setupAllowed: false, authenticated: !!user, username: user ? "root" : null, csrfToken: user?.token || null, expiresAt: user?.expiresAt || null});
    }
    if (path === "/api/auth/setup" && request.method === "POST") throw new InputError("WEB_SETUP_DISABLED", "The administration password must be configured privately by the site owner.", 403);
    if (path === "/api/auth/login" && request.method === "POST") return await login(request, env);
    if (path === "/api/auth/logout" && request.method === "POST") {
      const user = await authenticatedWrite(request, env);
      await db(env).prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(user.tokenHash).run();
      return json({ok: true});
    }
    if (path === "/api/content" && request.method === "GET") { const row = await contentRow(env); return publicCors(request, json({content: JSON.parse(row.content_json), revision: row.revision, updatedAt: row.updated_at})); }
    if (path === "/api/admin/content" && request.method === "PUT") {
      const user = await authenticatedWrite(request, env), body = await readJson(request);
      if (!body || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 1) throw new InputError("INVALID_REVISION", "Load the current content before saving.");
      const content = validateContent(body.content); await contentRow(env);
      const updatedAt = new Date().toISOString();
      const result = await db(env).prepare("UPDATE portfolio_content SET content_json = ?, revision = revision + 1, updated_at = ?, updated_by = ? WHERE id = 'portfolio' AND revision = ?")
        .bind(JSON.stringify(content), updatedAt, user.userId, body.expectedRevision).run();
      if (result.meta.changes !== 1) throw new InputError("REVISION_CONFLICT", "Content changed in another window. Reload it before saving.", 409);
      return json({ok: true, revision: body.expectedRevision + 1, updatedAt});
    }
    if (path === "/api/admin/upload" && request.method === "POST") return await upload(request, env);
    if ((["/api/admin/upload/multipart", "/api/admin/upload/multipart/complete", "/api/admin/upload/multipart/abort"].includes(path) && request.method === "POST") || (path === "/api/admin/upload/multipart/part" && request.method === "PUT")) return await multipartUpload(request, env, path);
    if (path === "/api/subscribe" && request.method === "POST") return publicCors(request, await subscribe(request, env));
    if ((path === "/api/admin/subscribers" || path === "/api/admin/subscribers.csv") && request.method === "GET") {
      await admin(request, env);
      const result = await db(env).prepare("SELECT id, email, name, created_at AS createdAt FROM subscribers ORDER BY created_at DESC").all<{id: string; email: string; name: string; createdAt: string}>();
      if (path.endsWith(".csv")) {
        const rows = [["id", "email", "name", "createdAt"], ...result.results.map(row => [row.id, row.email, row.name, row.createdAt])];
        return new Response("\uFEFF" + rows.map(row => row.map(csvField).join(",")).join("\r\n") + "\r\n", {headers: {"Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="portfolio-subscribers.csv"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}});
      }
      return json({subscribers: result.results});
    }
    const deletion = /^\/api\/admin\/subscribers\/([a-f0-9-]{36})$/.exec(path);
    if (deletion && request.method === "DELETE") { await authenticatedWrite(request, env); await db(env).prepare("DELETE FROM subscribers WHERE id = ?").bind(deletion[1]).run(); return json({ok: true}); }
    return json({ok: false, error: {code: "NOT_FOUND", message: "This API endpoint was not found."}}, 404);
  } catch (error) {
    if (error instanceof InputError) {
      const response = json({ok: false, error: {code: error.code, message: error.message, ...(error.details ? {details: error.details} : {})}}, error.status, error.status === 429 ? {"Retry-After": error.code === "LOGIN_RATE_LIMIT" ? "900" : "3600"} : {});
      return publicEndpoint ? publicCors(request, response) : response;
    }
    console.error("Portfolio CMS request failed", error instanceof Error ? error.name : "unknown");
    const response = json({ok: false, error: {code: "SERVER_ERROR", message: "The request could not be completed. Please try again."}}, 500);
    return publicEndpoint ? publicCors(request, response) : response;
  }
}

export async function handleCmsRequest(request: Request, env: CmsEnv): Promise<Response | null> {
  const response = await handleCmsCore(request, env);
  const path = new URL(request.url).pathname;
  // Apply the same narrow CORS policy to successes, authentication failures,
  // upload errors and CSV downloads. Cookies are never exposed or required.
  return response && (path.startsWith("/api/auth/") || path.startsWith("/api/admin/")) ? adminCors(request, response) : response;
}

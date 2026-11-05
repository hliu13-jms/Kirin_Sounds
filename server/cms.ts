import seedContent from "../data/seed-content.json";
import { InputError, MAX_CONTENT_BYTES, MAX_UPLOAD_BYTES, normalizeSubscriber, normalizeUploadMime, validateContent, validateUpload } from "./validation.mjs";

type CmsEnv = Pick<Cloudflare.Env, "DB" | "BUCKET" | "ADMIN_EMAIL">;
type Identity = {userId: string; email: string};
type ContentRow = {content_json: string; revision: number; updated_at: string};
const encoder = new TextEncoder();
const csrfTtl = 60 * 60;
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
function identity(request: Request, env: CmsEnv): Identity | null {
  // Trust these only at the Sites dispatch boundary. The maintained Sites dev
  // plugin strips client-supplied identity headers in loopback development.
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  const ownerEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!ownerEmail || !userId || !email || email.trim().toLowerCase() !== ownerEmail) return null;
  return {userId, email: email.trim().toLowerCase()};
}
function admin(request: Request, env: CmsEnv): Identity {
  const user = identity(request, env);
  if (!user) throw new InputError("ADMIN_REQUIRED", "Sign in with the site owner's ChatGPT account.", 401);
  return user;
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
function csrfCookieName(request: Request) {
  return new URL(request.url).protocol === "https:" ? "__Host-kirin-csrf" : "kirin-csrf";
}
function readCookie(request: Request, name: string) {
  const matches = (request.headers.get("Cookie") || "").split(";").map(p => p.trim()).filter(p => p.startsWith(name + "="));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : "";
}
function cookieHeader(request: Request, value: string, maxAge = csrfTtl) {
  return `${csrfCookieName(request)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function validCsrf(database: D1Database, token: string, userId: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const row = await database.prepare("SELECT token_hash FROM admin_csrf WHERE token_hash = ? AND user_id = ? AND expires_at > ?")
    .bind(await sha256(token), userId, Math.floor(Date.now() / 1000)).first();
  return !!row;
}
async function csrfForStatus(request: Request, env: CmsEnv, user: Identity) {
  const database = db(env), previous = readCookie(request, csrfCookieName(request));
  if (await validCsrf(database, previous, user.userId)) return previous;
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
  const now = Math.floor(Date.now() / 1000);
  await database.batch([
    database.prepare("DELETE FROM admin_csrf WHERE expires_at <= ?").bind(now),
    database.prepare("INSERT INTO admin_csrf (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), user.userId, now + csrfTtl),
  ]);
  return token;
}
async function authenticatedWrite(request: Request, env: CmsEnv) {
  sameOrigin(request);
  const user = admin(request, env), token = request.headers.get("X-CSRF-Token") || "";
  if (token !== readCookie(request, csrfCookieName(request)) || !(await validCsrf(db(env), token, user.userId))) {
    throw new InputError("CSRF_REJECTED", "Your admin session expired. Reopen the admin panel.", 403);
  }
  return user;
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

export async function handleCmsRequest(request: Request, env: CmsEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/") && !path.startsWith("/uploads/")) return null;
  const publicEndpoint = (path === "/api/content" && request.method === "GET") || (path === "/api/subscribe" && request.method === "POST");
  try {
    if (request.method === "OPTIONS" && (path === "/api/content" || path === "/api/subscribe")) return publicPreflight(request, path);
    const origin = request.headers.get("Origin");
    if (((origin && origin !== new URL(request.url).origin) || request.headers.get("Sec-Fetch-Site") === "cross-site") && (path.startsWith("/api/auth/") || path.startsWith("/api/admin/"))) {
      throw new InputError("ORIGIN_REJECTED", "Open the admin panel on its own website to manage content.", 403);
    }
    if (path.startsWith("/uploads/")) return await serveUpload(request, env, path);
    if (path === "/api/auth/status" && request.method === "GET") {
      const user = identity(request, env), csrfToken = user ? await csrfForStatus(request, env, user) : null;
      return json({mode: "hosted", initialized: !!env.ADMIN_EMAIL, authenticated: !!user, username: user ? "root" : null, csrfToken, loginUrl: "/signin-with-chatgpt?return_to=/", logoutUrl: "/signout-with-chatgpt?return_to=/"}, 200, csrfToken ? {"Set-Cookie": cookieHeader(request, csrfToken)} : {});
    }
    if ((path === "/api/auth/setup" || path === "/api/auth/login") && request.method === "POST") { sameOrigin(request); throw new InputError("HOSTED_AUTH_ONLY", "Use Sign in with ChatGPT to manage the hosted website.", 405); }
    if (path === "/api/auth/logout" && request.method === "POST") {
      const user = await authenticatedWrite(request, env);
      await db(env).prepare("DELETE FROM admin_csrf WHERE token_hash = ? AND user_id = ?").bind(await sha256(request.headers.get("X-CSRF-Token")!), user.userId).run();
      return json({ok: true, logoutUrl: "/signout-with-chatgpt?return_to=/"}, 200, {"Set-Cookie": cookieHeader(request, "", 0)});
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
    if (path === "/api/subscribe" && request.method === "POST") return publicCors(request, await subscribe(request, env));
    if ((path === "/api/admin/subscribers" || path === "/api/admin/subscribers.csv") && request.method === "GET") {
      admin(request, env);
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
      const response = json({ok: false, error: {code: error.code, message: error.message, ...(error.details ? {details: error.details} : {})}}, error.status);
      return publicEndpoint ? publicCors(request, response) : response;
    }
    console.error("Portfolio CMS request failed", error instanceof Error ? error.name : "unknown");
    const response = json({ok: false, error: {code: "SERVER_ERROR", message: "The request could not be completed. Please try again."}}, 500);
    return publicEndpoint ? publicCors(request, response) : response;
  }
}

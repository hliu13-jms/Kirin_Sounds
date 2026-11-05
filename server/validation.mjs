export const MAX_CONTENT_BYTES = 2 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export class InputError extends Error {
  constructor(code, message, status = 400, details) {
    super(message);
    this.name = 'InputError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const fail = (message, field) => { throw new InputError('INVALID_CONTENT', message, 400, field ? {field} : undefined); };
const object = (value, field) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${field} must be an object.`, field);
  return value;
};
const keys = (value, allowed, field) => {
  object(value, field);
  const unknown = Object.keys(value).find(key => !allowed.includes(key));
  if (unknown) fail(`${field}.${unknown} is not a supported field.`, `${field}.${unknown}`);
};
function text(value, field, max = 12000, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) fail(`${field} must be text of at most ${max} characters.`, field);
  if (required && !value.trim()) fail(`${field} cannot be empty.`, field);
  return value;
}
function localized(value, field) {
  keys(value, ['en','zh','ja'], field);
  return {en:text(value.en, `${field}.en`), zh:text(value.zh, `${field}.zh`), ja:text(value.ja, `${field}.ja`)};
}
function identifier(value, field) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value)) fail(`${field} must use 1–80 letters, numbers, hyphens or underscores.`, field);
  return value;
}
function assetUrl(value, field, optional = false) {
  value = text(value, field, 2048, !optional);
  if (!value && optional) return '';
  if (value.includes('\\') || /[\u0000-\u0020\u007f]/.test(value)) fail(`${field} contains an invalid URL.`, field);
  if (value.startsWith('https://')) {
    try { const u = new URL(value); if (u.protocol !== 'https:' || u.username || u.password) throw new Error(); }
    catch { fail(`${field} must be a valid HTTPS media URL.`, field); }
    return value;
  }
  const relative = value.replace(/^\//, '');
  if (!/^(?:assets|uploads)\//.test(relative)) fail(`${field} must point to assets/, /uploads/, or an HTTPS URL.`, field);
  let decoded;
  try { decoded = decodeURIComponent(relative); } catch { fail(`${field} contains invalid URL encoding.`, field); }
  if (decoded.split('/').some(part => part === '..') || decoded.includes('\\') || decoded.includes('\0')) fail(`${field} cannot contain a parent-directory path.`, field);
  return value;
}
function url(value, field) {
  value = text(value, field, 2048);
  if (!value) return '';
  try { const u = new URL(value); if (u.protocol !== 'https:' || u.username || u.password) throw new Error(); }
  catch { fail(`${field} must be an HTTPS URL.`, field); }
  return value;
}
export function normalizeEmail(value) {
  if (typeof value !== 'string') throw new InputError('INVALID_EMAIL', 'Enter a valid email address.');
  const email = value.trim().toLowerCase();
  const parts = email.split('@');
  const local = parts[0];
  if (email.length > 254 || parts.length !== 2 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}$/i.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..') || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(parts[1])) {
    throw new InputError('INVALID_EMAIL', 'Enter a valid email address.');
  }
  return email;
}

export function validateContent(value) {
  keys(value, ['schemaVersion','profile','projects','audio','photos'], 'content');
  if (value.schemaVersion !== 1) fail('This content version is not supported.', 'schemaVersion');
  let size;
  try { size = new TextEncoder().encode(JSON.stringify(value)).byteLength; } catch { fail('Content must contain valid JSON.'); }
  if (size > MAX_CONTENT_BYTES) throw new InputError('CONTENT_TOO_LARGE', 'Content exceeds the 2 MiB limit.', 413);
  const p = value.profile;
  keys(p, ['name','artistName','intro','about','practice','learning','primaryEmail','secondaryEmail','instagram','fotoUrl'], 'profile');
  const profile = {
    name:text(p.name, 'profile.name', 160, true),
    artistName:text(p.artistName, 'profile.artistName', 160),
    intro:localized(p.intro, 'profile.intro'),
    about:localized(p.about, 'profile.about'),
    practice:localized(p.practice, 'profile.practice'),
    learning:localized(p.learning, 'profile.learning'),
    primaryEmail:p.primaryEmail ? normalizeEmail(p.primaryEmail) : '',
    secondaryEmail:p.secondaryEmail ? normalizeEmail(p.secondaryEmail) : '',
    instagram:text(p.instagram, 'profile.instagram', 30),
    fotoUrl:url(p.fotoUrl, 'profile.fotoUrl')
  };
  if (profile.instagram && !/^[A-Za-z0-9._]+$/.test(profile.instagram)) fail('Instagram must be a username without @ or a URL.', 'profile.instagram');
  object(value.audio, 'audio');
  if (Object.keys(value.audio).length > 500) fail('A maximum of 500 audio entries is supported.', 'audio');
  const audio = {};
  for (const [id, item] of Object.entries(value.audio)) {
    identifier(id, `audio.${id}`);
    keys(item, ['src','duration','waveform','bytes'], `audio.${id}`);
    if (typeof item.duration !== 'number' || !Number.isFinite(item.duration) || item.duration < 0 || item.duration > 86400) fail('Audio duration must be between 0 and 86400 seconds.', `audio.${id}.duration`);
    const waveform = item.waveform === undefined ? [] : item.waveform;
    if (!Array.isArray(waveform) || waveform.length > 4096 || waveform.some(n => typeof n !== 'number' || !Number.isFinite(n) || n < -1 || n > 1)) fail('Audio waveform must contain at most 4096 values between -1 and 1.', `audio.${id}.waveform`);
    audio[id] = {src:assetUrl(item.src, `audio.${id}.src`), duration:item.duration, waveform:[...waveform]};
    if (item.bytes !== undefined) {
      if (!Number.isSafeInteger(item.bytes) || item.bytes < 0) fail('Audio bytes must be a non-negative integer.', `audio.${id}.bytes`);
      audio[id].bytes = item.bytes;
    }
  }
  if (!Array.isArray(value.projects) || value.projects.length > 200) fail('Projects must be an array of at most 200 items.', 'projects');
  const projectIds = new Set();
  const projects = value.projects.map((item, index) => {
    const field = `projects[${index}]`;
    keys(item, ['id','title','category','image','audioIds','status','summary','role','tools','process','note'], field);
    const id = identifier(item.id, `${field}.id`);
    if (projectIds.has(id)) fail('Project IDs must be unique.', `${field}.id`);
    projectIds.add(id);
    if (!['composition','study'].includes(item.category)) fail('Project category must be composition or study.', `${field}.category`);
    if (!Array.isArray(item.audioIds) || item.audioIds.length > 100 || item.audioIds.some(audioId => typeof audioId !== 'string' || !Object.hasOwn(audio, audioId))) fail('Every project audio ID must reference an existing audio entry.', `${field}.audioIds`);
    const result = {id, title:text(item.title, `${field}.title`, 200, true), category:item.category, image:assetUrl(item.image, `${field}.image`, true), audioIds:[...item.audioIds]};
    for (const key of ['status','summary','role','tools','process','note']) result[key] = localized(item[key], `${field}.${key}`);
    return result;
  });
  if (!Array.isArray(value.photos) || value.photos.length > 1000) fail('Photos must be an array of at most 1000 items.', 'photos');
  const photoIds = new Set();
  const photos = value.photos.map((item, index) => {
    const field = `photos[${index}]`;
    keys(item, ['id','src','title','caption','thumb','full'], field);
    const id = identifier(item.id, `${field}.id`);
    if (photoIds.has(id)) fail('Photo IDs must be unique.', `${field}.id`);
    photoIds.add(id);
    const result = {id, src:assetUrl(item.src, `${field}.src`), title:localized(item.title, `${field}.title`), caption:localized(item.caption, `${field}.caption`)};
    if (item.thumb) result.thumb = assetUrl(item.thumb, `${field}.thumb`);
    if (item.full) result.full = assetUrl(item.full, `${field}.full`);
    return result;
  });
  return {schemaVersion:1, profile, projects, audio, photos};
}

export function normalizeSubscriber(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('INVALID_SUBSCRIPTION', 'Enter your email and confirm consent.');
  if (body.website !== undefined && typeof body.website !== 'string') throw new InputError('INVALID_SUBSCRIPTION', 'The subscription request is not valid.');
  if (body.website) return {honeypot:true};
  if (body.consent !== true) throw new InputError('CONSENT_REQUIRED', 'Please agree to join the email list.');
  const email = normalizeEmail(body.email);
  const name = body.name === undefined ? '' : body.name;
  if (typeof name !== 'string' || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) throw new InputError('INVALID_NAME', 'Name must be text of at most 100 characters.');
  return {email, name:name.trim()};
}

export const MIME_TYPES = Object.freeze({
  'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif', 'image/avif':'avif',
  'audio/mpeg':'mp3', 'audio/wav':'wav', 'audio/ogg':'ogg', 'audio/flac':'flac', 'audio/mp4':'m4a', 'audio/aac':'aac', 'audio/webm':'webm',
  'video/mp4':'mp4', 'video/webm':'webm', 'application/pdf':'pdf'
});
export function normalizeUploadMime(value) {
  let mime = String(value || '').split(';')[0].trim().toLowerCase();
  if (mime === 'audio/x-wav' || mime === 'audio/wave') mime = 'audio/wav';
  if (!Object.hasOwn(MIME_TYPES, mime)) throw new InputError('UNSUPPORTED_MEDIA', 'Upload a supported raster image, audio, video, or PDF file. HTML, scripts and SVG are not accepted.', 415);
  return mime;
}
export function validateUpload(value, bytes) {
  const mimeType = normalizeUploadMime(value);
  if (!(bytes instanceof Uint8Array) || !bytes.length) throw new InputError('EMPTY_UPLOAD', 'Choose a non-empty file.');
  if (bytes.length > MAX_UPLOAD_BYTES) throw new InputError('UPLOAD_TOO_LARGE', 'The file exceeds the 25 MiB limit.', 413);
  const at = (start, string) => [...string].every((char, i) => bytes[start+i] === char.charCodeAt(0));
  const ftyp = bytes.length >= 12 && at(4, 'ftyp');
  const frame = bytes.length >= 2 && bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0;
  let valid = false;
  switch (mimeType) {
    case 'image/jpeg': valid = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255; break;
    case 'image/png': valid = bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n); break;
    case 'image/webp': valid = bytes.length >= 12 && at(0,'RIFF') && at(8,'WEBP'); break;
    case 'image/gif': valid = at(0,'GIF87a') || at(0,'GIF89a'); break;
    case 'image/avif': valid = ftyp && /avif|avis/.test(new TextDecoder().decode(bytes.subarray(8, Math.min(64,bytes.length)))); break;
    case 'audio/mpeg': valid = at(0,'ID3') || frame; break;
    case 'audio/wav': valid = bytes.length >= 12 && at(0,'RIFF') && at(8,'WAVE'); break;
    case 'audio/ogg': valid = at(0,'OggS'); break;
    case 'audio/flac': valid = at(0,'fLaC'); break;
    case 'audio/mp4': case 'video/mp4': valid = ftyp; break;
    case 'audio/aac': valid = frame && (bytes[1] & 0xf6) === 0xf0; break;
    case 'audio/webm': case 'video/webm': valid = [0x1a,0x45,0xdf,0xa3].every((n,i) => bytes[i] === n); break;
    case 'application/pdf': valid = at(0,'%PDF-'); break;
  }
  if (!valid) throw new InputError('MEDIA_TYPE_MISMATCH', 'The file contents do not match its media type.', 415);
  return {mimeType, extension:MIME_TYPES[mimeType]};
}

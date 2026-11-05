import { mkdir, open, readFile, writeFile, rename, unlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { InputError, validateContent, normalizeUploadMime, uploadLimit, validateUpload, MIME_TYPES } from './validation.mjs';

async function readJson(filename, fallback) {
  try { return JSON.parse(await readFile(filename, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; }
}

async function atomicJson(filename, value) {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2), {encoding:'utf8', mode:0o600, flag:'wx'});
    await rename(temporary, filename);
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

export async function createStore({baseDirectory, dataDirectory}) {
  await mkdir(dataDirectory, {recursive:true, mode:0o700});
  const uploadsDirectory = path.join(dataDirectory, 'uploads');
  await mkdir(uploadsDirectory, {recursive:true, mode:0o700});
  const uploadsReal = await realpath(uploadsDirectory);
  const adminPath = path.join(dataDirectory, 'admin.json');
  const contentPath = path.join(dataDirectory, 'content.json');
  const subscriberPath = path.join(dataDirectory, 'subscribers.json');
  let admin = await readJson(adminPath, null);
  let contentRecord = await readJson(contentPath, null);
  if (!contentRecord) {
    const seed = await readJson(path.join(baseDirectory, 'data', 'seed-content.json'));
    contentRecord = {content:validateContent(seed), revision:1, updatedAt:new Date().toISOString()};
    await atomicJson(contentPath, contentRecord);
  } else {
    contentRecord.content = validateContent(contentRecord.content);
    if (!Number.isSafeInteger(contentRecord.revision) || contentRecord.revision < 1) throw new Error('Stored content revision is not valid.');
  }
  let subscribers = await readJson(subscriberPath, []);
  if (!Array.isArray(subscribers)) throw new Error('Stored subscriber list is not valid.');
  let transaction = Promise.resolve();
  function locked(operation) {
    const result = transaction.then(operation);
    transaction = result.catch(() => {});
    return result;
  }
  async function saveUploadStream({source, mimeType: requestedMime, name, expectedSize}) {
    const mimeType = normalizeUploadMime(requestedMime), limit = uploadLimit(mimeType);
    const tooLarge = () => new InputError('UPLOAD_TOO_LARGE', `The file exceeds the ${mimeType.startsWith('audio/') ? '1 GiB audio' : '25 MiB'} limit.`, 413);
    if (expectedSize !== undefined && (!Number.isSafeInteger(expectedSize) || expectedSize < 0)) throw new InputError('INVALID_LENGTH', 'The upload size is invalid.');
    if (expectedSize > limit) throw tooLarge();
    if (!source || typeof source[Symbol.asyncIterator] !== 'function') throw new InputError('INVALID_UPLOAD', 'Send a binary file to upload.');
    const filename = `${randomUUID()}.${MIME_TYPES[mimeType]}`;
    const filePath = path.join(uploadsReal, filename);
    const temporary = path.join(uploadsReal, `${filename}.${randomUUID()}.part`);
    // IncomingMessage's normal iterator destroys the connection on an early
    // rejection. Keep it open long enough for the CMS to return the error.
    const iterator = typeof source.iterator === 'function' ? source.iterator({destroyOnReturn:false}) : source[Symbol.asyncIterator]();
    const prefix = new Uint8Array(64);
    let handle, length = 0, prefixLength = 0, checked = false, finished = false, renamed = false, published = false;
    try {
      handle = await open(temporary, 'wx', 0o600);
      while (true) {
        let part;
        try { part = await iterator.next(); }
        catch { throw new InputError('REQUEST_INTERRUPTED', 'The upload was interrupted. Please try again.'); }
        if (part.done) { finished = true; break; }
        const chunk = part.value;
        if (!(chunk instanceof Uint8Array)) throw new InputError('INVALID_UPLOAD', 'Send a binary file to upload.');
        length += chunk.byteLength;
        if (length > limit) throw tooLarge();
        if (expectedSize !== undefined && length > expectedSize) throw new InputError('REQUEST_INTERRUPTED', 'The upload size did not match the file. Please try again.');
        if (prefixLength < prefix.length) {
          const take = Math.min(prefix.length - prefixLength, chunk.byteLength);
          prefix.set(chunk.subarray(0, take), prefixLength); prefixLength += take;
        }
        if (!checked && prefixLength === prefix.length) { validateUpload(mimeType, prefix); checked = true; }
        let offset = 0;
        while (offset < chunk.byteLength) {
          const result = await handle.write(chunk, offset, chunk.byteLength - offset);
          if (!result.bytesWritten) throw new Error('The upload file could not be written.');
          offset += result.bytesWritten;
        }
      }
      if (expectedSize !== undefined && length !== expectedSize) throw new InputError('REQUEST_INTERRUPTED', 'The upload was incomplete. Please try again.');
      if (!checked) validateUpload(mimeType, prefix.subarray(0, prefixLength));
      await handle.sync(); await handle.close(); handle = undefined;
      // Metadata is the publication boundary: getUpload cannot expose a
      // partial file, including during the rename/metadata interval.
      await rename(temporary, filePath); renamed = true;
      await atomicJson(`${filePath}.json`, {mimeType, size:length, name, createdAt:new Date().toISOString()});
      published = true;
      return {url:`/uploads/${filename}`, mimeType, size:length, name};
    } finally {
      if (!finished) await iterator.return?.().catch(() => {});
      if (handle) await handle.close().catch(() => {});
      await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
      if (renamed && !published) await unlink(filePath).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
  }
  return {
    getAdmin:() => admin,
    getContent:() => contentRecord,
    initializeAdmin:credential => locked(async () => {
      if (admin) throw new InputError('ALREADY_INITIALIZED', 'The root account already exists. Please sign in.', 409);
      await atomicJson(adminPath, credential);
      admin = credential;
    }),
    saveContent:(content, expectedRevision) => locked(async () => {
      if (expectedRevision !== contentRecord.revision) throw new InputError('REVISION_CONFLICT', 'Content changed in another window. Reload the latest version before saving.', 409, {revision:contentRecord.revision});
      const next = {content, revision:contentRecord.revision+1, updatedAt:new Date().toISOString()};
      await atomicJson(contentPath, next);
      contentRecord = next;
      return {ok:true, revision:next.revision, updatedAt:next.updatedAt};
    }),
    subscribe:subscriber => locked(async () => {
      if (subscribers.some(item => item.email === subscriber.email)) return;
      const createdAt = new Date().toISOString();
      const next = [...subscribers, {id:randomUUID(), email:subscriber.email, name:subscriber.name, createdAt, consentAt:createdAt}];
      await atomicJson(subscriberPath, next);
      subscribers = next;
    }),
    getSubscribers:() => subscribers.map(({id,email,name,createdAt}) => ({id,email,name,createdAt})),
    deleteSubscriber:id => locked(async () => {
      if (!subscribers.some(item => item.id === id)) throw new InputError('SUBSCRIBER_NOT_FOUND', 'This subscriber was already removed.', 404);
      const next = subscribers.filter(item => item.id !== id);
      await atomicJson(subscriberPath, next);
      subscribers = next;
    }),
    saveUpload:async ({bytes,mimeType,extension,name}) => {
      const filename = `${randomUUID()}.${extension}`;
      const filePath = path.join(uploadsDirectory, filename);
      const metadata = {mimeType, size:bytes.length, name, createdAt:new Date().toISOString()};
      try {
        await writeFile(filePath, bytes, {flag:'wx', mode:0o600});
        await atomicJson(`${filePath}.json`, metadata);
      } catch (error) {
        await unlink(filePath).catch(() => {});
        throw error;
      }
      return {url:`/uploads/${filename}`, mimeType, size:bytes.length, name};
    },
    saveUploadStream,
    getUpload:async filename => {
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.[a-z0-9]+$/.test(filename)) return null;
      const metadata = await readJson(path.join(uploadsDirectory, `${filename}.json`), null);
      if (!metadata || !Object.hasOwn(MIME_TYPES, metadata.mimeType) || path.extname(filename) !== `.${MIME_TYPES[metadata.mimeType]}`) return null;
      const filePath = await realpath(path.join(uploadsDirectory, filename));
      if (path.dirname(filePath) !== uploadsReal) return null;
      return {filePath, ...metadata};
    }
  };
}

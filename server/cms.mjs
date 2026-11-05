import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createStore } from './store.mjs';
import { createAuth, hashPassword, verifyPassword, validCredential } from './auth.mjs';
import { InputError, validateContent, normalizeSubscriber, normalizeUploadMime, MAX_CONTENT_BYTES } from './validation.mjs';
import { loadServerConfig } from './config.mjs';

function json(res, status, value, headers = {}) {
  const encoded = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Content-Length':encoded.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff', ...headers});
  res.end(encoded);
}
function sameOrigin(req,config) {
  if (req.headers.origin !== config.expectedOrigin(req)) throw new InputError('ORIGIN_REJECTED', 'Open this website in the same browser tab and try again.', 403);
  const fetchSite = req.headers['sec-fetch-site'];
  if (fetchSite && !['same-origin','none'].includes(fetchSite)) throw new InputError('ORIGIN_REJECTED', 'Cross-site requests are not accepted.', 403);
}
function readBody(req, limit) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > limit) {
    req.once('error', () => {});
    req.resume();
    throw new InputError('REQUEST_TOO_LARGE', `The request exceeds the ${Math.floor(limit/1024/1024) || 1} MiB limit.`, 413);
  }
  return new Promise((resolve,reject) => {
    const chunks = [];
    let length = 0;
    const cleanup = () => {req.off('data', data);req.off('end', end);req.off('error', error);req.off('aborted', aborted);};
    const error = () => {cleanup();reject(new InputError('REQUEST_INTERRUPTED', 'The upload or request was interrupted. Please try again.'));};
    const aborted = error;
    const data = chunk => {
      length += chunk.length;
      if (length > limit) {
        cleanup();
        req.once('error', () => {});
        req.resume();
        reject(new InputError('REQUEST_TOO_LARGE', `The request exceeds the ${Math.floor(limit/1024/1024) || 1} MiB limit.`, 413));
      } else chunks.push(chunk);
    };
    const end = () => {cleanup();resolve(Buffer.concat(chunks,length));};
    req.on('data',data);req.once('end',end);req.once('error',error);req.once('aborted',aborted);
  });
}
async function readJson(req, limit = 8192) {
  if (String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') throw new InputError('JSON_REQUIRED', 'Send this request as JSON.', 415);
  const bytes = await readBody(req,limit);
  let body;
  try { body = JSON.parse(bytes.toString('utf8')); } catch { throw new InputError('INVALID_JSON', 'This request contains invalid JSON.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('INVALID_JSON', 'This request must contain a JSON object.');
  return body;
}
function method(req, allowed) {
  if (!allowed.includes(req.method)) throw new InputError('METHOD_NOT_ALLOWED', 'This request method is not supported.', 405);
}
function uploadName(req) {
  const value = req.headers['x-filename'];
  if (typeof value !== 'string' || !value) throw new InputError('FILENAME_REQUIRED', 'Choose a file to upload.');
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { throw new InputError('INVALID_FILENAME', 'The file name could not be read. Rename the file and try again.'); }
  const name = decoded.split(/[\\/]/).at(-1).normalize('NFC');
  if (!name || name === '.' || name === '..' || name.length > 180 || /[\u0000-\u001f\u007f]/.test(name)) throw new InputError('INVALID_FILENAME', 'Use a file name of at most 180 characters without control characters.');
  return name;
}
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"','""')}"`;
}
function rangeHeader(value,size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || !size) return null;
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0,size-suffix);end=size-1;
  } else {
    start=Number(match[1]);end=match[2]?Number(match[2]):size-1;
    if (!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size) return null;
    end=Math.min(end,size-1);
  }
  return {start,end};
}
async function serveUpload(req,res,upload) {
  const size = (await stat(upload.filePath)).size;
  let range;
  if (req.method === 'GET' && req.headers.range) {
    range = rangeHeader(req.headers.range,size);
    if (!range) {json(res,416,{ok:false,error:{code:'RANGE_NOT_SATISFIABLE',message:'The requested media range is not available.'}},{'Content-Range':`bytes */${size}`});return;}
  }
  const headers = {
    'Content-Type':upload.mimeType,
    'Content-Length':range ? range.end-range.start+1 : size,
    'Accept-Ranges':'bytes',
    'Cache-Control':'public, max-age=31536000, immutable',
    'X-Content-Type-Options':'nosniff',
    'Content-Disposition':`${upload.mimeType === 'application/pdf' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(upload.name)}`
  };
  if (range) headers['Content-Range']=`bytes ${range.start}-${range.end}/${size}`;
  if (req.method === 'HEAD') {res.writeHead(200,headers);res.end();return;}
  const stream = createReadStream(upload.filePath,range || undefined);
  stream.once('open',()=>{res.writeHead(range?206:200,headers);stream.pipe(res);});
  stream.once('error',()=>{if(res.headersSent)res.destroy();else json(res,500,{ok:false,error:{code:'MEDIA_READ_FAILED',message:'This media file is temporarily unavailable.'}});});
  res.once('close',()=>stream.destroy());
}

export async function createLocalCms({baseDirectory,config=loadServerConfig({baseDirectory})}) {
  const dataDirectory = config.dataDirectory;
  const store = await createStore({baseDirectory,dataDirectory});
  if (config.production && !validCredential(store.getAdmin())) throw new Error('Server root is not initialized with a valid password hash. Stop the service and run node server/create-admin.mjs using the same DATA_DIR before starting the public website.');
  const auth = createAuth({secureCookies:config.secureCookies,getClientIp:config.clientIp});
  function status(req) {
    const session = auth.session(req);
    return {mode:'local',deployment:config.deployment,setupAllowed:config.allowWebSetup,initialized:!!store.getAdmin(),authenticated:!!session,username:session?'root':null,csrfToken:session?.csrfToken || null};
  }
  return async function handle(req,res) {
    const pathname = String(req.url || '/').split(/[?#]/,1)[0];
    if (!/^\/api(?:\/|$)/.test(pathname) && !/^\/uploads(?:\/|$)/.test(pathname)) return false;
    try {
      if (!['GET','HEAD'].includes(req.method)) sameOrigin(req,config);
      if (pathname.startsWith('/uploads/')) {
        method(req,['GET','HEAD']);
        const upload = await store.getUpload(pathname.slice('/uploads/'.length));
        if (!upload) throw new InputError('MEDIA_NOT_FOUND','This media file could not be found.',404);
        await serveUpload(req,res,upload);
      } else if (pathname === '/api/content') {
        method(req,['GET']);json(res,200,store.getContent());
      } else if (pathname === '/api/auth/status') {
        method(req,['GET']);json(res,200,status(req));
      } else if (pathname === '/api/auth/setup') {
        method(req,['POST']);auth.checkFailures(req);
        if (!config.allowWebSetup) throw new InputError('WEB_SETUP_DISABLED','The server administrator must be created privately with node server/create-admin.mjs. Browser setup is disabled.',403);
        if (store.getAdmin()) throw new InputError('ALREADY_INITIALIZED','The root account already exists. Please sign in.',409);
        const body = await readJson(req);
        let credential;
        try {credential = await hashPassword(body.password);} catch(error) {auth.failed(req);throw error;}
        await store.initializeAdmin(credential);
        auth.clearFailures(req);
        const session = auth.create(req,res);
        json(res,201,{ok:true,mode:'local',initialized:true,authenticated:true,username:'root',csrfToken:session.csrfToken});
      } else if (pathname === '/api/auth/login') {
        method(req,['POST']);auth.checkFailures(req);
        const body = await readJson(req);
        const record = store.getAdmin();
        if (!record) throw new InputError('SETUP_REQUIRED','Create the root password on this computer first.',409);
        const finish = auth.beginPasswordCheck(req);
        let correct;
        try {correct = await verifyPassword(body.password,record);} finally {finish();}
        if (body.username !== 'root' || !correct) {auth.failed(req);throw new InputError('INVALID_CREDENTIALS','The username or password is incorrect.',401);}
        auth.clearFailures(req);
        const session = auth.create(req,res);
        json(res,200,{ok:true,mode:'local',initialized:true,authenticated:true,username:'root',csrfToken:session.csrfToken});
      } else if (pathname === '/api/auth/logout') {
        method(req,['POST']);auth.requireAdmin(req,true);auth.clear(req,res);json(res,200,{ok:true});
      } else if (pathname === '/api/admin/content') {
        method(req,['PUT']);auth.requireAdmin(req,true);
        const body = await readJson(req,MAX_CONTENT_BYTES+65536);
        if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 1) throw new InputError('REVISION_REQUIRED','Reload the current content before saving.');
        const content = validateContent(body.content);
        json(res,200,await store.saveContent(content,body.expectedRevision));
      } else if (pathname === '/api/admin/upload') {
        method(req,['POST']);auth.requireAdmin(req,true);
        const mimeType = normalizeUploadMime(req.headers['content-type']);
        const name = uploadName(req);
        const declared = req.headers['content-length'];
        if (declared !== undefined && !/^\d+$/.test(declared)) throw new InputError('INVALID_LENGTH','The upload size is invalid.');
        const expectedSize = declared === undefined ? undefined : Number(declared);
        try { json(res,201,await store.saveUploadStream({source:req,mimeType,name,expectedSize})); }
        catch(error) {
          req.once('error', () => {});
          req.resume();
          throw error;
        }
      } else if (pathname === '/api/subscribe') {
        method(req,['POST']);auth.limitSubscription(req);
        const subscriber = normalizeSubscriber(await readJson(req));
        if (!subscriber.honeypot) await store.subscribe(subscriber);
        json(res,200,{ok:true});
      } else if (pathname === '/api/admin/subscribers') {
        method(req,['GET']);auth.requireAdmin(req);json(res,200,{subscribers:store.getSubscribers()});
      } else if (pathname === '/api/admin/subscribers.csv') {
        method(req,['GET']);auth.requireAdmin(req);
        const rows = [['id','email','name','createdAt'],...store.getSubscribers().map(item=>[item.id,item.email,item.name,item.createdAt])];
        const body = Buffer.from('\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n');
        res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Length':body.length,'Content-Disposition':'attachment; filename="subscribers.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
      } else if (/^\/api\/admin\/subscribers\/[a-f0-9-]{36}$/.test(pathname)) {
        method(req,['DELETE']);auth.requireAdmin(req,true);await store.deleteSubscriber(pathname.split('/').at(-1));json(res,200,{ok:true});
      } else throw new InputError('NOT_FOUND','This API endpoint could not be found.',404);
    } catch (error) {
      if (res.destroyed || req.aborted) return true;
      if (res.headersSent) {res.destroy();return true;}
      if (error instanceof InputError) {
        const details = error.details === undefined ? {} : {details:error.details};
        const headers = error.status === 429 ? {'Retry-After':error.code === 'LOGIN_RATE_LIMIT'?'900':error.code === 'LOGIN_BUSY'?'2':'3600'} : {};
        if (error.status === 413) headers.Connection = 'close';
        json(res,error.status,{ok:false,error:{code:error.code,message:error.message,...details}},headers);
      } else if (error.code === 'ENOENT') {
        json(res,404,{ok:false,error:{code:'MEDIA_NOT_FOUND',message:'This media file could not be found.'}});
      } else {
        console.error('Local CMS request failed.',error.code || error.name || 'ERROR');
        json(res,500,{ok:false,error:{code:'STORAGE_ERROR',message:'The change could not be saved. Check that the local data folder is writable and try again.'}});
      }
    }
    return true;
  };
}

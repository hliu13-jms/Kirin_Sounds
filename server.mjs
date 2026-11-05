import http from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalCms } from './server/cms.mjs';
import { loadServerConfig } from './server/config.mjs';

const HOST = '127.0.0.1';
const baseDirectory = path.dirname(fileURLToPath(import.meta.url));
const requestedRoot = path.join(baseDirectory, 'public');

const [nodeMajor,nodeMinor]=process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 13)) {
  console.error('Node.js 22.13 or newer is required.');
  process.exit(1);
}

function readPort() {
  let selected = process.env.PORT || '4173';
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port') {
      if (i + 1 >= args.length) throw new Error('Missing port after --port.');
      selected = args[++i];
    } else if (args[i].startsWith('--port=')) {
      selected = args[i].slice('--port='.length);
    } else {
      throw new Error(`Unknown argument: ${args[i]}. Use --port 4174 to choose a port.`);
    }
  }
  if (!/^\d+$/.test(selected)) throw new Error('Port must be a number between 1 and 65535.');
  const result = Number(selected);
  if (!Number.isInteger(result) || result < 1 || result > 65535) {
    throw new Error('Port must be a number between 1 and 65535.');
  }
  return result;
}

let port;
let rootDirectory;
let cms;
let config;
try {
  port = readPort();
  config = loadServerConfig({baseDirectory,port});
  if (config.production) process.umask(0o077);
  rootDirectory = await realpath(requestedRoot);
  if (!(await stat(rootDirectory)).isDirectory()) throw new Error('public is not a folder.');
  cms = await createLocalCms({baseDirectory,config});
} catch (error) {
  console.error(`Cannot start the portfolio: ${error.message}`);
  console.error('Keep public/, server/, and data/seed-content.json beside server.mjs. See README.txt for help.');
  process.exit(1);
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm'
};

function isInsideRoot(target) {
  const relative = path.relative(rootDirectory, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function respondText(req, res, status, message, extraHeaders = {}) {
  const body = `${message}\n`;
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

// The server supports one byte range, which is sufficient for browser media seeking.
function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || size === 0) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return null;
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

const server = http.createServer(async (req, res) => {
  try {
    if (!config.isLocalHealth(req)) config.validateRequest(req);
  } catch(error) {
    const body=Buffer.from(JSON.stringify({ok:false,error:{code:error.code || 'REQUEST_REJECTED',message:error.message}}));
    res.writeHead(error.status || 403,{'Content-Type':'application/json; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);return;
  }
  if (req.url === '/healthz' && ['GET','HEAD'].includes(req.method)) {
    const body=Buffer.from('{"ok":true}');
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);return;
  }
  if (await cms(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    respondText(req, res, 405, 'Method not allowed.', { Allow: 'GET, HEAD' });
    return;
  }
  try {
    let pathname;
    try {
      pathname = decodeURIComponent((req.url || '/').split(/[?#]/, 1)[0]).replaceAll('\\', '/');
    } catch {
      respondText(req, res, 400, 'Invalid URL encoding.');
      return;
    }
    if (!pathname.startsWith('/') || pathname.includes('\0')) {
      respondText(req, res, 400, 'Invalid request path.');
      return;
    }
    if (pathname.split('/').includes('..')) {
      respondText(req, res, 403, 'Access denied.');
      return;
    }
    let filename = path.resolve(rootDirectory, `.${pathname}`);
    if (!isInsideRoot(filename)) {
      respondText(req, res, 403, 'Access denied.');
      return;
    }
    let information = await stat(filename);
    if (information.isDirectory()) {
      filename = path.join(filename, 'index.html');
      information = await stat(filename);
    }
    if (!information.isFile()) {
      respondText(req, res, 404, 'File not found.');
      return;
    }
    // Also reject symlinks that would expose a file outside public.
    filename = await realpath(filename);
    if (!isInsideRoot(filename)) {
      respondText(req, res, 403, 'Access denied.');
      return;
    }
    const size = information.size;
    const headers = {
      'Content-Type': mimeTypes[path.extname(filename).toLowerCase()] || 'application/octet-stream',
      'Content-Length': size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'Last-Modified': information.mtime.toUTCString(),
      'X-Content-Type-Options': 'nosniff'
    };
    let range;
    if (req.method === 'GET' && req.headers.range) {
      range = parseRange(req.headers.range, size);
      if (!range) {
        respondText(req, res, 416, 'Requested range is not available.', {
          'Content-Range': `bytes */${size}`,
          'Accept-Ranges': 'bytes'
        });
        return;
      }
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
      headers['Content-Length'] = range.end - range.start + 1;
    }
    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }
    const stream = createReadStream(filename, range || undefined);
    stream.once('open', () => {
      res.writeHead(range ? 206 : 200, headers);
      stream.pipe(res);
    });
    stream.once('error', () => {
      if (res.headersSent) res.destroy();
      else respondText(req, res, 500, 'Unable to read this file.');
    });
    res.once('close', () => stream.destroy());
  } catch (error) {
    if (res.headersSent) res.destroy();
    else if (error.code === 'ENOENT' || error.code === 'ENOTDIR') respondText(req, res, 404, 'File not found.');
    else if (error.code === 'EACCES' || error.code === 'EPERM') respondText(req, res, 403, 'Access denied.');
    else respondText(req, res, 500, 'Unable to serve this request.');
  }
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Try: node server.mjs --port ${port < 65535 ? port + 1 : 4174}`);
  } else {
    console.error(`Cannot start the local server: ${error.message}`);
  }
  process.exitCode = 1;
});

server.listen(port, HOST, () => {
  console.log(`\nPortfolio running at http://${HOST}:${port}/`);
  console.log('Open this address in your browser. Press Ctrl+C to stop.');
  console.log(config.production ? `HTTPS proxy origin: ${config.publicOrigin}. Backend listens on loopback only.\n` : 'Local access only: this server is not exposed to your network.\n');
});

process.once('SIGINT', () => server.close(() => process.exit(0)));
process.once('SIGTERM', () => server.close(() => process.exit(0)));

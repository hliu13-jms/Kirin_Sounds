import path from 'node:path';
import { isIP } from 'node:net';
import { InputError } from './validation.mjs';

export function normalizedIp(value) {
  if (typeof value !== 'string' || value.length > 64) return null;
  const ip = value.trim();
  if (ip.includes('%') || ip.includes(',') || !isIP(ip)) return null;
  if (isIP(ip) === 4) return ip;
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1,-1).toLowerCase();
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(canonical);
  if (mapped) {
    const high = parseInt(mapped[1],16), low = parseInt(mapped[2],16);
    return `${high>>>8}.${high&255}.${low>>>8}.${low&255}`;
  }
  return canonical;
}
export function isLoopback(value) {
  const ip = normalizedIp(value);
  return ip === '::1' || !!(ip && isIP(ip) === 4 && ip.startsWith('127.'));
}
export function loadServerConfig({baseDirectory,port=4173,env=process.env}) {
  const deployment = env.KIRIN_DEPLOYMENT || 'local';
  if (!['local','server'].includes(deployment)) throw new Error('KIRIN_DEPLOYMENT must be local or server.');
  const production = deployment === 'server';
  let publicOrigin = '', publicHost = '';
  if (production) {
    try {
      const parsed = new URL(env.PUBLIC_ORIGIN || '');
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.origin !== env.PUBLIC_ORIGIN) throw new Error();
      publicOrigin = parsed.origin;publicHost = parsed.host;
    } catch {throw new Error('Server mode requires PUBLIC_ORIGIN as an exact HTTPS origin, for example https://kirinsounds.art (no trailing slash).');}
    if (!env.DATA_DIR || !path.isAbsolute(env.DATA_DIR)) throw new Error('Server mode requires DATA_DIR to be an absolute persistent directory.');
  } else if (env.PUBLIC_ORIGIN) throw new Error('Set KIRIN_DEPLOYMENT=server when using PUBLIC_ORIGIN.');
  const dataDirectory = path.resolve(baseDirectory,env.DATA_DIR || '.data');
  const localHosts = new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
  if (port === 80) {localHosts.add('127.0.0.1');localHosts.add('localhost');}
  function clientIp(req) {
    const peer = normalizedIp(req.socket?.remoteAddress);
    if (!production) return peer || 'local';
    if (!isLoopback(peer)) throw new InputError('PROXY_REQUIRED','Server mode accepts requests only through the local HTTPS proxy.',403);
    const forwarded = normalizedIp(req.headers['x-forwarded-for']);
    if (!forwarded) throw new InputError('PROXY_HEADERS_REQUIRED','The HTTPS proxy must supply one valid client IP address.',403);
    return forwarded;
  }
  function validateRequest(req) {
    if (!production) {
      if (!localHosts.has(req.headers.host)) throw new InputError('HOST_REJECTED','Use the local address shown in the server window.',421);
      return clientIp(req);
    }
    if (req.headers.host !== publicHost) throw new InputError('HOST_REJECTED','This request does not match the configured website domain.',421);
    const ip = clientIp(req);
    if (req.headers['x-forwarded-proto'] !== 'https') throw new InputError('HTTPS_PROXY_REQUIRED','Open this website through its configured HTTPS address.',403);
    return ip;
  }
  function isLocalHealth(req) {
    return req.url === '/healthz' && ['GET','HEAD'].includes(req.method) && isLoopback(req.socket?.remoteAddress) && localHosts.has(req.headers.host);
  }
  return Object.freeze({deployment,production,publicOrigin,publicHost,dataDirectory,secureCookies:production,allowWebSetup:!production,expectedOrigin:req=>production?publicOrigin:`http://${req.headers.host}`,validateRequest,clientIp,isLocalHealth});
}

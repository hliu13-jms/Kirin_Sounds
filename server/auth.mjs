import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { InputError } from './validation.mjs';

const scrypt = promisify(scryptCallback);
const COST = {N:32768, r:8, p:1, maxmem:64*1024*1024};
const SESSION_LIFETIME = 8*60*60*1000;
const COOKIE = 'kirin_session';

export async function hashPassword(password) {
  if (typeof password !== 'string' || [...password].length < 12 || [...password].length > 256 || !password.trim()) {
    throw new InputError('WEAK_PASSWORD', 'Use a password or passphrase between 12 and 256 characters.');
  }
  const salt = randomBytes(32).toString('hex');
  const hash = await scrypt(password, salt, 64, COST);
  return {username:'root', algorithm:'scrypt', salt, hash:hash.toString('hex'), parameters:{N:COST.N,r:COST.r,p:COST.p}, createdAt:new Date().toISOString()};
}

export async function verifyPassword(password, record) {
  if (typeof password !== 'string' || password.length > 2048 || !validCredential(record)) return false;
  const actual = await scrypt(password, record.salt, 64, COST);
  const expected = Buffer.from(record.hash, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export function validCredential(record) {
  return record?.username === 'root' && record.algorithm === 'scrypt' && /^[a-f0-9]{64}$/.test(record.salt) && /^[a-f0-9]{128}$/.test(record.hash);
}

export function createAuth({secureCookies=false,getClientIp=req=>req.socket.remoteAddress || 'local'}={}) {
  const sessions = new Map();
  const failures = new Map();
  const subscriptions = new Map();
  const pendingPasswords = new Map();
  let totalPendingPasswords = 0;
  const secureFlag = secureCookies ? '; Secure' : '';
  const cookieName = secureCookies ? '__Host-kirin_session' : COOKIE;
  function key(req) { return getClientIp(req); }
  function readCookie(req) {
    const value = String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`));
    const token = value?.slice(cookieName.length+1);
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }
  function session(req) {
    const token = readCookie(req);
    const value = token ? sessions.get(token) : null;
    if (!value || value.expiresAt <= Date.now()) {
      if (token) sessions.delete(token);
      return null;
    }
    return value;
  }
  function clear(req,res) {
    const token = readCookie(req);
    if (token) sessions.delete(token);
    res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureFlag}`);
  }
  function create(req,res) {
    const old = readCookie(req);
    if (old) sessions.delete(old);
    for (const [token,value] of sessions) if (value.expiresAt <= Date.now()) sessions.delete(token);
    const token = randomBytes(32).toString('base64url');
    const value = {username:'root', csrfToken:randomBytes(32).toString('base64url'), expiresAt:Date.now()+SESSION_LIFETIME};
    sessions.set(token,value);
    res.setHeader('Set-Cookie', `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_LIFETIME/1000}${secureFlag}`);
    return value;
  }
  function requireAdmin(req,csrf = false) {
    const value = session(req);
    if (!value) throw new InputError('AUTH_REQUIRED', 'Sign in to root to manage this website.', 401);
    if (csrf) {
      const supplied = req.headers['x-csrf-token'];
      const a = Buffer.from(typeof supplied === 'string' ? supplied : '');
      const b = Buffer.from(value.csrfToken);
      if (a.length !== b.length || !timingSafeEqual(a,b)) throw new InputError('CSRF_REQUIRED', 'Your security token expired. Refresh and sign in again.', 403);
    }
    return value;
  }
  function checkFailures(req) {
    const item = failures.get(key(req));
    if (item?.until > Date.now() && item.count >= 5) throw new InputError('LOGIN_RATE_LIMIT', 'Too many failed attempts. Try again in 15 minutes.', 429);
    if (item && item.until <= Date.now()) failures.delete(key(req));
  }
  function failed(req) {
    const id = key(req), now = Date.now(), previous = failures.get(id);
    const item = previous && previous.until > now ? previous : {count:0,until:now+15*60*1000};
    item.count++;
    failures.set(id,item);
  }
  function clearFailures(req) { failures.delete(key(req)); }
  function beginPasswordCheck(req) {
    checkFailures(req);
    const id = key(req), pending = pendingPasswords.get(id) || 0;
    if (pending >= 2 || totalPendingPasswords >= 4) throw new InputError('LOGIN_BUSY','Sign-in checks are busy. Try again in a few seconds.',429);
    pendingPasswords.set(id,pending+1);totalPendingPasswords++;
    let released=false;
    return () => {
      if(released)return;released=true;
      const remaining=(pendingPasswords.get(id)||1)-1;
      if(remaining)pendingPasswords.set(id,remaining);else pendingPasswords.delete(id);
      totalPendingPasswords--;
    };
  }
  function limitSubscription(req) {
    const id = key(req), now = Date.now(), previous = subscriptions.get(id);
    const item = previous && previous.until > now ? previous : {count:0,until:now+60*60*1000};
    item.count++;
    subscriptions.set(id,item);
    if (item.count > 20) throw new InputError('SUBSCRIBE_RATE_LIMIT', 'Too many requests. Please try again later.', 429);
  }
  return {session, create, clear, requireAdmin, checkFailures, failed, clearFailures, beginPasswordCheck, limitSubscription};
}

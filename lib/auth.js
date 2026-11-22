import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE = 'pk_admin';
const secret = () => process.env.ADMIN_SECRET || '';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');

export const adminConfigured = () => !!(process.env.ADMIN_PASSWORD && process.env.ADMIN_SECRET);
export function checkPassword(pw) {
  const a = Buffer.from(String(pw || '')), b = Buffer.from(process.env.ADMIN_PASSWORD || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function makeToken() {
  const exp = String(Date.now() + 1000 * 60 * 60 * 12);
  return `${exp}.${sign(exp)}`;
}
export function isAdmin() {
  if (!adminConfigured()) return false;
  const t = cookies().get(COOKIE)?.value;
  if (!t) return false;
  const [exp, sig] = t.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
export const COOKIE_NAME = COOKIE;

// naive in-memory limiter for login attempts
const hits = new Map();
export function tooMany(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 8;
}

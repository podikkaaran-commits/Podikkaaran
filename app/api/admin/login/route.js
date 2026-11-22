import { NextResponse } from 'next/server';
import { adminConfigured, checkPassword, makeToken, tooMany, COOKIE_NAME } from '@/lib/auth';

export async function POST(req) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Admin is not configured. Set ADMIN_PASSWORD and ADMIN_SECRET.' }, { status: 503 });
  const ip = req.headers.get('x-forwarded-for') || 'local';
  if (tooMany(ip)) return NextResponse.json({ error: 'Too many attempts. Try again in 10 minutes.' }, { status: 429 });
  const { password } = await req.json().catch(() => ({}));
  if (!checkPassword(password)) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, makeToken(), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 43200 });
  return res;
}
export async function DELETE() {
  const res = NextResponse.json({ ok: true }); res.cookies.delete(COOKIE_NAME); return res;
}

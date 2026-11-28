import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/db';
import { findCoupon } from '@/lib/shipping-server';

export async function POST(req) {
  const { code } = (await req.json().catch(() => null)) || {};
  const coupon = findCoupon(code, await getSettings());
  if (!coupon) return NextResponse.json({ error: 'This coupon is unavailable.' }, { status: 404 });
  return NextResponse.json({ coupon });
}

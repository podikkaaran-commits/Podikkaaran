import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/db';
import { PIN_RE } from '@/lib/delivery';
import { shippingFor } from '@/lib/shipping-server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const pin = new URL(req.url).searchParams.get('pin') || '';
  if (!PIN_RE.test(pin)) return NextResponse.json({ ok: false, message: 'Enter a valid 6-digit pincode.' }, { status: 400 });
  const s = await getSettings();
  const { available, baseCharge, minimum } = shippingFor(pin, s);
  const quote = { available, baseCharge, minimum };
  return NextResponse.json({ ok: true, ...quote, charge: baseCharge, deliveryTime: s.deliveryTime, cod: available && s.codEnabled });
}

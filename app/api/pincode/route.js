import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/db';
import { PIN_RE, zoneFor, chargeFor, stateGuess, ZONE_LABEL } from '@/lib/delivery';

export async function GET(req) {
  const pin = new URL(req.url).searchParams.get('pin') || '';
  if (!PIN_RE.test(pin)) return NextResponse.json({ ok: false, message: 'Enter a valid 6-digit pincode.' }, { status: 400 });
  const s = await getSettings(), state = stateGuess(pin);
  const zone = zoneFor({ state: state === 'Tamil Nadu' ? 'Tamil Nadu' : 'Other', pincode: pin }, s);
  return NextResponse.json({ ok: true, zone, zoneLabel: ZONE_LABEL[zone], charge: chargeFor(zone, s), deliveryTime: s.deliveryTime, cod: s.codEnabled });
}

import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getOrder } from '@/lib/db';
import { PIN_RE } from '@/lib/delivery';
import { shadowfaxGet } from '@/lib/shadowfax';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const orderId = params.get('orderId');
  if (orderId) {
    const order = await getOrder(orderId);
    const awb = order?.fulfilment?.awb;
    if (order?.fulfilment?.courier !== 'Shadowfax' || !/^[a-z0-9-]{1,80}$/i.test(awb || '')) {
      return NextResponse.json({ error: 'Save a valid Shadowfax AWB on this order first.' }, { status: 400 });
    }
    const result = await shadowfaxGet('/v4/clients/orders/' + encodeURIComponent(awb) + '/track/');
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    const tracking = result.data?.order_details;
    if (result.data?.message !== 'Success' || tracking?.awb_number !== awb || typeof tracking.status_display !== 'string') {
      return NextResponse.json({ error: 'Shadowfax returned no tracking status for this AWB.' }, { status: 502 });
    }
    return NextResponse.json({ mode: result.mode, trackingStatus: tracking.status_display });
  }

  const pincode = params.get('pincode') || '';
  if (!PIN_RE.test(pincode)) return NextResponse.json({ error: 'Enter a valid 6-digit pincode.' }, { status: 400 });
  const service = params.get('leg') === 'pickup' ? 'seller_pickup' : 'customer_delivery';
  const result = await shadowfaxGet('/v1/clients/serviceability/?service=' + service + '&pincodes=' + pincode);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!Array.isArray(result.data)) return NextResponse.json({ error: 'Shadowfax returned an unexpected serviceability response.' }, { status: 502 });
  const match = result.data.find(entry => String(entry.code) === pincode);
  return NextResponse.json({ mode: result.mode, tiers: Array.isArray(match?.services) ? match.services.filter(tier => typeof tier === 'string') : [] });
}

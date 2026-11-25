import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getOrder } from '@/lib/db';
import { PIN_RE } from '@/lib/delivery';
import { updateOrder } from '@/lib/orders';
import { shadowfaxGet, shadowfaxMode, shadowfaxPlaceOrder } from '@/lib/shadowfax';
import { canBookShadowfax, shadowfaxShipment } from '@/lib/shadowfax-booking';

export const dynamic = 'force-dynamic';
const AWB_RE = /^[a-z0-9-]{1,80}$/i;
const failure = (error, status) => NextResponse.json({ error }, { status });

export async function POST(req) {
  if (!isAdmin()) return failure('Unauthorized', 401);
  const { orderId, weightGrams } = (await req.json().catch(() => null)) || {};
  if (typeof orderId !== 'string' || !/^[a-z0-9-]{1,100}$/i.test(orderId)) return failure('Invalid order ID.', 400);
  const mode = shadowfaxMode();
  if (!process.env.SHADOWFAX_API_TOKEN?.trim() || !['staging', 'production'].includes(mode)) {
    return failure('Configure the Shadowfax token and environment first.', 503);
  }
  const order = await getOrder(orderId);
  if (!order) return failure('Order not found.', 404);
  if (order.fulfilment?.shadowfax?.state === 'booked') {
    return NextResponse.json({ fulfilment: order.fulfilment, mode: order.fulfilment.shadowfax.mode });
  }
  if (!canBookShadowfax(order)) return failure('This order is unavailable for Shadowfax booking.', 409);
  if (!Number.isSafeInteger(weightGrams) || weightGrams <= 0) return failure('Enter the packed parcel weight in grams.', 400);

  let payload;
  try {
    payload = shadowfaxShipment(order, weightGrams);
  } catch (error) {
    return failure(error.message, 400);
  }

  const attempt = randomUUID();
  try {
    const reserved = await updateOrder(orderId, current => {
      const previous = current.fulfilment?.shadowfax;
      if (!canBookShadowfax(current) || previous?.expires > Date.now() ||
          (previous && (previous.mode !== mode || previous.weightGrams !== weightGrams))) {
        throw new Error('BOOKING_CONFLICT');
      }
      current.fulfilment = {
        ...current.fulfilment,
        shadowfax: { state: 'pending', mode, weightGrams, attempt, expires: Date.now() + 30_000 },
      };
    });
    if (!reserved) return failure('Order not found.', 404);
  } catch {
    return failure('Booking is already in progress or the order changed. Reload and retry with the original parcel weight and environment.', 409);
  }

  const result = await shadowfaxPlaceOrder(payload);
  const booking = result.data?.data;
  if (result.data?.message !== 'Success' || booking?.client_order_id !== orderId || !AWB_RE.test(booking?.awb_number || '')) {
    const rejected = result.authRejected ||
      (result.data?.message === 'Failure' && result.data.errors && !/duplicate|already|exist/i.test(JSON.stringify(result.data.errors)));
    if (rejected && !order.fulfilment?.shadowfax) {
      await updateOrder(orderId, current => {
        if (current.fulfilment?.shadowfax?.attempt === attempt) delete current.fulfilment.shadowfax;
      }).catch(() => {});
      return failure(result.error || 'Shadowfax rejected the shipment. Check the pickup and delivery pincode and the order details in Shadowfax.', result.status || 422);
    }
    return failure('Booking could not be confirmed. Check this order ID in Shadowfax, then retry after 30 seconds with the same parcel weight.', 502);
  }

  const awb = booking.awb_number;
  try {
    const saved = await updateOrder(orderId, current => {
      if (current.fulfilment?.shadowfax?.attempt !== attempt) throw new Error('BOOKING_CONFLICT');
      current.fulfilment = {
        ...current.fulfilment,
        ...(current.fulfilment?.courier !== 'Shadowfax' ? { tracking: '' } : {}),
        courier: 'Shadowfax',
        awb,
        shadowfax: { state: 'booked', mode, weightGrams },
      };
    });
    if (saved) return NextResponse.json({ fulfilment: saved.fulfilment, mode });
  } catch {
    // The carrier already assigned this AWB. A retry uses the same client order ID.
  }
  return failure('Shadowfax assigned AWB ' + awb + ', but saving failed. Reload and retry with the same parcel weight.', 503);
}

export async function GET(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const orderId = params.get('orderId');
  if (orderId) {
    const order = await getOrder(orderId);
    const awb = order?.fulfilment?.awb;
    if (order?.fulfilment?.courier !== 'Shadowfax' || !AWB_RE.test(awb || '')) {
      return NextResponse.json({ error: 'Save a valid Shadowfax AWB on this order first.' }, { status: 400 });
    }
    if (order.fulfilment.shadowfax?.mode && order.fulfilment.shadowfax.mode !== shadowfaxMode()) {
      return failure('This AWB was booked in a different Shadowfax environment.', 409);
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

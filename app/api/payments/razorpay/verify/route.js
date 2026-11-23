import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getOrder } from '@/lib/db';
import { updateOrder, reserveStock, notifyAdmin } from '@/lib/orders';

// Marks an order paid ONLY after the HMAC signature from Razorpay checks out. Idempotent.
export async function POST(req) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const o = await getOrder(b.orderId);
  if (!o || o.payment.method !== 'razorpay' || o.payment.razorpayOrderId !== b.razorpay_order_id)
    return NextResponse.json({ error: 'Order mismatch' }, { status: 400 });
  const expected = crypto.createHmac('sha256', secret).update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`).digest('hex');
  const given = String(b.razorpay_signature || '');
  if (expected.length !== given.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given)))
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
  if (o.payment.status !== 'paid') {
    const updated = await updateOrder(o.id, (x) => {
      x.payment.status = 'paid'; x.payment.razorpayPaymentId = b.razorpay_payment_id; x.payment.paidAt = new Date().toISOString();
      x.status = 'Confirmed'; x.statusHistory.push({ status: 'Confirmed', at: new Date().toISOString() });
    });
    await reserveStock(updated.items); await notifyAdmin(updated);
  }
  return NextResponse.json({ ok: true, orderId: o.id, mobile: o.customer.mobile });
}

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getOrder } from '@/lib/db';
import { updateOrder, reserveStock, notifyAdmin } from '@/lib/orders';

// Confirm both the checkout signature and payment capture.
export async function POST(req) {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  if (typeof b?.orderId !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(b.razorpay_payment_id || ''))
    return NextResponse.json({ error: 'Invalid payment details' }, { status: 400 });
  const o = await getOrder(b.orderId);
  if (!o || o.payment.method !== 'razorpay' || o.payment.razorpayOrderId !== b.razorpay_order_id)
    return NextResponse.json({ error: 'Order mismatch' }, { status: 400 });
  const expected = crypto.createHmac('sha256', secret).update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`).digest('hex');
  const given = String(b.razorpay_signature || '');
  if (!/^[a-f0-9]{64}$/.test(given) || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given)))
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
  if (o.payment.status !== 'paid') {
    const response = await fetch(`https://api.razorpay.com/v1/payments/${b.razorpay_payment_id}`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64') },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);
    const payment = response?.ok ? await response.json().catch(() => null) : null;
    if (!payment) return NextResponse.json({ error: 'Payment verification unavailable' }, { status: 502 });
    if (payment.order_id !== o.payment.razorpayOrderId || payment.amount !== Math.round(o.total * 100) || payment.currency !== 'INR')
      return NextResponse.json({ error: 'Payment amount or order mismatch' }, { status: 400 });
    if (payment.status === 'authorized')
      return NextResponse.json({ error: 'Payment capture is pending' }, { status: 409 });
    if (payment.status !== 'captured')
      return NextResponse.json({ error: 'Payment has not been captured' }, { status: 400 });
    const updated = await updateOrder(o.id, (x) => {
      x.payment.status = 'paid'; x.payment.razorpayPaymentId = b.razorpay_payment_id; x.payment.paidAt = new Date().toISOString();
      x.status = 'Confirmed'; x.statusHistory.push({ status: 'Confirmed', at: new Date().toISOString() });
    });
    await reserveStock(updated.items); await notifyAdmin(updated);
  }
  return NextResponse.json({ ok: true, orderId: o.id, mobile: o.customer.mobile });
}

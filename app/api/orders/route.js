import { NextResponse } from 'next/server';
import { buildOrder, insertOrder, reserveStock, notifyAdmin } from '@/lib/orders';

export async function POST(req) {
  let body; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }
  const { order, errors } = buildOrder(body);
  if (errors) return NextResponse.json({ errors }, { status: 422 });

  if (order.payment.method === 'cod') {
    reserveStock(order.items); insertOrder(order); await notifyAdmin(order);
    return NextResponse.json({ orderId: order.id, mobile: order.customer.mobile, method: 'cod' });
  }

  // Online payment: create a Razorpay order; the order is NOT confirmed until the signature is verified.
  const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) return NextResponse.json({ errors: { payment: 'Online payment is not enabled yet. Please choose Cash on Delivery.' } }, { status: 503 });
  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64') },
    body: JSON.stringify({ amount: order.total * 100, currency: 'INR', receipt: order.id }),
  });
  if (!r.ok) return NextResponse.json({ errors: { payment: 'Could not start online payment. Please try again or choose COD.' } }, { status: 502 });
  const rz = await r.json();
  order.payment.razorpayOrderId = rz.id;
  insertOrder(order);
  return NextResponse.json({ orderId: order.id, mobile: order.customer.mobile, method: 'razorpay', razorpay: { keyId: key, orderId: rz.id, amount: rz.amount } });
}

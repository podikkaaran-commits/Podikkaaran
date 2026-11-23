import { NextResponse } from 'next/server';
import { getOrder } from '@/lib/db';
import { publicOrder } from '@/lib/orders';

export async function GET(req, { params }) {
  const mobile = (new URL(req.url).searchParams.get('mobile') || '').replace(/\D/g, '').slice(-10);
  const o = await getOrder(params.id.toUpperCase());
  if (!o || o.customer.mobile !== mobile) return NextResponse.json({ error: 'Order not found. Check the order ID and mobile number.' }, { status: 404 });
  return NextResponse.json(publicOrder(o));
}

'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { redirect, useSearchParams } from 'next/navigation';
import { rupee } from '@/lib/site';
import { trackPlacedOrder } from '@/lib/analytics';
import { checkoutStatus, paymentStatus } from '@/lib/order-status';
import OrderBadge from '@/components/OrderBadge';

function Order() {
  const sp = useSearchParams();
  const [o, setO] = useState(null), [err, setErr] = useState('');
  const isNew = sp.get('new') === '1';
  async function load(i, mm) {
    setErr(''); const r = await fetch(`/api/orders/${encodeURIComponent(i.trim())}?mobile=${mm}`); const j = await r.json();
    if (!r.ok) { setO(null); return setErr(j.error); }
    setO(j);

  }
  useEffect(() => { if (sp.get('id') && sp.get('m')) load(sp.get('id'), sp.get('m')).catch(() => setErr('Could not load your order. Please refresh to try again.')); }, []); // eslint-disable-line
  const showThanks = Boolean(isNew && o?.confirmed);
  useEffect(() => { if (showThanks) trackPlacedOrder(o); }, [showThanks, o]);
  if (!sp.get('id') || !sp.get('m')) redirect('/shop');
  return (
    <div className="wrap max-w-2xl py-10">
      {showThanks && <div className="mb-5 rounded-2xl bg-forest p-5 text-cream"><h1 className="!text-turmeric text-3xl">Thank you! Order placed 🎉</h1><p className="mt-1">Your order ID is <b>{o.id}</b>.</p></div>}
      {!o && (err ? <p className="err" role="alert">{err}</p> : <p role="status">Loading your order…</p>)}
      {o && <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Order <b>{o.id}</b></span><OrderBadge status={checkoutStatus(o)} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>{o.payment.method === 'cod' ? 'Cash on Delivery' : 'Online payment'}</span>
          {checkoutStatus(o).label !== paymentStatus(o.payment).label && <OrderBadge status={paymentStatus(o.payment)} />}
        </div>
        {o.confirmed && <p className="text-sm">Delivering to {o.city} · Delivery status: {o.status}</p>}
        <ul className="divide-y divide-brown/10 text-sm">{o.items.map((i, index) => <li key={i.slug + index} className="flex justify-between py-2"><span>{i.name} ({i.weight}) × {i.qty}{i.contents && <small className="block">{i.contents.map(p => p.name + ' ×' + p.qty).join(' · ')}</small>}</span><b>{rupee(i.price * i.qty)}</b></li>)}</ul>
        <div className="flex justify-between text-sm"><span>Product subtotal</span><span>{rupee(o.productSubtotal ?? o.subtotal)}</span></div>
        {o.productDiscount > 0 && <div className="flex justify-between text-sm"><span>Product discount</span><span>−{rupee(o.productDiscount)}</span></div>}
        {o.couponDiscount > 0 && <div className="flex justify-between text-sm"><span>Coupon discount</span><span>−{rupee(o.couponDiscount)}</span></div>}
        <div className="flex justify-between text-sm"><span>Delivery charges</span><span>{rupee(o.deliveryCharge)}</span></div>
        {o.freeDeliverySavings > 0 && <div className="flex justify-between text-sm"><span>Free delivery savings</span><span>{rupee(o.freeDeliverySavings)}</span></div>}
        <div className="flex justify-between border-t border-brown/10 pt-2 text-lg font-bold"><span>Total</span><span>{rupee(o.total)}</span></div>
        {o.tracking && <a className="underline" href={o.tracking} target="_blank" rel="noreferrer">Track delivery</a>}
        {o.confirmed && <p className="text-xs">Estimated delivery: 3–5 business days.</p>}<Link href="/shop" className="btn-outline">Continue shopping</Link></div>}
    </div>
  );
}
export default function Page() { return <Suspense fallback={<p className="wrap py-10">Loading…</p>}><Order /></Suspense>; }

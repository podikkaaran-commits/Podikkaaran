'use client';
import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import { zoneFor, chargeFor, ZONE_LABEL, PIN_RE } from '@/lib/delivery';
import { STATES, rupee } from '@/lib/site';
import { track, itemOf } from '@/lib/analytics';

const F = [['name', 'Full name', 'name', 'text'], ['mobile', 'Mobile number', 'tel', 'tel'], ['house', 'House / Flat number', 'address-line1', 'text'], ['street', 'Street address', 'address-line2', 'text'], ['area', 'Area', 'address-level3', 'text'], ['city', 'City', 'address-level2', 'text'], ['pincode', 'Pincode', 'postal-code', 'text']];

export default function Checkout() {
  const { lines, subtotal, blocked, settings, clear, ready, pin } = useCart(); const router = useRouter();
  const [f, setF] = useState({ name: '', mobile: '', house: '', street: '', area: '', city: '', state: 'Tamil Nadu', pincode: '' });
  const [selectedPayment, setPay] = useState(null), [errs, setErrs] = useState({}), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  useEffect(() => { if (pin && !f.pincode) setF((x) => ({ ...x, pincode: pin })); }, [pin]); // eslint-disable-line
  useEffect(() => { if (ready && lines.length) track('begin_checkout', { value: subtotal, items: lines.map((l) => itemOf(l, l.qty)) }); }, [ready]); // eslint-disable-line

  const pay = selectedPayment === 'cod' && settings.codEnabled ? 'cod'
    : selectedPayment === 'razorpay' && settings.onlinePayment ? 'razorpay'
    : settings.codEnabled ? 'cod' : settings.onlinePayment ? 'razorpay' : null;
  const zone = zoneFor(f, settings), delivery = PIN_RE.test(f.pincode) ? chargeFor(zone, settings) : null;
  const total = subtotal + (delivery ?? 0);
  const set = (k) => (e) => setF({ ...f, [k]: k === 'pincode' || k === 'mobile' ? e.target.value.replace(/\D/g, '') : e.target.value });

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name';
    if (!/^[6-9]\d{9}$/.test(f.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';

    for (const k of ['house', 'street', 'area', 'city']) if (!f[k].trim()) e[k] = 'Required';
    if (!PIN_RE.test(f.pincode)) e.pincode = 'Enter a valid 6-digit pincode';
    return e;
  };
  const trackPay = (m) => track('add_payment_info', { value: total, payment_type: m, items: lines.map((l) => itemOf(l, l.qty)) });
  const done = (id, mobile) => { clear(); router.push(`/order?id=${id}&m=${mobile}&new=1`); };

  async function submit(e) {
    e.preventDefault(); setMsg('');
    const v = validate(); setErrs(v); if (Object.keys(v).length) { document.getElementById('f-' + Object.keys(v)[0])?.focus(); return; }
    if (busy || blocked || !lines.length || !pay) return;
    setBusy(true); trackPay(pay);
    try {
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: f, items: lines.map((l) => ({ slug: l.slug, qty: l.qty })), paymentMethod: pay }) });
      const j = await r.json();
      if (!r.ok) { setErrs(j.errors || {}); setMsg(j.errors?.items || j.errors?.payment || j.error || 'Please correct the highlighted fields.'); setBusy(false); return; }
      if (j.method === 'cod') return done(j.orderId, j.mobile);
      const rz = new window.Razorpay({
        key: j.razorpay.keyId, amount: j.razorpay.amount, currency: 'INR', order_id: j.razorpay.orderId, name: 'PODIKKAARAN', description: `Order ${j.orderId}`,
        prefill: { name: f.name, contact: f.mobile },
        handler: async (resp) => {
          const v = await fetch('/api/payments/razorpay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...resp, orderId: j.orderId }) });
          if (v.ok) done(j.orderId, j.mobile); else { setMsg('We could not verify your payment. If money was deducted, contact us with order ID ' + j.orderId); setBusy(false); }
        },
        modal: { ondismiss: () => { setMsg('Payment was not completed, so your order is not confirmed.'); setBusy(false); } },
      });
      rz.open();
    } catch { setMsg('Network error. Please try again.'); setBusy(false); }
  }

  if (!ready) return <p className="wrap py-8" role="status">Loading checkout…</p>;
  if (!lines.length) return <div className="wrap py-16 text-center"><h1 className="text-3xl">Your cart is empty</h1><Link href="/shop" className="btn-primary mt-5">Shop podi</Link></div>;
  return (
    <div className="wrap py-8">
      {pay === 'razorpay' && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />}
      <h1 className="mb-5 text-3xl sm:text-4xl">Checkout</h1>
      <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-6">
          <section className="card p-5"><h2 className="mb-4 text-xl">Delivery details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {F.map(([k, l, ac, t]) => (
                <div key={k} className={k === 'street' ? 'sm:col-span-2' : ''}>
                  <label className="label" htmlFor={'f-' + k}>{l} *</label>
                  <input id={'f-' + k} className="input" type={t} autoComplete={ac} inputMode={['mobile', 'pincode'].includes(k) ? 'numeric' : undefined} maxLength={k === 'mobile' ? 10 : k === 'pincode' ? 6 : 120} value={f[k]} onChange={set(k)} aria-invalid={!!errs[k]} />
                  {errs[k] && <p className="err" role="alert">{errs[k]}</p>}
                </div>))}
              <div><label className="label" htmlFor="f-state">State *</label>
                <select id="f-state" className="input" value={f.state} onChange={set('state')}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
                {errs.state && <p className="err">{errs.state}</p>}</div>
            </div>
            {delivery !== null && <p className="mt-4 rounded-lg bg-forest/10 p-3 text-sm" role="status">🚚 {ZONE_LABEL[zone]}: delivery <b>{rupee(delivery)}</b> · {settings.deliveryTime}</p>}
          </section>
          <section className="card p-5"><h2 className="mb-3 text-xl">Payment method</h2>
            <div className="space-y-2">
              {settings.codEnabled && <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-brown/20 p-3 has-[:checked]:border-forest has-[:checked]:bg-cream"><input type="radio" name="pay" checked={pay === 'cod'} onChange={() => { setPay('cod'); trackPay('cod'); }} /><span><b>Cash on Delivery</b><br /><span className="text-xs">Pay in cash when your order arrives.</span></span></label>}
              <label className={`flex items-center gap-3 rounded-xl border border-brown/20 p-3 has-[:checked]:border-forest has-[:checked]:bg-cream ${settings.onlinePayment ? 'cursor-pointer' : 'opacity-60'}`}><input type="radio" name="pay" disabled={!settings.onlinePayment} checked={pay === 'razorpay'} onChange={() => { setPay('razorpay'); trackPay('razorpay'); }} /><span><b>Online Payment (UPI / Cards / Netbanking)</b><br /><span className="text-xs">{settings.onlinePayment ? 'Secure payment by Razorpay.' : 'Coming soon.'}</span></span></label>
            </div>
          </section>
        </div>
        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl">Order summary</h2><Link href="/cart" className="text-sm font-semibold underline">Edit cart</Link></div>
          <ul className="divide-y divide-brown/10 text-sm">{lines.map((l) => <li key={l.slug} className="flex justify-between gap-3 py-2"><span>{l.name} ({l.weight})<br /><b>Qty {l.qty}</b><br />{l.originalPrice > l.price ? (
            <span className="inline-flex flex-wrap items-baseline gap-2">
              <del className="text-xs"><span className="sr-only">Original price </span>{rupee(l.originalPrice)}</del>
              <strong className="text-forest">Offer price {rupee(l.price)} each</strong>
            </span>
          ) : <span className="text-xs">{rupee(l.price)} each</span>}{l.unavailable && <span className="err block">Unavailable – update cart</span>}</span><b>{rupee(l.price * l.qty)}</b></li>)}</ul>
          <div className="flex justify-between text-sm"><span>Subtotal</span><b>{rupee(subtotal)}</b></div>
          <div className="flex justify-between text-sm"><span>Delivery charges</span><b>{delivery === null ? 'Enter pincode' : rupee(delivery)}</b></div>
          <div className="flex justify-between border-t border-brown/10 pt-3 text-lg"><span>Grand total</span><b>{delivery === null ? 'Enter pincode' : rupee(total)}</b></div>
          <p className="text-xs">Delivery is charged once per order.</p>
          {!pay && <p className="err" role="status">Checkout is unavailable because no payment method is enabled.</p>}
          {msg && <p className="err text-sm" role="alert">{msg}</p>}
          {blocked && <p className="err">Some items are unavailable. <Link href="/cart" className="underline">Go to cart</Link></p>}
          <button className="btn-primary w-full py-3 text-base" disabled={busy || blocked || !pay}>{busy ? 'Placing order…' : !pay ? 'Checkout unavailable' : pay === 'cod' ? 'Place order · Cash on delivery' : delivery === null ? 'Continue to payment' : `Pay ${rupee(total)}`}</button>
        </aside>
      </form>
    </div>
  );
}

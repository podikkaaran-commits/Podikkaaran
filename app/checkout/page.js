'use client';
import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import { PIN_RE } from '@/lib/delivery';
import { STATES, rupee } from '@/lib/site';
import { track, itemOf } from '@/lib/analytics';
import ShippingProgress from '@/components/ShippingProgress';
import OrderPricing from '@/components/OrderPricing';
import CouponField from '@/components/CouponField';

const F = [['name', 'Full name', 'name', 'text'], ['mobile', 'Mobile number', 'tel', 'tel'], ['house', 'House / Flat number', 'address-line1', 'text'], ['street', 'Street address', 'address-line2', 'text'], ['area', 'Area', 'address-level3', 'text'], ['city', 'City', 'address-level2', 'text'], ['pincode', 'Pincode', 'postal-code', 'text']];

export default function Checkout() {
  const { lines, items, combos, coupon, subtotal, blocked, settings, clear, ready, pin, setPin, delivery, deliveryResult, retryDelivery } = useCart();
  const router = useRouter();
  const [f, setF] = useState({ name: '', mobile: '', house: '', street: '', area: '', city: '', state: 'Tamil Nadu' });
  const [selectedPayment, setPay] = useState(null), [errs, setErrs] = useState({}), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  const [awaitingOrder, setAwaitingOrder] = useState(null);
  useEffect(() => { if (ready && lines.length) track('begin_checkout', { value: subtotal, items: lines.map((l) => itemOf(l, l.qty)) }); }, [ready]); // eslint-disable-line

  const pay = selectedPayment === 'cod' && settings.codEnabled ? 'cod'
    : selectedPayment === 'razorpay' && settings.onlinePayment ? 'razorpay'
    : settings.codEnabled ? 'cod' : settings.onlinePayment ? 'razorpay' : null;
  const total = delivery?.total ?? subtotal;
  const set = (k) => (e) => {
    const value = e.target.value;
    if (k === 'pincode') {
      setPin(value.replace(/\D/g, ''));
      setErrs(previous => ({ ...previous, pincode: undefined }));
    } else {
      setF(previous => ({ ...previous, [k]: k === 'mobile' ? value.replace(/\D/g, '') : value }));
    }
  };

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name';
    if (!/^[6-9]\d{9}$/.test(f.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';

    for (const k of ['house', 'street', 'area', 'city']) if (!f[k].trim()) e[k] = 'Required';
    if (!PIN_RE.test(pin)) e.pincode = 'Enter a valid 6-digit pincode';
    return e;
  };
  const trackPay = (m) => track('add_payment_info', { value: total, payment_type: m, items: lines.map((l) => itemOf(l, l.qty)) });
  const done = (id, mobile) => { clear(); router.push(`/order?id=${id}&m=${mobile}&new=1`); };

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setMsg('');
    const v = validate(); setErrs(v); if (Object.keys(v).length) { document.getElementById('f-' + Object.keys(v)[0])?.focus(); return; }
    if (blocked || !lines.length || !pay || !delivery) return;
    if (pay === 'razorpay' && typeof window.Razorpay !== 'function') {
      setMsg('Payment checkout is loading. Please try again in a moment.');
      return;
    }
    setAwaitingOrder(null);
    setBusy(true); trackPay(pay);
    try {
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: { ...f, pincode: pin }, items, combos, coupon: coupon?.code, expectedTotal: total, paymentMethod: pay }) });
      const j = await r.json();
      if (!r.ok) { setErrs(j.errors || {}); setMsg(j.errors?.items || j.errors?.coupon || j.errors?.payment || j.error || 'Please correct the highlighted fields.'); setBusy(false); return; }
      if (j.method === 'cod') return done(j.orderId, j.mobile);
      let verificationStarted = false;
      const rz = new window.Razorpay({
        key: j.razorpay.keyId, amount: j.razorpay.amount, currency: 'INR', order_id: j.razorpay.orderId, name: 'PODIKKAARAN', description: `Order ${j.orderId}`,
        prefill: { name: f.name, contact: f.mobile },
        handler: async (resp) => {
          verificationStarted = true;
          const request = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...resp, orderId: j.orderId }) };
          for (let attempt = 0; attempt < 4; attempt += 1) {
            const verification = await fetch('/api/payments/razorpay/verify', request).catch(() => null);
            if (verification?.ok) return done(j.orderId, j.mobile);
            if (verification && verification.status !== 409) break;
            if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1500));
          }
          setMsg('Payment confirmation is unavailable. If money was deducted, contact us with order ID ' + j.orderId);
          setBusy(false);
        },
        modal: { ondismiss: () => {
          if (verificationStarted) return;
          setAwaitingOrder(`/order?id=${j.orderId}&m=${j.mobile}`);
          setBusy(false);
        } },
      });
      rz.open();
    } catch { setMsg('Network error. Please try again.'); setBusy(false); }
  }

  if (!ready) return <p className="wrap py-8" role="status">Loading checkout…</p>;
  if (!lines.length) return <div className="wrap py-16 text-center"><h1 className="text-3xl">Your cart is empty</h1><Link href="/shop" className="btn-primary mt-5">Shop podi</Link></div>;
  return (
    <div className="wrap py-8">
      {pay === 'razorpay' && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />}
      <h1 className="mb-5 text-3xl sm:text-4xl">Checkout</h1>
      <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-6">
          <section className="card p-5"><h2 className="mb-4 text-xl">Delivery details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {F.map(([k, l, ac, t]) => (
                <div key={k} className={k === 'street' ? 'sm:col-span-2' : ''}>
                  <label className="label" htmlFor={'f-' + k}>{l} *</label>
                  <input id={'f-' + k} className="input" type={t} autoComplete={ac} inputMode={['mobile', 'pincode'].includes(k) ? 'numeric' : undefined} maxLength={k === 'mobile' ? 10 : k === 'pincode' ? 6 : 120} value={k === 'pincode' ? pin : f[k]} onChange={set(k)} aria-invalid={!!errs[k]} />
                  {errs[k] && <p className="err" role="alert">{errs[k]}</p>}
                </div>))}
              <div><label className="label" htmlFor="f-state">State *</label>
                <select id="f-state" className="input" value={f.state} onChange={set('state')}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
                {errs.state && <p className="err">{errs.state}</p>}</div>
            </div>
            {delivery && <p className="mt-4 rounded-lg bg-forest/10 p-3 text-sm" role="status">🚚 {delivery.charge === 0 ? 'Free delivery' : 'Delivery ' + rupee(delivery.charge)} · {deliveryResult.rule.deliveryTime}</p>}
            {deliveryResult?.rule?.available === false && <p className="err mt-3" role="alert">Delivery is unavailable for this pincode.</p>}
            {deliveryResult?.error && <p className="err mt-3" role="alert">{deliveryResult.error} <button type="button" className="underline" onClick={retryDelivery}>Retry</button></p>}
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
          <ul className="divide-y divide-brown/10 text-sm">{lines.map((l) => <li key={l.id} className="flex justify-between gap-3 py-2"><span>{l.name} ({l.weight})<br /><b>Qty {l.qty}</b><br />{l.contents && <span className="block text-xs">{l.contents.map(i => i.name + ' ×' + i.qty).join(' · ')}</span>}{l.originalPrice > l.price ? (
            <span className="inline-flex flex-wrap items-baseline gap-2">
              <del className="text-xs"><span className="sr-only">Original price </span>{rupee(l.originalPrice)}</del>
              <strong className="text-forest">Offer price {rupee(l.price)} each</strong>
            </span>
          ) : <span className="text-xs">{rupee(l.price)} each</span>}{l.unavailable && <span className="err block">Unavailable – update cart</span>}</span><b>{rupee(l.price * l.qty)}</b></li>)}</ul>
          <ShippingProgress />
          <CouponField />
          <OrderPricing />
          <p className="text-xs">Delivery is charged once per order.</p>
          {!pay && <p className="err" role="status">Checkout is unavailable because no payment method is enabled.</p>}
          {awaitingOrder && <p className="rounded-lg bg-turmeric/20 p-3 text-sm" role="status">
            <strong>Awaiting payment.</strong> Your cart is still here. <Link href={awaitingOrder} className="underline">View payment status</Link>
          </p>}
          {msg && <p className="err text-sm" role="alert">{msg}</p>}
          {blocked && <p className="err">Some items are unavailable. <Link href="/cart" className="underline">Go to cart</Link></p>}
          <button className="btn-primary w-full py-3 text-base" disabled={busy || blocked || !pay || !delivery}>{busy ? 'Placing order…' : !pay ? 'Checkout unavailable' : pay === 'cod' ? 'Place order · Cash on delivery' : delivery ? `Pay ${rupee(total)}` : 'Continue to payment'}</button>
        </aside>
      </form>
    </div>
  );
}

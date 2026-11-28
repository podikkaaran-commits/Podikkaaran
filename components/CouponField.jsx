'use client';

import { useId, useState } from 'react';
import { useCart } from '@/components/CartProvider';
import { couponCode } from '@/lib/shipping';

export default function CouponField() {
  const id = useId();
  const { coupon, setCoupon } = useCart();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function apply() {
    if (!couponCode(code) || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/coupon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not apply coupon.');
      setCoupon(data.coupon);
      setCode('');
    } catch (e) {
      setError(e.message || 'Could not apply coupon.');
    } finally {
      setBusy(false);
    }
  }

  return <div>
    {coupon ? <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p role="status"><strong>{coupon.code}</strong> applied</p>
      <button type="button" className="underline" onClick={() => setCoupon(null)}>Remove coupon</button>
    </div> : <>
      <label htmlFor={id} className="label">Coupon code</label>
      <div className="flex gap-2">
        <input id={id} className="input min-w-0" value={code} maxLength={30} onChange={event => setCode(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); apply(); } }} />
        <button type="button" className="btn-outline shrink-0" disabled={busy || !couponCode(code)} onClick={apply}>{busy ? 'Applying…' : 'Apply'}</button>
      </div>
    </>}
    {error && <p className="err" role="alert">{error}</p>}
  </div>;
}

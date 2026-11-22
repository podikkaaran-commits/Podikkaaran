'use client';
import { useState } from 'react';
import { useCart } from '@/components/CartProvider';
import { rupee } from '@/lib/site';

export default function DeliveryChecker({ className = '' }) {
  const { pin: saved, setPin } = useCart();
  const [pin, setP] = useState(saved || ''), [res, setRes] = useState(null), [busy, setBusy] = useState(false);
  const check = async (e) => {
    e.preventDefault(); setBusy(true);
    const r = await fetch(`/api/pincode?pin=${encodeURIComponent(pin)}`); const j = await r.json();
    setRes(j); setBusy(false); if (j.ok) setPin(pin);
  };
  return (
    <form onSubmit={check} className={className}>
      <label htmlFor="pc" className="label">Check delivery to your pincode</label>
      <div className="flex gap-2">
        <input id="pc" className="input" inputMode="numeric" maxLength={6} placeholder="e.g. 600107" value={pin} onChange={(e) => setP(e.target.value.replace(/\D/g, ''))} />
        <button className="btn-primary" disabled={busy}>{busy ? '…' : 'Check'}</button>
      </div>
      {res && (res.ok
        ? <p className="mt-2 rounded-lg bg-forest/10 p-2 text-sm" role="status">✔ Delivery available · {res.zoneLabel}: <b>{rupee(res.charge)}</b> delivery (once per order) · {res.deliveryTime}{res.cod ? ' · COD available' : ''}</p>
        : <p className="err" role="alert">{res.message}</p>)}
    </form>
  );
}

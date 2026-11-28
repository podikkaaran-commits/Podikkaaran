'use client';
import { useId } from 'react';
import { useCart } from '@/components/CartProvider';
import { PIN_RE } from '@/lib/delivery';

export default function DeliveryChecker({ className = '' }) {
  const id = useId();
  const { pin, setPin, deliveryResult, retryDelivery } = useCart();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">Delivery pincode</label>
      <input id={id} className="input" inputMode="numeric" autoComplete="postal-code" maxLength={6}
        value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))} />
      {PIN_RE.test(pin) && !deliveryResult && <p className="mt-1 text-sm" role="status">Checking delivery…</p>}
      {deliveryResult?.rule?.available === false && <p className="err" role="alert">Delivery is unavailable for this pincode.</p>}
      {deliveryResult?.error && <p className="err" role="alert">{deliveryResult.error} <button type="button" onClick={retryDelivery} className="underline">Retry</button></p>}
    </div>
  );
}

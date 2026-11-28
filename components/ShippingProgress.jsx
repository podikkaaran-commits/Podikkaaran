'use client';

import { useCart } from '@/components/CartProvider';
import { PIN_RE } from '@/lib/delivery';
import { rupee } from '@/lib/site';

export default function ShippingProgress() {
  const { settings, delivery, deliveryResult, pin, subtotal } = useCart();
  if (delivery?.remaining == null && (!settings.freeDeliveryEnabled || deliveryResult)) return null;

  const minimum = deliveryResult?.rule?.minimum;
  const progress = minimum ? Math.min(100, Math.round(subtotal / minimum * 100)) : 0;
  const message = !delivery
    ? (PIN_RE.test(pin) ? 'Checking free delivery for your pincode…' : 'Enter your pincode to see how to unlock FREE Delivery.')
    : delivery.remaining === 0 ? 'Congratulations! You’ve unlocked FREE Delivery.'
      : 'You’re just ' + rupee(delivery.remaining) + ' away from FREE Delivery!';
  return <div className="space-y-2 rounded-lg bg-forest/10 p-3 text-sm text-forest">
    <p className="font-semibold" aria-live="polite">{message}</p>
    <div className="h-2 overflow-hidden rounded-full bg-forest/15" role="progressbar" aria-label="Free delivery progress" aria-valuenow={progress}>
      <div className="h-full rounded-full bg-forest" style={{ width: progress + '%' }} />
    </div>
  </div>;
}

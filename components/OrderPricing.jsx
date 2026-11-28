'use client';

import { useCart } from '@/components/CartProvider';
import { PIN_RE } from '@/lib/delivery';
import { rupee } from '@/lib/site';

export default function OrderPricing() {
  const { productSubtotal, productDiscount, couponDiscount, delivery, deliveryResult, pin } = useCart();
  const deliveryLabel = delivery
    ? (delivery.charge === 0 ? 'FREE' : rupee(delivery.charge))
    : deliveryResult?.rule?.available === false ? 'Unavailable'
      : deliveryResult?.error ? 'Try again'
        : PIN_RE.test(pin) ? 'Checking…' : 'Enter pincode';
  const rows = [
    ['Product subtotal', rupee(productSubtotal)],
    ['Product discount', productDiscount ? '−' + rupee(productDiscount) : rupee(0)],
    ['Coupon discount', couponDiscount ? '−' + rupee(couponDiscount) : rupee(0)],
    ['Delivery charge', deliveryLabel],
    ...(delivery?.savings > 0 ? [['Free delivery savings', rupee(delivery.savings)]] : []),
  ];
  return <dl className="space-y-2">
    {rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 text-sm"><dt>{label}</dt><dd className="text-right font-bold">{value}</dd></div>)}
    <div className="flex justify-between gap-3 border-t border-brown/10 pt-3 text-lg"><dt>Final payable amount</dt><dd className="text-right font-bold">{delivery ? rupee(delivery.total) : '—'}</dd></div>
  </dl>;
}

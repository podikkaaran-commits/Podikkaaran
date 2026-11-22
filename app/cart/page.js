'use client';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import CartLines from '@/components/CartLines';
import DeliveryChecker from '@/components/DeliveryChecker';
import { rupee } from '@/lib/site';
import { useEffect, useState } from 'react';

export default function CartPage() {
  const { count, subtotal, blocked, pin, settings } = useCart();
  const [d, setD] = useState(null);
  useEffect(() => { if (/^\d{6}$/.test(pin)) fetch(`/api/pincode?pin=${pin}`).then((r) => r.json()).then((j) => setD(j.ok ? j : null)); }, [pin]);
  return (
    <div className="wrap py-8">
      <h1 className="mb-5 text-3xl sm:text-4xl">Shopping Cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="card p-4"><CartLines /></div>
        <aside className="card h-fit space-y-3 p-5">
          <h2 className="text-xl">Order summary</h2>
          <div className="flex justify-between"><span>Subtotal</span><b>{rupee(subtotal)}</b></div>
          <div className="flex justify-between"><span>Delivery</span><b>{d ? rupee(d.charge) : 'Based on pincode'}</b></div>
          <div className="flex justify-between border-t border-brown/10 pt-3 text-lg"><span>Grand total</span><b>{d ? rupee(subtotal + d.charge) : rupee(subtotal) + ' + delivery'}</b></div>
          <p className="text-xs">Delivery: {rupee(settings.deliveryChennai)} Chennai · {rupee(settings.deliveryTN)} rest of Tamil Nadu · {rupee(settings.deliveryOther)} other states. Charged once per order. No hidden charges. 🚚 Delivery Available Across India · {settings.deliveryTime}{settings.codEnabled && ' · COD available'}</p>
          <DeliveryChecker />
          {blocked && <p className="err" role="alert">Remove or reduce unavailable items to continue.</p>}
          {count > 0 && (blocked ? <button className="btn-primary w-full" disabled>Proceed to Checkout</button> : <Link href="/checkout" className="btn-primary w-full">Proceed to Checkout</Link>)}
          <Link href="/shop" className="block text-center text-sm underline">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}

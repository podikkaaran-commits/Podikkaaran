'use client';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import CartLines from '@/components/CartLines';
import { rupee } from '@/lib/site';

export default function CartPage() {
  const { count, subtotal, blocked, ready } = useCart();
  if (!ready) return <p className="wrap py-8" role="status">Loading cart…</p>;
  return (
    <div className="wrap py-8">
      <h1 className="mb-5 text-3xl sm:text-4xl">My Cart</h1>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="card p-4"><CartLines /></div>
        <aside className="card h-fit space-y-3 p-5">
          <h2 className="text-xl">Order summary</h2>
          <div className="flex justify-between"><span>Subtotal</span><b>{rupee(subtotal)}</b></div>
          <div className="flex justify-between"><span>Delivery</span><b>Calculated at checkout</b></div>
          <div className="flex justify-between border-t border-brown/10 pt-3 text-lg"><span>Grand total</span><b>{rupee(subtotal)} + delivery</b></div>
          {blocked && <p className="err" role="alert">Remove or reduce unavailable items to continue.</p>}
          {count > 0 && (blocked ? <button className="btn-primary w-full" disabled>Proceed to Checkout</button> : <Link href="/checkout" className="btn-primary w-full">Proceed to Checkout</Link>)}
          <Link href="/shop" className="block text-center text-sm underline">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}

'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { rupee } from '@/lib/site';

export function QtyStepper({ qty, onChange, max = 50, small }) {
  const b = `grid place-items-center rounded-full border border-forest/40 text-forest hover:bg-cream disabled:opacity-40 ${small ? 'h-7 w-7' : 'h-9 w-9'}`;
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label="Quantity">
      <button type="button" className={b} onClick={() => onChange(qty - 1)} aria-label="Decrease quantity">−</button>
      <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
      <button type="button" className={b} onClick={() => onChange(qty + 1)} disabled={qty >= max} aria-label="Increase quantity">+</button>
    </div>
  );
}

export default function CartLines({ compact }) {
  const { lines, setQty, remove } = useCart();
  if (!lines.length) return <p className="py-8 text-center text-sm">Your cart is empty. <Link className="font-semibold text-forest underline" href="/shop">Browse podi</Link></p>;
  return (
    <ul className="divide-y divide-brown/10">
      {lines.map((l) => (
        <li key={l.slug} className="flex gap-3 py-4">
          <Link href={`/products/${l.slug}`} className="shrink-0"><Image src={l.images[0]} alt={l.name} width={72} height={96} className="h-24 w-[72px] rounded-lg bg-white object-contain ring-1 ring-brown/10" /></Link>
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-forest">{l.name}</p>
            <p className="text-xs">{l.weight} · {rupee(l.price)}</p>
            {l.unavailable && <p className="err">{l.stock <= 0 ? 'Out of stock – remove to continue' : `Only ${l.stock} left – reduce quantity`}</p>}
            <div className="mt-2 flex items-center justify-between">
              <QtyStepper small={compact} qty={l.qty} max={Math.max(l.stock, 1)} onChange={(q) => setQty(l.slug, q)} />
              <span className="font-semibold">{rupee(l.price * l.qty)}</span>
            </div>
            <button onClick={() => remove(l.slug)} className="mt-1 text-xs text-red-700 underline">Remove</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

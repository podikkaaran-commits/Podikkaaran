'use client';
import Image from '@/components/StoreImage';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { rupee } from '@/lib/site';

export function QtyStepper({ qty, onChange, max = 50, small }) {
  const b = `grid place-items-center rounded-full border border-forest/40 text-forest hover:bg-cream disabled:opacity-40 ${small ? 'h-10 w-10' : 'h-11 w-11'}`;
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label="Quantity">
      <button type="button" className={b} disabled={qty < 1} onClick={() => onChange(qty - 1)} aria-label="Decrease quantity">−</button>
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
        <li key={l.id} className="flex gap-3 py-4">
          <Link href={l.combo ? `/combos/${l.slug}?edit=${l.id}` : `/products/${l.slug}`} className="shrink-0">{l.images[0] && <Image src={l.images[0]} alt={l.name} width={72} height={96} className="h-24 w-[72px] rounded-lg bg-white object-contain ring-1 ring-brown/10" />}</Link>
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-forest">{l.name}</p>
            <p className="text-xs">{l.weight}{l.price > 0 && ' · ' + rupee(l.price)}</p>
            {l.contents && <p className="mt-1 text-xs">{l.contents.map(i => i.name + ' ×' + i.qty).join(' · ')}</p>}
            {l.savings > 0 && <p className="text-xs"><del>{rupee(l.originalPrice)}</del> · Save {rupee(l.savings)} per combo</p>}
            {l.unavailable && <p className="err">Unavailable at this quantity. Edit or remove to continue.</p>}
            {l.combo && <Link className="text-xs underline" href={`/combos/${l.slug}?edit=${l.id}`}>Edit combo</Link>}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <QtyStepper small={compact} qty={l.qty} max={Math.max(l.stock, 1)} onChange={(q) => setQty(l.id, q)} />
              <span className="font-semibold">{rupee(l.price * l.qty)}</span>
            </div>
            <button onClick={() => remove(l.id)} className="mt-1 text-xs text-red-700 underline">Remove</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

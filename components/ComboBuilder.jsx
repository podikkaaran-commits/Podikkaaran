'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from '@/components/StoreImage';
import { useCart } from '@/components/CartProvider';
import { QtyStepper } from '@/components/CartLines';
import { eligibleProducts, grams, quoteCombo } from '@/lib/combos';
import { rupee } from '@/lib/site';

export default function ComboBuilder({ combo }) {
  const cart = useCart();
  const params = useSearchParams();
  const id = params.get('edit');
  const entry = cart.combos.find(c => c.id === id && c.slug === combo.slug);
  if (!cart.ready) return <p role="status">Loading combo…</p>;
  return <Selection key={entry?.id || 'new'} combo={combo} entry={entry} buyFirst={params.get('intent') === 'buy'} />;
}

function Selection({ combo, entry, buyFirst }) {
  const { products, addCombo } = useCart();
  const router = useRouter();
  const fixed = combo.type === 'fixed';
  const [selected, setSelected] = useState(entry?.selection || {});
  const selection = fixed ? combo.products : selected;
  const eligible = eligibleProducts(combo, products).filter(p => p.stock > 0);
  const count = Object.values(selection).reduce((sum, qty) => sum + qty, 0);
  const weight = eligible.reduce((sum, p) => sum + grams(p.weight) * (selection[p.slug] || 0), 0);
  const original = eligible.reduce((sum, p) => sum + p.price * (selection[p.slug] || 0), 0);
  const quote = quoteCombo(combo, selection, products);
  function change(slug, qty) {
    setSelected(current => {
      const next = { ...current, [slug]: qty };
      if (qty < 1) delete next[slug];
      return next;
    });
  }
  function save(buy) {
    if (!quote) return;
    addCombo(combo, quote, entry?.id, buy || !!entry);
    if (buy || entry) router.push('/cart');
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <ul className="grid gap-3 sm:grid-cols-2">
        {eligible.map(p => {
          const qty = selection[p.slug] || 0;
          return <li className="card flex items-center gap-3 p-3" key={p.slug}>
            <Image src={p.images[0]} alt={p.name} width={72} height={88} className="h-[88px] w-[72px] shrink-0 object-contain" />
            <div className="min-w-0"><h2 className="text-lg">{p.name}</h2><p className="text-xs">{p.weight} · {rupee(p.price)} · {p.stock} in stock</p>
              <div className="mt-2">{fixed ? 'Qty ' + qty : <QtyStepper qty={qty} max={Math.min(p.stock, qty + combo.packs - count)} onChange={q => change(p.slug, q)} />}</div>
            </div>
          </li>;
        })}
      </ul>
      <aside className="card h-fit space-y-3 p-4">
        <h2 className="text-xl">Your selection</h2>
        <p aria-live="polite">{count} of {combo.packs} packs selected · {weight}g</p>
        <ul className="text-sm">{Object.entries(selection).map(([slug, qty]) => <li key={slug}>{products.find(p => p.slug === slug)?.name || slug} ×{qty}
          {!fixed && !eligible.some(p => p.slug === slug) && <button className="ml-2 underline" onClick={() => change(slug, 0)}>Remove</button>}</li>)}</ul>
        <p>Individual value <b>{rupee(original)}</b></p>
        {quote && <p>Offer price <b>{rupee(quote.price)}</b> · Save {rupee(quote.savings)}</p>}
        {!quote && count === combo.packs && <p className="err">This selection is unavailable or does not qualify for a discount.</p>}
        <button className={(buyFirst && !entry ? 'btn-outline' : 'btn-primary') + ' w-full'} disabled={!quote} onClick={() => save(false)}>{entry ? 'Save changes' : 'Add to Cart'}</button>
        {!entry && <button className={(buyFirst ? 'btn-primary' : 'btn-outline') + ' w-full'} disabled={!quote} onClick={() => save(true)}>Buy Now</button>}
      </aside>
    </div>
  );
}

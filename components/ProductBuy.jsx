'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import { QtyStepper } from '@/components/CartLines';
import DeliveryChecker from '@/components/DeliveryChecker';
import { track, itemOf } from '@/lib/analytics';
import { rupee } from '@/lib/site';

export default function ProductBuy({ p }) {
  const { add, settings } = useCart(); const router = useRouter();
  const [qty, setQty] = useState(1), [img, setImg] = useState(0);
  const out = p.stock <= 0;
  useEffect(() => { track('view_item', { value: p.price, items: [itemOf(p)] }); }, [p]);
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-cream">
          <Image src={p.images[img]} alt={`${p.name} - image ${img + 1}`} fill priority sizes="(max-width:768px) 100vw,520px" className={`fade-in ${img === 0 ? 'object-contain p-4 mix-blend-multiply' : 'object-cover'}`} key={img} />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {p.images.map((s, i) => (
            <button key={s} onClick={() => setImg(i)} aria-label={`Show image ${i + 1}`} className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-cream ring-2 ${i === img ? 'ring-forest' : 'ring-transparent'}`}><Image src={s} alt="" fill sizes="64px" className="object-cover" /></button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm">{p.tamilName}</p>
        <h1 className="text-3xl sm:text-4xl">{p.name}</h1>
        <p className="mt-2 text-3xl font-bold">{rupee(p.price)} <span className="text-base font-normal">/ {p.weight} · inclusive of taxes</span></p>
        <p className={`mt-1 text-sm font-semibold ${out ? 'text-red-700' : 'text-forest'}`}>{out ? 'Out of stock' : p.stock <= 10 ? `Only ${p.stock} left` : 'In stock'}</p>
        <p className="mt-3">{p.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <QtyStepper qty={qty} max={Math.max(1, Math.min(p.stock, 50))} onChange={(q) => setQty(Math.max(1, q))} />
          <button className="btn-primary" disabled={out} onClick={() => add(p.slug, qty)}>Add to Cart</button>
          <button className="btn-accent" disabled={out} onClick={() => { if (add(p.slug, qty, { silent: true })) router.push('/checkout'); }}>Buy Now</button>
        </div>
        <ul className="mt-5 space-y-1 rounded-xl bg-cream p-4 text-sm">
          <li>🚚 <b>Delivery Available Across India</b> · {settings.deliveryTime}</li>
          <li>Delivery charges (once per order): Chennai {rupee(settings.deliveryChennai)} · Rest of Tamil Nadu {rupee(settings.deliveryTN)} · Other states {rupee(settings.deliveryOther)}</li>
          {settings.codEnabled && <li>💵 Cash on Delivery available</li>}
        </ul>
        <DeliveryChecker className="mt-4" />
        <div className="mt-6 space-y-3 text-sm">
          <section><h2 className="text-lg">Ingredients</h2><p>{p.ingredients}</p></section>
          <section><h2 className="text-lg">How to enjoy</h2><ul className="list-disc pl-5">{p.usage.map((u) => <li key={u}>{u}</li>)}</ul></section>
          <section><h2 className="text-lg">Storage instructions</h2><p>{p.storage}</p></section>
        </div>
      </div>
    </div>
  );
}

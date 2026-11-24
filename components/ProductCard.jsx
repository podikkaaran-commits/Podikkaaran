'use client';
import ProductPrice from '@/components/ProductPrice';
import Link from 'next/link';
import Image from '@/components/StoreImage';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';

export default function ProductCard({ p, delay = 0 }) {
  const { add, ready } = useCart(); const router = useRouter();
  const [quick, setQuick] = useState(false);
  const out = p.stock <= 0;
  const buyNow = () => { if (add(p.slug, 1, { silent: true })) router.push('/cart'); };
  return (
    <article className="card lift group flex flex-col overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <Link href={`/products/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-cream" aria-label={p.name}>
        <Image src={p.images[0]} alt={`${p.name} ${p.weight} pouch - PODIKKAARAN`} fill sizes="(max-width:640px) 90vw,(max-width:1024px) 45vw,360px" className="object-contain p-3 mix-blend-multiply " />
        {p.badge && <span className="absolute left-3 top-3 rounded-full bg-turmeric px-3 py-1 text-xs font-bold">{p.badge}</span>}
        {out && <span className="absolute right-3 top-3 rounded-full bg-brown px-3 py-1 text-xs font-bold text-cream">Out of stock</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-semibold"><Link href={`/products/${p.slug}`}>{p.name}</Link></h3>
        <p className="text-xs">{p.tamilName} · {p.weight}</p>
        <p className="mt-1 text-xl font-bold"><ProductPrice product={p} /></p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="btn-primary" disabled={out || !ready} onClick={() => add(p.slug, 1)}>Add to Cart</button>
          <button className="btn-accent" disabled={out || !ready} onClick={buyNow}>Buy Now</button>
        </div>
        <button onClick={() => setQuick(true)} className="mt-2 text-sm font-semibold text-forest underline">Quick view</button>
      </div>
      {quick && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={`${p.name} quick view`}>
          <div className="fade-in absolute inset-0 bg-black/50" onClick={() => setQuick(false)} />
          <div className="fade-in relative grid max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white sm:grid-cols-2">
            <div className="relative aspect-square bg-cream"><Image src={p.images[1] || p.images[0]} alt={p.name} fill sizes="400px" className="object-contain" /></div>
            <div className="p-5">
              <button onClick={() => setQuick(false)} className="float-right rounded-full p-1" aria-label="Close">✕</button>
              <h3 className="text-2xl">{p.name}</h3><p className="text-lg font-bold"><ProductPrice product={p} /> · {p.weight}</p>
              <p className="mt-2 text-sm">{p.description}</p>
              <p className="mt-2 text-xs"><b>Ingredients:</b> {p.ingredients}</p>
              <div className="mt-4 flex gap-2"><button className="btn-primary" disabled={out || !ready} onClick={() => { add(p.slug, 1); setQuick(false); }}>Add to Cart</button><Link href={`/products/${p.slug}`} className="btn-outline">Full details</Link></div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

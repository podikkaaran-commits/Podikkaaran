import ProductPrice from '@/components/ProductPrice';
import Link from 'next/link';
import Image from 'next/image';
import StoreImage from '@/components/StoreImage';
import curryHero from '../public/images/curry-hero.webp';
import moringaHero from '../public/images/moringa-hero.webp';
import paruppuHero from '../public/images/paruppu-hero.webp';
import { getProducts, getSettings } from '@/lib/storefront';
import { rupee, SITE, fullAddress, mapsLink } from '@/lib/site';
import { FAQ, faqSchema } from '@/lib/schema';
import { POSTS } from '@/lib/blog';
import ProductGrid from '@/components/ProductGrid';
import Reveal from '@/components/Reveal';
import JsonLd from '@/components/JsonLd';

import ComboOffers from '@/components/ComboOffers';

export const dynamic = 'force-dynamic';
export const metadata = { alternates: { canonical: '/' } };

const REVIEWS = [
  { name: 'Prasanna .p', rating: 5, text: 'Good product very tasty 🤤😋' },
  { name: 'kamesh mhs', rating: 5, text: 'I ALREADY PURCHASED THREE PRODUVTS AND ITS VERY FANTASTIC' },
];

const WHY = [['🏡', 'Homemade Taste', 'Small-batch podi made the way it is made at home.'], ['🌿', 'Carefully Selected Ingredients', 'Curry leaves, moringa leaves, dals and spices – listed in full on every pack.'], ['🚫', 'No Added Preservatives', 'As stated on our packaging.'], ['🎨', 'No Added Colours', 'As stated on our packaging.']];
const LEAVES = [['4%', '8%', '-20deg', '0s'], ['90%', '14%', '30deg', '1.2s'], ['8%', '70%', '15deg', '2s'], ['86%', '76%', '-35deg', '.6s']];

export default async function Home() {
  const [catalogue, s] = await Promise.all([getProducts(), getSettings()]);
  const products = catalogue.filter(p => p.active), faq = FAQ(s);
  return (
    <>
      <JsonLd data={faqSchema(s)} />
      <section className="relative overflow-hidden bg-gradient-to-br from-[#fff8e8] via-[#f6e8c7] to-[#dae8ba]">
        {LEAVES.map(([l, t, r, d], i) => <span key={i} aria-hidden="true" className="leaf pointer-events-none absolute hidden text-4xl opacity-60 md:block" style={{ left: l, top: t, '--r': r, '--d': d }}>🌿</span>)}
        <div className="wrap grid items-center gap-5 py-8 sm:gap-8 sm:py-12 md:grid-cols-2 md:py-20">
          <div>
            <p className="font-semibold">{SITE.tagline} · {SITE.tagline2}</p>
            <h1 className="mt-3 text-5xl leading-[1.02] tracking-tight sm:text-6xl">Homemade podi.<br />Ready for hot rice.</h1>
            <p className="mt-4 max-w-md text-lg">Pick curry leaf, moringa or paruppu podi. Mix a spoonful into hot rice with ghee, or serve it alongside idli and dosa.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Link href="/shop" className="btn-primary px-7 py-3 text-base">Shop Now</Link><Link href="#categories" className="btn-outline px-7 py-3 text-base">Browse flavours</Link></div>
            <p className="mt-5 text-sm font-semibold">🚚 Delivery Available Across India · {s.deliveryTime}{s.codEnabled && ' · COD available'}</p>
            <p className="text-sm">{products[0] && <><ProductPrice product={products[0]} /> per {products[0].weight} pack</>} · Delivery {rupee(s.deliveryChennai)} Chennai / {rupee(s.deliveryTN)} Tamil Nadu / {rupee(s.deliveryOther)} other states</p>
          </div>
          <div className="relative mx-auto flex h-[260px] w-full max-w-md items-center justify-center sm:h-[420px] sm:items-end" aria-label="PODIKKAARAN Curry Leaf, Moringa and Paruppu podi pouches">
            <span aria-hidden="true" className="pointer-events-none absolute right-1 top-1 rotate-12 select-none text-2xl opacity-60 md:hidden">🌿</span>
            <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1 -rotate-12 select-none text-2xl opacity-60 md:hidden">🌿</span>
            {[[curryHero, 'Curry Leaf Podi pouch', '-rotate-6 translate-x-6 z-10', '.1s'], [moringaHero, 'Moringa Podi pouch', 'z-20 scale-110', '.35s'], [paruppuHero, 'Paruppu Podi pouch', 'rotate-6 -translate-x-6 z-10', '.6s']].map(([src, alt, cls, d]) => (
              <div key={src.src} className={`pouch relative h-[230px] w-[34%] sm:h-[340px] ${cls}`} style={{ '--d': d }}><Image src={src} alt={alt} fill priority unoptimized sizes="180px" className="object-contain mix-blend-multiply drop-shadow-xl" /></div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream py-14"><div className="wrap"><Reveal><h2 className="text-3xl">New Arrivals</h2></Reveal><div className="mt-6"><ProductGrid products={products} /></div></div></section>

      <ComboOffers settings={s} products={products} />

      <section id="categories" className="wrap scroll-mt-24 py-14"><Reveal><h2 className="text-3xl">Shop by Category</h2><p className="mt-1">Three everyday podis, one for every plate.</p></Reveal>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {products.map((p, i) => (
            <Reveal key={p.slug} delay={i * 80}><Link href={`/products/${p.slug}`} className="card lift group block overflow-hidden">
              <div className="relative aspect-[4/3]"><StoreImage src={p.images[1] || p.images[0]} alt={`${p.name} in a bowl`} fill sizes="(max-width:640px) 100vw,360px" className="object-cover transition duration-500 group-hover:scale-105" /></div>
              <div className="p-4"><h3 className="text-xl">{p.name}</h3><p className="text-sm">{p.short}</p><span className="btn-outline mt-3">Explore</span></div>
            </Link></Reveal>
          ))}
        </div></section>

      <section className="wrap py-14"><Reveal><h2 className="text-center text-3xl">Why Choose PODIKKAARAN</h2></Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{WHY.map(([i, t, d], k) => <Reveal key={t} delay={k * 80} className="card p-6 text-center"><div className="text-4xl">{i}</div><h3 className="mt-2 text-lg">{t}</h3><p className="mt-1 text-sm">{d}</p></Reveal>)}</div></section>

      <section className="bg-forest py-14 text-cream"><div className="wrap">
        <Reveal><h2 className="text-3xl !text-turmeric">Best Selling Products</h2></Reveal>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {products.map((p, i) => (
            <Reveal key={p.slug} delay={i * 80} className="overflow-hidden rounded-2xl bg-white text-brown">
              <div className="relative aspect-[4/3]"><StoreImage src={p.images[2] || p.images[1] || p.images[0]} alt={`${p.name} served with rice and ghee`} fill sizes="(max-width:768px) 100vw,380px" className="object-cover" /></div>
              <div className="p-5"><h3 className="text-xl">{p.name}</h3><p className="text-lg font-bold"><ProductPrice product={p} /> <span className="text-sm font-normal">/ {p.weight}</span></p><p className="mt-1 text-sm">{p.short}</p><Link href={`/products/${p.slug}`} className="btn-primary mt-3">Shop Now</Link></div>
            </Reveal>))}
        </div>
        <div className="mt-8 text-center"><Link href="/all-products" className="btn-accent px-8 py-3">View All Products</Link></div>
      </div></section>

      <section className="wrap grid items-center gap-8 py-14 md:grid-cols-2">
        <Reveal className="relative aspect-[4/3] overflow-hidden rounded-2xl"><StoreImage src="/images/paruppu-serving.jpg" alt="Paruppu podi with hot rice and ghee on a banana leaf" fill sizes="(max-width:768px) 100vw,540px" className="object-cover" /></Reveal>
        <Reveal><h2 className="text-3xl">A Little Taste of Home in Every Spoon</h2>
          <p className="mt-3">PODIKKAARAN brings traditional South Indian homemade flavours to your everyday cooking. Our podis are made with carefully selected ingredients and are ready to mix with hot rice and ghee, or serve with idli, dosa and chapati.</p>
          <Link href="/about" className="btn-outline mt-4">Our story</Link></Reveal>
      </section>

      <section className="bg-cream py-14">
        <div className="wrap">
          <h2 className="text-3xl">Customer Reviews</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {REVIEWS.map(({ name, rating, text }) => (
              <figure key={name} className="card p-5 sm:p-6">
                <p className="text-xl tracking-wide text-[#916009]">
                  <span aria-hidden="true">{'★'.repeat(rating)}</span>
                  <span className="sr-only">{rating} out of 5 stars</span>
                </p>
                <blockquote className="mt-3"><p>{text}</p></blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-forest">{name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap py-14"><Reveal><h2 className="text-3xl">Frequently Asked Questions</h2></Reveal>
        <div className="mt-5 divide-y divide-brown/10 rounded-2xl bg-white ring-1 ring-brown/10">{faq.map(([q, a]) => <details key={q} className="group p-4"><summary className="cursor-pointer font-semibold text-forest">{q}</summary><p className="mt-2 text-sm">{a}</p></details>)}</div></section>

      <section className="wrap pb-6"><Reveal><h2 className="text-3xl">From the Blog</h2></Reveal>
        <div className="mt-5 grid gap-4 md:grid-cols-3">{POSTS.slice(0, 3).map((p) => <Link key={p.slug} href={`/blog/${p.slug}`} className="card lift p-5"><h3 className="text-lg">{p.title}</h3><p className="mt-1 text-sm">{p.description}</p></Link>)}</div></section>

      <section className="wrap py-10"><div className="card flex flex-wrap items-center justify-between gap-4 p-6"><div><h2 className="text-xl">Find us in Nerkundram, Chennai</h2><p className="text-sm">{fullAddress()}</p></div><a href={mapsLink} target="_blank" rel="noopener noreferrer" className="btn-primary">View on Google Maps</a></div></section>
    </>
  );
}

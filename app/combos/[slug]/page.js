import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ComboBuilder from '@/components/ComboBuilder';
import Image from '@/components/StoreImage';
import JsonLd from '@/components/JsonLd';
import { SITE } from '@/lib/site';
import { activeCombos, comboPreview, eligibleProducts } from '@/lib/combos';
import { getProducts, getSettings } from '@/lib/storefront';

async function getCombo(slug) {
  return activeCombos(await getSettings()).find(c => c.slug === slug);
}

export async function generateMetadata({ params }) {
  const combo = await getCombo(params.slug);
  if (!combo) return {};
  const url = '/combos/' + combo.slug;
  const title = combo.name + ' – Homemade Podi Combo';
  const description = combo.description + ' Shop ' + combo.packs + ' packs of traditional South Indian podi online.';
  const images = combo.images.length ? combo.images : eligibleProducts(combo, await getProducts()).slice(0, 1).flatMap(p => p.images.slice(0, 1));
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, images } };
}

export default async function ComboPage({ params }) {
  const [combo, products] = await Promise.all([getCombo(params.slug), getProducts()]);
  if (!combo) notFound();
  const url = SITE.url + '/combos/' + combo.slug;
  const quote = comboPreview(combo, products);
  const images = combo.images.length ? combo.images : eligibleProducts(combo, products).slice(0, 3).flatMap(p => p.images.slice(0, 1));
  return (
    <div className="wrap space-y-5 py-8">
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: combo.name, item: url },
      ] }} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Product', name: combo.name, description: combo.description,
        image: images.map(src => new URL(src, SITE.url).href), sku: combo.slug, brand: { '@type': 'Brand', name: 'PODIKKAARAN' },
        ...(quote && { offers: { '@type': 'Offer', url, priceCurrency: 'INR', price: quote.price, availability: 'https://schema.org/InStock' } }),
      }} />
      <Link href="/#combo-offers" className="text-sm underline">See all combo offers</Link>
      <h1 className="text-3xl sm:text-4xl">{combo.name}</h1>
      <p>{combo.description}</p>
      {combo.images.length > 0 && <div className="flex flex-wrap gap-2">{combo.images.map(src => <Image key={src} src={src} alt={combo.name} width={160} height={130} className="h-32 w-40 object-contain" />)}</div>}
      <Suspense fallback={<p>Loading selection…</p>}><ComboBuilder combo={combo} /></Suspense>
    </div>
  );
}

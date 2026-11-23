import { notFound } from 'next/navigation';
import { getProducts, getProduct } from '@/lib/storefront';
import ProductBuy from '@/components/ProductBuy';
import ProductGrid from '@/components/ProductGrid';
import Breadcrumb from '@/components/Breadcrumb';
import JsonLd from '@/components/JsonLd';
import { productSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';
const SEO = {
  'curry-leaf-podi': ['Curry Leaf Podi Online – Homemade, 100g ₹69', 'Buy homemade Curry Leaf Podi online. Made with curry leaves, dals and spices. ₹69 per 100g. Podi delivery in Chennai and across India. COD available.'],
  'moringa-podi': ['Moringa Podi Online – Homemade, 100g ₹69', 'Buy homemade Moringa (Murungai) Podi online. ₹69 per 100g. Delivery in Chennai and across India. Cash on Delivery available.'],
  'paruppu-podi': ['Paruppu Podi Online – Traditional Homemade, 100g ₹69', 'Buy traditional homemade Paruppu (dal) Podi online. ₹69 per 100g. Podi delivery in Chennai and across India. COD available.'],
};
export async function generateMetadata({ params }) {
  const p = await getProduct(params.slug); if (!p) return {};
  const [title, description] = SEO[p.slug] || [`${p.name} Online`, p.short];
  return { title, description, alternates: { canonical: `/products/${p.slug}` }, openGraph: { title, description, images: [p.images[0]], type: 'website' } };
}
export default async function ProductPage({ params }) {
  const p = await getProduct(params.slug); if (!p || !p.active) notFound();
  const related = (await getProducts()).filter((x) => x.active && x.slug !== p.slug);
  return (
    <>
      <JsonLd data={productSchema(p)} />
      <Breadcrumb list={[['Shop', '/shop'], [p.name, `/products/${p.slug}`]]} />
      <div className="wrap py-8"><ProductBuy p={p} />
        {related.length > 0 && <section className="mt-14"><h2 className="mb-5 text-2xl">You may also like</h2><ProductGrid products={related} /></section>}
      </div>
    </>
  );
}

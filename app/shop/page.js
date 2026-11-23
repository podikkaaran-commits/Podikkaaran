import { getProducts } from '@/lib/storefront';
import ProductGrid from '@/components/ProductGrid';
import Breadcrumb from '@/components/Breadcrumb';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shop Homemade Podi Online', description: 'Order Curry Leaf Podi, Moringa Podi and Paruppu Podi online – homemade South Indian podi, ₹69 per 100g. Podi delivery in Chennai and across India.', alternates: { canonical: '/shop' } };
export default async function Shop({ searchParams }) {
  const q = (searchParams?.q || '').toLowerCase();
  const list = (await getProducts()).filter((p) => p.active && (!q || `${p.name} ${p.tamilName} ${p.short}`.toLowerCase().includes(q)));
  return (<><Breadcrumb list={[['Shop', '/shop']]} /><div className="wrap py-8"><h1 className="text-3xl sm:text-4xl">{q ? `Results for “${searchParams.q}”` : 'Shop Homemade Podi Online'}</h1><p className="mb-6 mt-1">Traditional homemade podi with Amma Samayal taste – delivered across India.</p><ProductGrid products={list} /></div></>);
}

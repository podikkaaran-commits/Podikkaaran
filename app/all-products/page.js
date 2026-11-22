import { getProducts } from '@/lib/db';
import ProductGrid from '@/components/ProductGrid';
import Breadcrumb from '@/components/Breadcrumb';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'All Products – South Indian Podi', description: 'Browse every PODIKKAARAN homemade podi: Curry Leaf, Moringa and Paruppu Podi, 100g each.', alternates: { canonical: '/all-products' } };
export default function All() {
  return (<><Breadcrumb list={[['All Products', '/all-products']]} /><div className="wrap py-8"><h1 className="mb-6 text-3xl sm:text-4xl">All Products</h1><ProductGrid products={getProducts().filter((p) => p.active)} /></div></>);
}

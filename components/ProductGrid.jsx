import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
export default function ProductGrid({ products }) {
  if (!products.length) return <p className="py-10 text-center">No products found.</p>;
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map((p, i) => <Reveal key={p.slug} delay={i * 80}><ProductCard p={p} /></Reveal>)}</div>;
}

import { rupee } from '@/lib/site';

export default function ProductPrice({ product }) {
  const saving = product.originalPrice - product.price;
  return <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
    {saving > 0 && <del className="text-sm font-normal text-brown/70"><span className="sr-only">Original price </span>{rupee(product.originalPrice)}</del>}
    <strong className="text-forest"><span className="sr-only">Selling price </span>{rupee(product.price)}</strong>
    {saving > 0 && <span className="rounded-full bg-cream px-2 py-1 text-xs font-semibold text-forest">Save {rupee(saving)}</span>}
  </span>;
}

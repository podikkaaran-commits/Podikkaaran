import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { crumbs } from '@/lib/schema';
export default function Breadcrumb({ list }) {
  const all = [['Home', '/'], ...list];
  return (
    <nav aria-label="Breadcrumb" className="wrap pt-5 text-xs">
      <JsonLd data={crumbs(all)} />
      {all.map(([n, h], i) => <span key={h}>{i > 0 && ' / '}{i < all.length - 1 ? <Link href={h} className="underline">{n}</Link> : <span aria-current="page">{n}</span>}</span>)}
    </nav>
  );
}

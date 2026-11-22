import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';
import { POSTS } from '@/lib/blog';
export const metadata = { title: 'Podi Recipes & Ideas – PODIKKAARAN Blog', description: 'Ideas, uses and traditions around South Indian podi: curry leaf, moringa and paruppu podi.', alternates: { canonical: '/blog' } };
export default function Blog() {
  return (<><Breadcrumb list={[['Blog', '/blog']]} /><div className="wrap py-8"><h1 className="mb-6 text-3xl sm:text-4xl">The PODIKKAARAN Blog</h1>
    <div className="grid gap-5 md:grid-cols-2">{POSTS.map((p) => <Link key={p.slug} href={`/blog/${p.slug}`} className="card lift p-6"><time className="text-xs" dateTime={p.date}>{p.date}</time><h2 className="mt-1 text-xl">{p.title}</h2><p className="mt-1 text-sm">{p.description}</p></Link>)}</div></div></>);
}

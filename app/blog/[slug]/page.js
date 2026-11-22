import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';
import JsonLd from '@/components/JsonLd';
import { POSTS, getPost } from '@/lib/blog';
import { SITE } from '@/lib/site';
export const generateStaticParams = () => POSTS.map((p) => ({ slug: p.slug }));
export function generateMetadata({ params }) {
  const p = getPost(params.slug); if (!p) return {};
  return { title: p.title, description: p.description, alternates: { canonical: `/blog/${p.slug}` }, openGraph: { type: 'article', title: p.title, description: p.description } };
}
export default function Post({ params }) {
  const p = getPost(params.slug); if (!p) notFound();
  const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.description, datePublished: p.date, author: { '@type': 'Organization', name: SITE.name }, publisher: { '@type': 'Organization', name: SITE.name }, mainEntityOfPage: `${SITE.url}/blog/${p.slug}` };
  return (<><JsonLd data={ld} /><Breadcrumb list={[['Blog', '/blog'], [p.title, `/blog/${p.slug}`]]} />
    <article className="wrap prose-pk max-w-2xl py-8"><h1 className="mb-2 text-3xl sm:text-4xl">{p.title}</h1><time className="text-xs" dateTime={p.date}>{p.date}</time>
      <div className="mt-5">{p.body.map(([t, x], i) => (t === 'h' ? <h2 key={i}>{x}</h2> : <p key={i}>{x}</p>))}</div>
      <div className="card mt-8 p-5"><p className="mb-2 font-semibold">Try homemade podi from PODIKKAARAN</p><Link href="/shop" className="btn-primary">Shop podi – ₹69</Link></div></article></>);
}

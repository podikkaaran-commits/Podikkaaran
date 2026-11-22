import Link from 'next/link';
export const metadata = { title: 'Page not found' };
export default function NotFound() { return <div className="wrap py-20 text-center"><h1 className="text-4xl">Page not found</h1><p className="mt-2">That page does not exist.</p><Link href="/shop" className="btn-primary mt-5">Go to shop</Link></div>; }

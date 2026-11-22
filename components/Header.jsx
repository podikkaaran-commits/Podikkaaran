'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';

const NAV = [['/', 'Home'], ['/shop', 'Shop'], ['/all-products', 'All Products'], ['/about', 'About Us'], ['/contact', 'Contact']];
const Ico = ({ d }) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export default function Header() {
  const { count, setOpen, bump } = useCart();
  const [menu, setMenu] = useState(false), [search, setSearch] = useState(false), [q, setQ] = useState('');
  const router = useRouter();
  const go = (e) => { e.preventDefault(); setSearch(false); router.push(`/shop?q=${encodeURIComponent(q.trim())}`); };
  return (
    <header className="sticky top-0 z-40 border-b border-brown/10 bg-white/95 backdrop-blur">
      <div className="wrap flex h-16 items-center justify-between gap-3">
        <Link href="/" aria-label="PODIKKAARAN home" className="flex items-center gap-2">
          <Image src="/images/logo.jpg" alt="PODIKKAARAN logo" width={52} height={52} priority className="h-12 w-12 object-contain mix-blend-multiply" />
          <span className="hidden font-display text-lg font-bold tracking-wide text-forest sm:block">PODIKKAARAN</span>
        </Link>
        <nav aria-label="Main" className="hidden gap-7 text-sm font-semibold md:flex">
          {NAV.map(([h, l]) => <Link key={h} href={h} className="hover:text-forest">{l}</Link>)}
        </nav>
        <div className="flex items-center gap-1 text-forest">
          <button aria-label="Search" onClick={() => setSearch((s) => !s)} className="rounded-full p-2 hover:bg-cream"><Ico d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3" /></button>
          <Link href="/order" aria-label="Track your order" className="rounded-full p-2 hover:bg-cream"><Ico d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></Link>
          <button aria-label={`Open cart, ${count} items`} onClick={() => setOpen(true)} className="relative rounded-full p-2 hover:bg-cream">
            <Ico d="M6 6h15l-1.5 9h-12zM6 6L5 3H2M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z" />
            {count > 0 && <span key={bump} className="bump absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-turmeric px-1 text-[11px] font-bold text-brown">{count}</span>}
          </button>
          <button aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="rounded-full p-2 hover:bg-cream md:hidden"><Ico d={menu ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} /></button>
        </div>
      </div>
      {search && (
        <form onSubmit={go} className="wrap fade-in pb-3"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="input" placeholder="Search podi… (e.g. moringa)" aria-label="Search products" /></form>
      )}
      {menu && (
        <nav aria-label="Mobile" className="fade-in border-t border-brown/10 bg-white md:hidden">
          {NAV.map(([h, l]) => <Link key={h} href={h} onClick={() => setMenu(false)} className="block px-6 py-3.5 text-base font-semibold active:bg-cream">{l}</Link>)}
        </nav>
      )}
    </header>
  );
}

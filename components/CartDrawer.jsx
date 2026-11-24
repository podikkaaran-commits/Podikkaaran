'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import CartLines from '@/components/CartLines';
import { rupee } from '@/lib/site';

export default function CartDrawer() {
  const { open, setOpen, count, subtotal, blocked, settings } = useCart();
  const pathname = usePathname();
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, setOpen]);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <div className="fade-in absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="drawer absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-brown/10 p-4"><h2 className="text-xl">Your cart ({count})</h2><button onClick={() => setOpen(false)} aria-label="Close cart" className="rounded-full p-2 hover:bg-cream">✕</button></div>
            <div className="flex-1 overflow-y-auto px-4"><CartLines compact /></div>
            {count > 0 && (
              <div className="space-y-2 border-t border-brown/10 p-4">
                <div className="flex justify-between font-semibold"><span>Subtotal</span><span>{rupee(subtotal)}</span></div>
                <p className="text-xs">Delivery ({rupee(settings.deliveryChennai)} Chennai · {rupee(settings.deliveryTN)} rest of Tamil Nadu · {rupee(settings.deliveryOther)} other states) is added once per order at checkout.</p>
                <Link href={blocked ? '/cart' : '/checkout'} onClick={() => setOpen(false)} className="btn-primary w-full">{blocked ? 'Fix unavailable items' : 'Proceed to Checkout'}</Link>
                <Link href="/cart" onClick={() => setOpen(false)} className="btn-outline w-full">View cart</Link>
                <button onClick={() => setOpen(false)} className="w-full text-sm underline">Continue shopping</button>
              </div>
            )}
          </aside>
        </div>
      )}
      {count > 0 && !open && !['/cart', '/checkout', '/order', '/admin'].includes(pathname) && (
        <Link href="/cart" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex items-center justify-between rounded-full bg-forest px-5 py-3 text-cream shadow-xl md:hidden" aria-label="View cart">
          <span className="text-sm font-semibold">🛒 {count} item{count > 1 ? 's' : ''}</span><span className="font-bold">{rupee(subtotal)}</span>
        </Link>
      )}
    </>
  );
}

'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { track, itemOf } from '@/lib/analytics';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

export default function CartProvider({ products, settings, children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const [pin, setPinState] = useState('');

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem('pk_cart') || '[]')); setPinState(localStorage.getItem('pk_pin') || ''); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem('pk_cart', JSON.stringify(items)); }, [items, ready]);
  const setPin = (p) => { setPinState(p); try { localStorage.setItem('pk_pin', p); } catch {} };

  const pmap = useMemo(() => Object.fromEntries(products.map((p) => [p.slug, p])), [products]);
  const lines = useMemo(() => items.map((i) => {
    const p = pmap[i.slug]; if (!p) return null;
    return { ...p, qty: i.qty, unavailable: p.stock <= 0 || i.qty > p.stock };
  }).filter(Boolean), [items, pmap]);
  const count = lines.reduce((t, l) => t + l.qty, 0);
  const subtotal = lines.reduce((t, l) => t + l.qty * l.price, 0);
  const blocked = lines.some((l) => l.unavailable);

  const add = useCallback((slug, qty = 1, { silent } = {}) => {
    const p = pmap[slug]; if (!p || p.stock <= 0) return false;
    setItems((cur) => {
      const ex = cur.find((i) => i.slug === slug);
      const q = Math.min((ex?.qty || 0) + qty, p.stock, 50);
      return ex ? cur.map((i) => (i.slug === slug ? { ...i, qty: q } : i)) : [...cur, { slug, qty: q }];
    });
    track('add_to_cart', { value: p.price * qty, items: [itemOf(p, qty)] });
    setBump((b) => b + 1); if (!silent) setOpen(true);
    return true;
  }, [pmap]);
  const remove = (slug) => {
    const p = pmap[slug], l = items.find((i) => i.slug === slug);
    if (p && l) track('remove_from_cart', { value: p.price * l.qty, items: [itemOf(p, l.qty)] });
    setItems((c) => c.filter((i) => i.slug !== slug));
  };
  const setQty = (slug, q) => {
    const p = pmap[slug]; if (!p) return;
    if (q < 1) return remove(slug);
    setItems((c) => c.map((i) => (i.slug === slug ? { ...i, qty: Math.min(q, Math.max(p.stock, 1), 50) } : i)));
  };
  const clear = () => setItems([]);

  return (
    <Ctx.Provider value={{ products, settings, lines, count, subtotal, blocked, add, remove, setQty, clear, open, setOpen, bump, pin, setPin, ready }}>
      {children}
    </Ctx.Provider>
  );
}

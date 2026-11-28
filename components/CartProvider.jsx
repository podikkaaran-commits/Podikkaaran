'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { track, itemOf } from '@/lib/analytics';
import { quoteCombo } from '@/lib/combos';
import { PIN_RE } from '@/lib/delivery';
import { deliveryTotals, productTotals } from '@/lib/shipping';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

export default function CartProvider({ products, settings, children }) {
  const checkout = usePathname() === '/checkout';
  const [items, setItems] = useState([]);
  const [combos, setCombos] = useState([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const [pin, setPinState] = useState('');
  const [pinResult, setPinResult] = useState(null);
  const [pinRetry, setPinRetry] = useState(0);
  const [coupon, setCoupon] = useState(null);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem('pk_cart') || '[]')); setPinState(localStorage.getItem('pk_pin') || ''); } catch {}
    try { setCombos(JSON.parse(localStorage.getItem('pk_combos') || '[]')); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem('pk_cart', JSON.stringify(items)); }, [items, ready]);
  useEffect(() => { if (ready) localStorage.setItem('pk_combos', JSON.stringify(combos)); }, [combos, ready]);
  const setPin = (p) => { setPinState(p); try { localStorage.setItem('pk_pin', p); } catch {} };

  useEffect(() => {
    if (!PIN_RE.test(pin)) return;
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch('/api/pincode?pin=' + encodeURIComponent(pin), { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error();
        const rule = await response.json();
        if (!controller.signal.aborted) setPinResult({ pin, retry: pinRetry, checkout, rule });
      } catch {
        if (!controller.signal.aborted) setPinResult({ pin, retry: pinRetry, checkout, error: 'Could not check delivery. Please try again.' });
      }
    })();
    return () => controller.abort();
  }, [pin, pinRetry, checkout]);

  const pmap = useMemo(() => Object.fromEntries(products.map((p) => [p.slug, p])), [products]);
  const lines = useMemo(() => {
    const needed = new Map();
    const include = (slug, qty) => needed.set(slug, (needed.get(slug) || 0) + qty);
    const singles = items.map(i => {
      const p = pmap[i.slug];
      if (!p) return { ...i, id: i.slug, name: i.slug, images: [], unavailable: true, price: 0, stock: 0 };
      include(i.slug, i.qty);
      return { ...p, id: p.slug, qty: i.qty };
    });
    const offers = combos.map(entry => {
      const offer = settings.combos.find(c => c.slug === entry.slug);
      const quote = offer && quoteCombo(offer, entry.selection, products, { checkStock: false });
      const line = { ...entry, combo: true, name: offer?.name || entry.name, price: 0, stock: 0, images: offer?.images || [] };
      if (!quote) return { ...line, unavailable: true };
      for (const i of quote.items) include(i.slug, i.qty * entry.qty);
      const stock = Math.min(offer.max || 50, ...quote.items.map(i => Math.floor(pmap[i.slug].stock / i.qty)));
      return { ...line, ...quote, contents: quote.items, weight: quote.weight + 'g', stock };
    });
    return [...singles, ...offers].map(line => ({
      ...line,
      unavailable: line.unavailable || line.qty > line.stock ||
        (line.contents || [line]).some(i => needed.get(i.slug) > pmap[i.slug]?.stock),
    }));
  }, [items, combos, pmap, settings.combos, products]);
  const count = lines.reduce((t, l) => t + l.qty, 0);
  const pricing = productTotals(lines, coupon);
  const deliveryResult = pinResult?.pin === pin && pinResult.retry === pinRetry && pinResult.checkout === checkout ? pinResult : null;
  const delivery = deliveryTotals(deliveryResult?.rule, pricing.subtotal);
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
    if (combos.some(c => c.id === slug)) return setCombos(cur => cur.filter(c => c.id !== slug));
    const p = pmap[slug], l = items.find((i) => i.slug === slug);
    if (p && l) track('remove_from_cart', { value: p.price * l.qty, items: [itemOf(p, l.qty)] });
    setItems((c) => c.filter((i) => i.slug !== slug));
  };
  const setQty = (slug, q) => {
    const combo = lines.find(l => l.id === slug && l.combo);
    if (combo) {
      if (q < 1) return remove(slug);
      return setCombos(cur => cur.map(c => c.id === slug ? { ...c, qty: Math.min(q, Math.max(combo.stock, 1), 50) } : c));
    }
    const p = pmap[slug]; if (!p) return;
    if (q < 1) return remove(slug);
    setItems((c) => c.map((i) => (i.slug === slug ? { ...i, qty: Math.min(q, Math.max(p.stock, 1), 50) } : i)));
  };
  const addCombo = (offer, quote, editId, silent) => {
    const selection = Object.fromEntries(quote.items.map(i => [i.slug, i.qty]));
    const entry = { id: crypto.randomUUID(), slug: offer.slug, name: offer.name, selection, qty: 1 };
    setCombos(cur => {
      const existing = cur.find(c => c.id === editId && c.slug === offer.slug);
      return existing ? cur.map(c => c.id === editId ? { ...entry, id: editId, qty: c.qty } : c) : [...cur, entry];
    });
    track('add_to_cart', { value: quote.price, items: [itemOf(offer, 1)] });
    setBump(b => b + 1);
    if (!silent) setOpen(true);
  };
  const clear = () => { setItems([]); setCombos([]); setCoupon(null); };

  return (
    <Ctx.Provider value={{ products, settings, lines, items, combos, count, ...pricing, coupon, setCoupon, delivery, deliveryResult,
      retryDelivery: () => setPinRetry(value => value + 1), blocked, add, addCombo, remove, setQty, clear, open, setOpen, bump, pin, setPin, ready }}>
      {children}
    </Ctx.Provider>
  );
}

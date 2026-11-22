import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getOrders, getProducts, saveProducts, getSettings, saveSettings } from '@/lib/db';
import { updateOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';
const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : d);

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ orders: getOrders(), products: getProducts(), settings: getSettings() });
}
export async function PATCH(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (b.kind === 'order') {
    if (!STATUSES.includes(b.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    const o = updateOrder(b.id, (x) => {
      x.status = b.status; x.statusHistory.push({ status: b.status, at: new Date().toISOString() });
      if (b.status === 'Delivered' && x.payment.method === 'cod') x.payment.status = 'cod_collected';
    });
    return o ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (b.kind === 'settings') {
    const cur = getSettings(), n = b.settings || {};
    saveSettings({
      ...cur,
      deliveryChennai: num(n.deliveryChennai, cur.deliveryChennai), deliveryTN: num(n.deliveryTN, cur.deliveryTN), deliveryOther: num(n.deliveryOther, cur.deliveryOther),
      chennaiPinMin: num(n.chennaiPinMin, cur.chennaiPinMin), chennaiPinMax: num(n.chennaiPinMax, cur.chennaiPinMax),
      codEnabled: !!n.codEnabled, whatsappNumber: String(n.whatsappNumber || '').replace(/\D/g, ''),
      deliveryTime: String(n.deliveryTime || cur.deliveryTime).slice(0, 60),
    });
    return NextResponse.json({ ok: true });
  }
  if (b.kind === 'products') {
    const list = getProducts();
    for (const u of b.products || []) {
      const p = list.find((x) => x.slug === u.slug); if (!p) continue;
      p.price = num(u.price, p.price); p.stock = num(u.stock, p.stock); p.active = !!u.active;
    }
    saveProducts(list);
    return NextResponse.json({ ok: true });
  }
  if (b.kind === 'addProduct') {
    const n = b.product || {}, list = getProducts();
    const name = String(n.name || '').trim().slice(0, 80), price = Number(n.price);
    if (name.length < 2) return NextResponse.json({ error: 'Enter product name' }, { status: 400 });
    if (!(price > 0)) return NextResponse.json({ error: 'Enter a valid price' }, { status: 400 });
    const images = (Array.isArray(n.images) ? n.images : []).filter((u) => /^\/(uploads\/[a-f0-9]{16}\.(jpg|png|webp)|images\/[\w.-]+)$/.test(u));
    if (!images.length) return NextResponse.json({ error: 'Upload at least one product image' }, { status: 400 });
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product', base = slug, i = 2;
    while (list.some((x) => x.slug === slug)) slug = `${base}-${i++}`;
    const lines = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 10);
    list.push({
      slug, name, tamilName: String(n.tamilName || '').slice(0, 80), price: Math.round(price), weight: String(n.weight || '100g').slice(0, 20),
      stock: num(n.stock, 0), active: true, category: 'Podi', badge: String(n.badge || '').slice(0, 20), images,
      short: String(n.short || '').slice(0, 160), description: String(n.description || '').slice(0, 1500),
      ingredients: String(n.ingredients || '').slice(0, 500), usage: lines(n.usage), storage: String(n.storage || 'Keep in a cool, dry place. Use a dry spoon. Close the pack after use.').slice(0, 300),
    });
    saveProducts(list);
    return NextResponse.json({ ok: true, slug });
  }
  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}

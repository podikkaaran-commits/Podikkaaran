import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { cloudStore, getOrders, getProducts, saveProducts, patchProducts, getSettings, saveSettings } from '@/lib/db';
import { updateOrder } from '@/lib/orders';
import { configuredCombos, grams } from '@/lib/combos';
import { businessSettings, eligibility, fulfilment, imagePath, optionalCost, validateCombo } from '@/lib/combo-admin';

export const dynamic = 'force-dynamic';
const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : d);

function validPrices(price, original) {
  return Number.isSafeInteger(price) && price > 0 && Number.isSafeInteger(original) && (original === 0 || original >= price);
}
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [orders, products, settings] = await Promise.all([getOrders(), getProducts(), getSettings()]);
  return NextResponse.json({ orders, products, settings });
}
export async function PATCH(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (b.kind === 'combo' || b.kind === 'business' || b.kind === 'fulfilment') {
    try {
      if (b.kind === 'fulfilment') {
        const details = fulfilment(b.fulfilment || {});
        const order = await updateOrder(b.id, o => { o.fulfilment = details; });
        return order ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      const settings = await getSettings();
      if (b.kind === 'business') {
        await saveSettings({ ...settings, business: businessSettings(b.settings || {}, settings.business) });
      } else {
        const combos = configuredCombos(settings);
        const existing = b.previousSlug && combos.find(c => c.slug === b.previousSlug);
        if (b.previousSlug && !existing) throw new Error('Offer changed. Reload the dashboard.');
        if (b.action === 'delete' && existing) {
          await saveSettings({ ...settings, combos: combos.filter(c => c.slug !== existing.slug) });
        } else {
          const combo = validateCombo(b.combo, await getProducts());
          if (existing && combo.slug !== existing.slug) throw new Error('An existing offer keeps its URL. Duplicate it to use a new slug.');
          if (combos.some(c => c.slug === combo.slug && c !== existing)) throw new Error('That URL slug is already used.');
          await saveSettings({ ...settings, combos: existing ? combos.map(c => c === existing ? combo : c) : [...combos, combo] });
        }
      }
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }
  if (b.kind === 'order') {
    if (!STATUSES.includes(b.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    try {
      const o = await updateOrder(b.id, (x) => {
        if (x.status === 'Cancelled' && b.status !== 'Cancelled') throw new Error('Cancelled orders cannot be reopened.');
        if (x.payment.method !== 'cod' && x.payment.status !== 'paid' && b.status !== 'Cancelled') throw new Error('Wait for payment before updating this order.');
        if (x.status === b.status) return;
        if (['Shipped', 'Delivered'].includes(x.status) && !['Shipped', 'Delivered', 'Cancelled'].includes(b.status))
          throw new Error('A dispatched order cannot return to an earlier status.');
        x.status = b.status;
        x.statusHistory.push({ status: b.status, at: new Date().toISOString() });
        if (b.status === 'Delivered' && x.payment.method === 'cod') x.payment.status = 'cod_collected';
      });
      return o ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
  }
  if (b.kind === 'settings') {
    const cur = await getSettings(), n = b.settings || {};
    await saveSettings({
      ...cur,
      deliveryChennai: num(n.deliveryChennai, cur.deliveryChennai), deliveryTN: num(n.deliveryTN, cur.deliveryTN), deliveryOther: num(n.deliveryOther, cur.deliveryOther),
      chennaiPinMin: num(n.chennaiPinMin, cur.chennaiPinMin), chennaiPinMax: num(n.chennaiPinMax, cur.chennaiPinMax),
      codEnabled: !!n.codEnabled, whatsappNumber: String(n.whatsappNumber || '').replace(/\D/g, ''),
      deliveryTime: String(n.deliveryTime || cur.deliveryTime).slice(0, 60),
    });
    return NextResponse.json({ ok: true });
  }
  if (b.kind === 'products') {
    const list = await getProducts();
    const changes = {};
    const costs = {};
    for (const u of b.products || []) {
      const p = list.find((x) => x.slug === u.slug); if (!p) continue;
      const original = Number((u.originalPrice === undefined ? p.originalPrice : u.originalPrice) || 0);
      if (!validPrices(Number(u.price ?? p.price), original)) return NextResponse.json({ error: 'Enter a positive selling price. Original price must be at least the selling price or blank.' }, { status: 400 });
      changes[p.slug] = {
        ...(u.originalPrice !== undefined && { originalPrice: original || null }),
        ...(u.price !== undefined && { price: Number(u.price) }),
        ...(u.stock !== undefined && { stock: num(u.stock, p.stock) }),
        ...(u.active !== undefined && { active: !!u.active }),
        ...(u.comboEligibility !== undefined && eligibility({ ...p, ...u })),
      };
      if (u.manufacturingCost !== undefined) {
        try { costs[p.slug] = optionalCost(u.manufacturingCost); }
        catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
      }
    }
    if (Object.values(changes).some(patch => Object.keys(patch).length)) await patchProducts(changes);
    if (Object.keys(costs).length) {
      const settings = await getSettings();
      await saveSettings({ ...settings, business: { ...settings.business, productCosts: { ...settings.business?.productCosts, ...costs } } });
    }
    return NextResponse.json({ ok: true });
  }
  if (b.kind === 'addProduct') {
    const n = b.product || {}, list = await getProducts();
    const name = String(n.name || '').trim().slice(0, 80), price = Number(n.price);
    if (name.length < 2) return NextResponse.json({ error: 'Enter product name' }, { status: 400 });
    const originalPrice = Number(n.originalPrice || 0);
    if (!validPrices(price, originalPrice)) return NextResponse.json({ error: 'Enter a valid price' }, { status: 400 });
    const images = (Array.isArray(n.images) ? n.images : []).filter(imagePath);
    if (!grams(n.weight || '100g')) return NextResponse.json({ error: 'Enter a positive weight with g or kg.' }, { status: 400 });
    let cost;
    try { cost = optionalCost(n.manufacturingCost); }
    catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
    if (!images.length) return NextResponse.json({ error: 'Upload at least one product image' }, { status: 400 });
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product', base = slug, i = 2;
    while (list.some((x) => x.slug === slug)) slug = `${base}-${i++}`;
    const lines = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 10);
    const product = {
      slug, name, originalPrice: originalPrice || null, tamilName: String(n.tamilName || '').slice(0, 80), price: Math.round(price), weight: String(n.weight || '100g').slice(0, 20),
      ...eligibility(n), stock: num(n.stock, 0), active: true, category: 'Podi', badge: String(n.badge || '').slice(0, 20), images,
      short: String(n.short || '').slice(0, 160), description: String(n.description || '').slice(0, 1500),
      ingredients: String(n.ingredients || '').slice(0, 500), usage: lines(n.usage), storage: String(n.storage || 'Keep in a cool, dry place. Use a dry spoon. Close the pack after use.').slice(0, 300),
    };
    await saveProducts(cloudStore ? [product] : [...list, product]);
    if (cost !== null) {
      const settings = await getSettings();
      await saveSettings({ ...settings, business: { ...settings.business, productCosts: { ...settings.business?.productCosts, [slug]: cost } } });
    }
    return NextResponse.json({ ok: true, slug });
  }
  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}

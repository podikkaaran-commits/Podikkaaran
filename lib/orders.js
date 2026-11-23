import crypto from 'crypto';
import { getProducts, getSettings, getOrder, localOrders, saveLocalOrders, cloudStore, commitCloudOrder, saveProducts } from '@/lib/db';
import { zoneFor, chargeFor, PIN_RE } from '@/lib/delivery';
import { STATES } from '@/lib/site';

const MOBILE_RE = /^[6-9][0-9]{9}$/;

const clean = (v, max = 200) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);

export function newOrderId() {
  const d = new Date(), pad = (n) => String(n).padStart(2, '0');
  const rnd = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `PK${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${rnd}`;
}

// Validates input and recomputes every price server-side. Never trust client totals.
export async function buildOrder(body) {
  const [s, products] = await Promise.all([getSettings(), getProducts()]);
  const c = body?.customer || {};
  const customer = {
    name: clean(c.name, 80), mobile: clean(c.mobile, 15).replace(/\D/g, '').replace(/^(91|0)(?=[0-9]{10}$)/, ''),
    house: clean(c.house, 80), street: clean(c.street, 120),
    area: clean(c.area, 80), city: clean(c.city, 60), state: clean(c.state, 60), pincode: clean(c.pincode, 6),
  };
  const errors = {};
  if (customer.name.length < 2) errors.name = 'Enter your full name';
  if (!MOBILE_RE.test(customer.mobile)) errors.mobile = 'Enter a valid 10-digit Indian mobile number';

  if (!customer.house) errors.house = 'Enter house / flat number';
  if (!customer.street) errors.street = 'Enter street address';
  if (!customer.area) errors.area = 'Enter your area';
  if (!customer.city) errors.city = 'Enter your city';
  if (!STATES.includes(customer.state)) errors.state = 'Select your state';
  if (!PIN_RE.test(customer.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';
  const method = body?.paymentMethod;
  if (method !== 'cod' && method !== 'razorpay') errors.payment = 'Choose a payment method';
  if (method === 'cod' && !s.codEnabled) errors.payment = 'Cash on Delivery is currently unavailable';

  const items = [];
  const req = Array.isArray(body?.items) ? body.items : [];
  if (!req.length) errors.items = 'Your cart is empty';
  for (const r of req) {
    const p = products.find((x) => x.slug === r.slug);
    const qty = Math.floor(Number(r.qty));
    if (!p || !p.active) { errors.items = 'A product in your cart is no longer available'; break; }
    if (!(qty >= 1 && qty <= 50)) { errors.items = 'Invalid quantity'; break; }
    if (p.stock < qty) { errors.items = `${p.name}: only ${Math.max(p.stock, 0)} in stock`; break; }
    items.push({ slug: p.slug, name: p.name, weight: p.weight, price: p.price, qty });
  }
  if (Object.keys(errors).length) return { errors };

  const zone = zoneFor(customer, s);
  const subtotal = items.reduce((t, i) => t + i.price * i.qty, 0);
  const deliveryCharge = chargeFor(zone, s); // once per order
  return {
    order: {
      id: newOrderId(), createdAt: new Date().toISOString(), customer, items, zone,
      subtotal, deliveryCharge, total: subtotal + deliveryCharge,
      payment: { method, status: method === 'cod' ? 'cod_pending' : 'awaiting_payment' },
      status: 'Pending', statusHistory: [{ status: 'Pending', at: new Date().toISOString() }],
    },
  };
}

export async function reserveStock(items) {
  if (cloudStore) return;
  const products = await getProducts();
  for (const i of items) { const p = products.find((x) => x.slug === i.slug); if (p) p.stock = Math.max(0, p.stock - i.qty); }
  await saveProducts(products);
}
export async function insertOrder(order) {
  if (cloudStore) return commitCloudOrder(order);
  saveLocalOrders([order, ...localOrders()]);
}
export async function updateOrder(id, fn) {
  const local = localOrders();
  const existing = local.find(order => order.id === id);
  if (existing) {
    fn(existing);
    saveLocalOrders(local);
    return existing;
  }
  const previous = await getOrder(id);
  if (!previous) return null;
  const updated = structuredClone(previous);
  fn(updated);
  await commitCloudOrder(updated, previous);
  return updated;
}
export async function notifyAdmin(order) {
  console.log(`[NEW ORDER] ${order.id} ₹${order.total} ${order.payment.method} - ${order.customer.name} ${order.customer.mobile}`);
  const url = process.env.ADMIN_WEBHOOK_URL;
  if (!url) return;
  const text = `New PODIKKAARAN order ${order.id}: ₹${order.total} (${order.payment.method.toUpperCase()}) – ${order.customer.name}, ${order.customer.mobile}, ${order.customer.city} ${order.customer.pincode}. Items: ${order.items.map((i) => `${i.name} x${i.qty}`).join(', ')}`;
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, order }) }); } catch (e) { console.error('webhook failed', e.message); }
}
// Safe view for customers (no address / email)
export const publicOrder = (o) => ({
  id: o.id, createdAt: o.createdAt, items: o.items, subtotal: o.subtotal, deliveryCharge: o.deliveryCharge,
  total: o.total, status: o.status, payment: o.payment, city: o.customer.city,
  confirmed: o.payment.method === 'cod' || o.payment.status === 'paid',
});

import crypto from 'crypto';
import { checkoutCompleted } from '@/lib/order-status';
import { getProducts, getSettings, getOrder, localOrders, saveLocalOrders, cloudStore, commitCloudOrder, saveProducts } from '@/lib/db';
import { PIN_RE } from '@/lib/delivery';
import { findCoupon, shippingFor } from '@/lib/shipping-server';
import { couponCode, deliveryTotals, money, productTotals } from '@/lib/shipping';
import { activeCombos, quoteCombo, orderLines, orderTotals, comboLimitExceeded } from '@/lib/combos';
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
    area: clean(c.area, 80), city: clean(c.city, 60), state: clean(c.state, 60), pincode: String(c.pincode ?? '').trim(),
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
  const shipping = shippingFor(customer.pincode, s);
  if (!errors.pincode && !shipping.available) errors.pincode = 'Delivery is unavailable for this pincode.';
  const coupon = findCoupon(body?.coupon, s);
  if (couponCode(body?.coupon) && !coupon) errors.coupon = 'This coupon is unavailable. Remove it and try again.';
  const method = body?.paymentMethod;
  if (method !== 'cod' && method !== 'razorpay') errors.payment = 'Choose a payment method';
  if (method === 'cod' && !s.codEnabled) errors.payment = 'Cash on Delivery is currently unavailable';

  const items = [];
  const req = Array.isArray(body?.items) ? body.items : [];
  const requestedCombos = Array.isArray(body?.combos) ? body.combos : [];
  if (!req.length && !requestedCombos.length) errors.items = 'Your cart is empty';
  if (req.length + requestedCombos.length > 100) return { errors: { items: 'Too many cart lines' } };
  for (const r of req) {
    const p = products.find((x) => x.slug === r?.slug);
    const qty = Number(r?.qty);
    if (!p || !p.active) { errors.items = 'A product in your cart is no longer available'; break; }
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) { errors.items = 'Invalid quantity'; break; }
    if (p.stock < qty) { errors.items = `${p.name}: only ${Math.max(p.stock, 0)} in stock`; break; }
    items.push({ slug: p.slug, name: p.name, weight: p.weight, price: p.price, qty, originalPrice: p.originalPrice });
  }
  const combos = [];
  const availableCombos = activeCombos(s);
  for (const entry of requestedCombos) {
    const combo = availableCombos.find(c => c.slug === entry?.slug);
    const qty = Number(entry?.qty);
    const quote = combo && quoteCombo(combo, entry.selection, products);
    if (!quote || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      errors.items = 'A combo changed or is unavailable. Update your cart and try again.';
      break;
    }
    combos.push({ ...quote, slug: combo.slug, name: combo.name, max: combo.max, qty });
  }
  const packed = new Map();
  for (const item of [...items, ...combos.flatMap(c => c.items.map(i => ({ ...i, qty: i.qty * c.qty })))]) {
    packed.set(item.slug, { ...item, qty: (packed.get(item.slug)?.qty || 0) + item.qty });
  }
  for (const item of packed.values()) {
    if (item.qty > products.find(p => p.slug === item.slug).stock) errors.items = item.name + ': reduce the combined quantity in your cart.';
  }
  if (Object.keys(errors).length) return { errors };

  const { zone } = shipping;
  const pricing = productTotals([...items, ...combos], coupon);
  const delivery = deliveryTotals(shipping, pricing.subtotal);
  if (body.expectedTotal !== undefined && (!Number.isFinite(body.expectedTotal) || money(body.expectedTotal) !== delivery.total)) {
    return { errors: { items: 'Prices or delivery settings changed. Refresh the checkout and review your new total.' } };
  }
  const deliveryCharge = delivery.charge;
  const status = method === 'cod' ? 'Confirmed' : 'Pending';
  const order = {
      id: newOrderId(), createdAt: new Date().toISOString(), customer, items: [...packed.values()], zone,
      ...(combos.length ? { combos, individualItems: items } : {}),
      ...orderTotals([...packed.values()], pricing.subtotal, deliveryCharge, method, zone, s.business),
      ...pricing, deliveryCharge, freeDeliverySavings: delivery.savings, total: delivery.total,
      ...(coupon && { couponCode: coupon.code }),
      payment: { method, status: method === 'cod' ? 'cod_pending' : 'awaiting_payment' },
      status, statusHistory: [{ status, at: new Date().toISOString() }],
  };
  if (comboLimitExceeded(order, [])) return { errors: { items: 'This cart exceeds the customer limit for a combo.' } };
  return { order };
}

const reserves = order => order.payment.method === 'cod' || order.payment.status === 'paid';
let pendingWrite = Promise.resolve();
function localWrite(operation) {
  const result = pendingWrite.then(operation);
  pendingWrite = result.catch(() => {});
  return result;
}

async function updateLocalStock(order, previous, orders) {
  const restore = previous && previous.status !== 'Cancelled' && order.status === 'Cancelled' &&
    !['Shipped', 'Delivered'].includes(previous.status) && reserves(previous);
  const reserve = order.status !== 'Cancelled' && reserves(order) && (!previous || !reserves(previous));
  if (!restore && !reserve) return;
  if (reserve && comboLimitExceeded(order, orders)) throw new Error('Combo customer limit reached');
  const products = await getProducts();
  for (const item of order.items) {
    const product = products.find(p => p.slug === item.slug);
    if (reserve && (!product?.active || product.stock < item.qty)) throw new Error('Insufficient stock');
    if (product) product.stock += restore ? item.qty : -item.qty;
  }
  await saveProducts(products);
}

export async function insertOrder(order) {
  if (cloudStore) return commitCloudOrder(order);
  return localWrite(async () => {
    const orders = localOrders();
    await updateLocalStock(order, null, orders);
    saveLocalOrders([order, ...orders]);
  });
}
export async function updateOrder(id, fn) {
  if (!cloudStore || localOrders().some(order => order.id === id)) return localWrite(async () => {
    const local = localOrders();
    const existing = local.find(order => order.id === id);
    if (!existing) return null;
    const previous = structuredClone(existing);
    fn(existing);
    if (previous.status === 'Cancelled' && existing.status !== 'Cancelled') throw new Error('Cancelled orders cannot be reopened');
    if (!cloudStore) await updateLocalStock(existing, previous, local);
    saveLocalOrders(local);
    return existing;
  });
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
  id: o.id, createdAt: o.createdAt, items: orderLines(o).map(({ slug, name, weight, price, qty, savings, originalPrice, contents }) => ({ slug, name, weight, price, qty, savings, originalPrice, contents })), subtotal: o.subtotal, deliveryCharge: o.deliveryCharge,
  productSubtotal: o.productSubtotal, productDiscount: o.productDiscount, couponDiscount: o.couponDiscount,
  freeDeliverySavings: o.freeDeliverySavings, total: o.total, status: o.status, payment: o.payment, city: o.customer.city,
  tracking: o.fulfilment?.tracking || undefined,
  confirmed: checkoutCompleted(o),
});

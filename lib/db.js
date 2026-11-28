import fs from 'fs';
import { revalidateTag } from 'next/cache';
import path from 'path';
import { activeCombos } from './combos';
import { DEFAULT_SHIPPING, SHIPPING_ZONES } from './shipping';

const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const file = (n) => path.join(dir, n);
function read(n, fallback) {
  try { return JSON.parse(fs.readFileSync(file(n), 'utf8')); } catch { return fallback; }
}
function write(n, d) {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = file(n) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, file(n));
}

export const DEFAULT_SETTINGS = {
  ...Object.fromEntries(SHIPPING_ZONES.map(([, , key, charge]) => [key, charge])),
  chennaiPinMin: 600001, chennaiPinMax: 600130,
  codEnabled: true, whatsappNumber: '', deliveryTime: '3–5 Business Days',
};
export const cloudStore = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

async function request(route, body, merge = false) {
  const response = await fetch(process.env.SUPABASE_URL + '/rest/v1/' + route, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { apikey: process.env.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json',
      Prefer: merge ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.message || '';
    if (/^(Insufficient stock|Combo customer limit reached|Cancelled orders cannot be reopened|Order changed)/.test(message)) throw new Error(message);
    throw new Error('Store database request failed (' + response.status + ')');
  }
  if (body === undefined) return response.json();
  if (route === 'store_settings') revalidateTag('public-settings');
  if (route === 'store_products' || route === 'rpc/store_commit_order' || route === 'rpc/store_patch_products') revalidateTag('public-catalogue');
}

export async function getSettings() {
  const saved = cloudStore ? (await request('store_settings?id=eq.true&select=settings'))[0]?.settings : read('settings.json', {});
  const settings = { ...DEFAULT_SETTINGS, ...saved };
  if (!saved?.shipping) {
    for (const [, , key, charge] of SHIPPING_ZONES) settings[key] = charge;
  }
  settings.shipping = { ...DEFAULT_SHIPPING, ...saved?.shipping };
  settings.whatsappNumber ||= process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  return settings;
}
export const saveSettings = settings => cloudStore ? request('store_settings', { id: true, settings }, true) : (write('settings.json', settings), revalidateTag('public-settings'));

export async function getProducts() {
  if (cloudStore) return (await request('store_products?select=product&order=slug')).map(row => row.product);
  return read('products.json', JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/products.json'), 'utf8')));
}
export const saveProducts = products => cloudStore ? request('store_products', products.map(product => ({slug: product.slug, product})), true) : (write('products.json', products), revalidateTag('public-catalogue'));
export async function patchProducts(changes) {
  if (cloudStore) return request('rpc/store_patch_products', { changes });
  const products = await getProducts();
  return saveProducts(products.map(product => ({ ...product, ...changes[product.slug] })));
}
export const getProduct = async slug => (await getProducts()).find(p => p.slug === slug);

export const localOrders = () => read('orders.json', []);
export const saveLocalOrders = orders => write('orders.json', orders);
export async function getOrders() {
  const orders = localOrders();
  if (cloudStore) {
    for (let offset = 0; ; offset += 500) {
      const rows = await request('store_orders?select=details&order=created_at.desc,id&limit=500&offset=' + offset);
      orders.push(...rows.map(row => row.details));
      if (rows.length < 500) break;
    }
  }
  return orders.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}
export async function getOrder(id) {
  const local = localOrders().find(o => o.id === id);
  if (local || !cloudStore) return local;
  return (await request('store_orders?select=details&id=eq.' + encodeURIComponent(id)))[0]?.details;
}
export const commitCloudOrder = (order, previous = null) =>
  request('rpc/store_commit_order', { order_details: order, previous_details: previous });
// Fields safe to ship to the browser
export const publicSettings = (s) => ({
  freeDeliveryEnabled: s.shipping.freeEnabled,
  codEnabled: s.codEnabled, whatsappNumber: s.whatsappNumber, deliveryTime: s.deliveryTime,
  combos: activeCombos(s),
  onlinePayment: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
});

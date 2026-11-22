import fs from 'fs';
import path from 'path';

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
  deliveryChennai: 55, deliveryTN: 70, deliveryOther: 85,
  chennaiPinMin: 600001, chennaiPinMax: 600130,
  codEnabled: true, whatsappNumber: '', deliveryTime: '3–5 Business Days',
};
export const getSettings = () => {
  const s = { ...DEFAULT_SETTINGS, ...read('settings.json', {}) };
  if (!s.whatsappNumber) s.whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  return s;
};
export const saveSettings = (s) => write('settings.json', s);

// products.json ships with the repo and is the editable catalogue (admin can change price/stock/active).
const PRODUCTS_FILE_SEED = path.join(process.cwd(), 'data', 'products.json');
export const getProducts = () => {
  const live = read('products.json', null);
  if (live) return live;
  try { return JSON.parse(fs.readFileSync(PRODUCTS_FILE_SEED, 'utf8')); } catch { return []; }
};
export const saveProducts = (p) => write('products.json', p);
export const getProduct = (slug) => getProducts().find((p) => p.slug === slug);

export const getOrders = () => read('orders.json', []);
export const saveOrders = (o) => write('orders.json', o);
export const getOrder = (id) => getOrders().find((o) => o.id === id);

// Fields safe to ship to the browser
export const publicSettings = (s) => ({
  deliveryChennai: s.deliveryChennai, deliveryTN: s.deliveryTN, deliveryOther: s.deliveryOther,
  chennaiPinMin: s.chennaiPinMin, chennaiPinMax: s.chennaiPinMax,
  codEnabled: s.codEnabled, whatsappNumber: s.whatsappNumber, deliveryTime: s.deliveryTime,
  onlinePayment: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
});

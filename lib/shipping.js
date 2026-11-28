export const SHIPPING_ZONES = [
  ['chennai', 'Within Chennai', 'deliveryChennai', 55, 399],
  ['tn', 'Tamil Nadu outside Chennai', 'deliveryTN', 75, 499],
  ['other', 'Rest of India', 'deliveryOther', 89, 599],
];

export const DEFAULT_SHIPPING = {
  freeEnabled: true,
  minimums: Object.fromEntries(SHIPPING_ZONES.map(([zone, , , , minimum]) => [zone, minimum])),
  pins: {},
};

export const money = value => Math.round(value * 100) / 100;
export const COUPON_RE = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;
export const couponCode = value => typeof value === 'string' ? value.trim().toUpperCase() : '';

export function productTotals(lines, coupon) {
  const price = money(lines.reduce((sum, item) => sum + item.price * item.qty, 0));
  const productSubtotal = money(lines.reduce((sum, item) => {
    const original = Math.max(item.price, item.retailPrice ?? item.originalPrice ?? item.price);
    return sum + original * item.qty;
  }, 0));
  const couponDiscount = coupon ? money(Math.max(0, Math.min(coupon.amount, price - 1))) : 0;
  return { productSubtotal, productDiscount: money(productSubtotal - price), couponDiscount, subtotal: money(price - couponDiscount) };
}

export function deliveryTotals(rule, subtotal) {
  if (!rule?.available) return null;
  const remaining = rule.minimum === null || rule.baseCharge === 0 ? null : money(Math.max(0, rule.minimum - subtotal));
  const free = remaining === 0;
  return {
    remaining,
    charge: free ? 0 : rule.baseCharge,
    savings: free ? rule.baseCharge : 0,
    total: money(subtotal + (free ? 0 : rule.baseCharge)),
  };
}

import { PIN_RE } from '@/lib/delivery';
import { COUPON_RE, SHIPPING_ZONES, couponCode, money } from '@/lib/shipping';

function amount(value, label, minimum = 0) {
  const validType = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
  const number = validType ? Number(value) : NaN;
  if (!Number.isFinite(number) || number < minimum || number > 100000 || money(number) !== number) {
    throw new Error('Enter a valid rupee amount for ' + label + '.');
  }
  return number;
}

export function validateShippingSettings(input) {
  if (typeof input?.freeEnabled !== 'boolean') throw new Error('Choose whether free delivery is enabled.');
  const changes = {};
  const minimums = {};
  for (const [zone, label, key] of SHIPPING_ZONES) {
    changes[key] = amount(input[key], label + ' delivery charge');
    minimums[zone] = amount(input.minimums?.[zone], label + ' free delivery minimum', 1);
  }
  const pins = {};
  if (!Array.isArray(input.pins) || input.pins.length > 500) throw new Error('Enter up to 500 pincode rules.');
  for (const entry of input.pins) {
    const pin = String(entry?.pin ?? '').trim();
    if (!PIN_RE.test(pin) || Object.hasOwn(pins, pin) || typeof entry.enabled !== 'boolean') {
      throw new Error('Enter a unique 6-digit pincode and availability for each rule.');
    }
    pins[pin] = {
      enabled: entry.enabled,
      ...(entry.charge !== '' && entry.charge != null && { charge: amount(entry.charge, pin + ' delivery charge') }),
    };
  }
  const coupons = {};
  if (!Array.isArray(input.coupons) || input.coupons.length > 100) throw new Error('Enter up to 100 coupons.');
  for (const entry of input.coupons) {
    const code = couponCode(entry?.code);
    if (!COUPON_RE.test(code) || Object.hasOwn(coupons, code) || typeof entry.enabled !== 'boolean') {
      throw new Error('Use a unique coupon code with 3–30 letters, digits, underscores or hyphens.');
    }
    coupons[code] = { amount: amount(entry.amount, code + ' discount', 1), enabled: entry.enabled };
  }
  return { ...changes, shipping: { freeEnabled: input.freeEnabled, minimums, pins }, coupons };
}

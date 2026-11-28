import directory from '@/data/shipping-pins.json';
import { PIN_RE, chargeFor } from '@/lib/delivery';
import { COUPON_RE, couponCode } from '@/lib/shipping';

const pins = new Set(directory.india);
const tamilNadu = new Set(directory.tamilNadu);

export function shippingFor(pin, settings) {
  if (!PIN_RE.test(pin)) return { available: false };
  const override = settings.shipping.pins[pin];
  if (override?.enabled === false || (!pins.has(Number(pin)) && !override?.enabled)) return { available: false };
  const inTamilNadu = tamilNadu.has(Number(pin));
  const zone = inTamilNadu && Number(pin) >= settings.chennaiPinMin && Number(pin) <= settings.chennaiPinMax
    ? 'chennai' : inTamilNadu ? 'tn' : 'other';
  return {
    available: true,
    zone,
    baseCharge: override?.charge ?? chargeFor(zone, settings),
    minimum: settings.shipping.freeEnabled ? settings.shipping.minimums[zone] : null,
  };
}

export function findCoupon(value, settings) {
  const code = couponCode(value);
  return COUPON_RE.test(code) && settings.coupons?.[code]?.enabled
    ? { code, amount: settings.coupons[code].amount }
    : null;
}

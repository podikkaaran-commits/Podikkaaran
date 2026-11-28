// Pure functions - used on both client and server. The server always recomputes.
export const PIN_RE = /^[1-9][0-9]{5}$/;
export function chargeFor(zone, s) {
  return zone === 'chennai' ? s.deliveryChennai : zone === 'tn' ? s.deliveryTN : s.deliveryOther;
}
export const ZONE_LABEL = { chennai: 'Within Chennai', tn: 'Tamil Nadu (outside Chennai)', other: 'Other states / cities' };

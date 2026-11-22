// Pure functions - used on both client and server. The server always recomputes.
export const PIN_RE = /^[1-9][0-9]{5}$/;
export function zoneFor({ state, pincode }, s) {
  const n = parseInt(pincode, 10);
  if (String(state || '').toLowerCase() === 'tamil nadu')
    return n >= s.chennaiPinMin && n <= s.chennaiPinMax ? 'chennai' : 'tn';
  return 'other';
}
export function chargeFor(zone, s) {
  return zone === 'chennai' ? s.deliveryChennai : zone === 'tn' ? s.deliveryTN : s.deliveryOther;
}
export const ZONE_LABEL = { chennai: 'Within Chennai', tn: 'Tamil Nadu (outside Chennai)', other: 'Other states / cities' };
// Rough state guess from a pincode alone (used only by the pincode checker widget).
export function stateGuess(pin) {
  const p = parseInt(String(pin).slice(0, 3), 10);
  return p >= 600 && p <= 643 ? 'Tamil Nadu' : 'Other';
}

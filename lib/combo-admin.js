import { comboPreview, eligibleProducts, quoteCombo } from './combos';

const clean = (value, max) => String(value ?? '').trim().slice(0, max);
export const imagePath = value => typeof value === 'string' && /^\/(uploads\/[a-f0-9]{16}\.(jpg|png|webp)|images\/[\w.-]+)$/.test(value);

export function validateCombo(input, catalogue) {
  const c = input || {};
  const slug = clean(c.slug, 80).toLowerCase();
  const name = clean(c.name, 80);
  const packs = Number(c.packs);
  const value = Number(c.value);
  const max = Number(c.max || 0);
  const order = Number(c.order || 0);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || name.length < 2) throw new Error('Enter a name and URL slug using letters, numbers and hyphens.');
  if (!Number.isInteger(packs) || packs < 2 || packs > 50) throw new Error('Choose 2 to 50 packs.');
  if (!Number.isSafeInteger(max) || max < 0 || !Number.isSafeInteger(order) || order < 0) throw new Error('Enter non-negative whole numbers for display order and customer limit.');
  if (!['fixed', 'custom', 'quantity'].includes(c.type) || !['auto', 'manual'].includes(c.eligibility)) throw new Error('Choose a combo type and eligibility mode.');
  if (!['price', 'percent', 'amount'].includes(c.discount) || !Number.isFinite(value) || value <= 0 || (c.discount === 'percent' && value >= 100))
    throw new Error('Enter a positive discount. Percentage must be below 100.');
  const dates = [c.start, c.end].map(date => {
    if (!date) return '';
    if (!Number.isFinite(Date.parse(date))) throw new Error('Enter a valid schedule.');
    return new Date(date).toISOString();
  });
  if (dates[0] && dates[1] && dates[0] >= dates[1]) throw new Error('End date must be after the start date.');
  const products = Object.fromEntries(Object.entries(c.products || {}).map(([key, qty]) => {
    if (!catalogue.some(p => p.slug === key) || !Number.isInteger(Number(qty)) || Number(qty) < 1 || Number(qty) > packs)
      throw new Error('Check the selected products and quantities.');
    return [key, c.type === 'fixed' ? Number(qty) : 1];
  }));
  if (c.type === 'fixed' && Object.values(products).reduce((sum, qty) => sum + qty, 0) !== packs) throw new Error('Fixed product quantities must add up to the pack count.');
  if (c.type !== 'fixed' && c.eligibility === 'manual' && !Object.keys(products).length) throw new Error('Select at least one eligible product.');
  const combo = {
    slug, name, packs, value, max, order, products, type: c.type,
    eligibility: c.type === 'fixed' ? 'manual' : c.eligibility, discount: c.discount,
    description: clean(c.description, 300), badge: clean(c.badge, 30),
    images: (Array.isArray(c.images) ? c.images : []).filter(imagePath).slice(0, 8),
    start: dates[0], end: dates[1], active: c.active === true, home: c.home === true, featured: c.featured === true,
  };
  const priced = eligibleProducts(combo, catalogue.map(p => ({ ...p, stock: packs })));
  if (priced.length && !(c.type === 'fixed' ? quoteCombo(combo, {}, priced) : comboPreview(combo, priced)))
    throw new Error('Current eligible products must support at least one positive combo offer.');
  return combo;
}

export function eligibility(input) {
  const comboEligibility = ['all', 'selected', 'excluded'].includes(input.comboEligibility) ? input.comboEligibility : 'all';
  const comboSlugs = comboEligibility === 'selected' && Array.isArray(input.comboSlugs)
    ? [...new Set(input.comboSlugs.filter(s => typeof s === 'string' && /^[a-z0-9-]{1,80}$/.test(s)))] : [];
  return { comboEligibility, comboSlugs };
}

export function optionalCost(value) {
  if (value == null || value === '') return null;
  const cost = Number(value);
  if (!Number.isFinite(cost) || cost < 0 || cost > 1e6) throw new Error('Enter a valid non-negative cost.');
  return Math.round(cost * 100) / 100;
}

export function businessSettings(input, previous) {
  const fields = ['packagingGrams', 'packagingCost', 'paymentPercent', 'extraCost'];
  const parsed = Object.fromEntries(fields.map(key => [key, optionalCost(input[key])]));
  if (parsed.paymentPercent > 100) throw new Error('Payment fee cannot exceed 100%.');
  parsed.packagingGrams = Math.round(parsed.packagingGrams || 0);
  parsed.courier = Object.fromEntries(['chennai', 'tn', 'other'].map(zone => [zone, {
    standard: optionalCost(input.courier?.[zone]?.standard), heavy: optionalCost(input.courier?.[zone]?.heavy),
  }]));
  return { ...previous, ...parsed };
}

export function fulfilment(input) {
  const tracking = clean(input.tracking, 500);
  if (tracking && !URL.canParse(tracking)) throw new Error('Enter a valid tracking URL.');
  if (tracking && new URL(tracking).protocol !== 'https:') throw new Error('Tracking URL must use HTTPS.');
  return { courier: clean(input.courier, 80), awb: clean(input.awb, 80), tracking, actualCourier: optionalCost(input.actualCourier) };
}

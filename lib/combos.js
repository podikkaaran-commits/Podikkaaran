const defaultCombo = (slug, name, packs, value, order, badge = '') => ({
  slug, name, packs, value, order, badge, description: 'Mix and match your favourite homemade podis.',
  type: 'custom', eligibility: 'auto', products: {}, discount: 'amount',
  active: true, home: true, featured: !!badge, max: 0, images: [],
});

export const DEFAULT_COMBOS = [
  defaultCombo('starter-combo', 'Starter Combo', 2, 9, 1),
  defaultCombo('healthy-combo', 'Healthy Combo', 3, 18, 2),
  defaultCombo('family-combo', 'Family Combo', 4, 27, 3, 'Best Value'),
  defaultCombo('monthly-saver-combo', 'Monthly Saver Combo', 6, 15, 4),
];

export const configuredCombos = (settings) => settings.combos ?? DEFAULT_COMBOS;
export const activeCombos = (settings, now = Date.now()) => configuredCombos(settings)
  .filter(c => c.active && (!c.start || Date.parse(c.start) <= now) && (!c.end || now < Date.parse(c.end)))
  .sort((a, b) => a.order - b.order || Number(b.featured) - Number(a.featured));

export function eligibleProducts(combo, products) {
  return products.filter(p => p.active !== false && p.comboEligibility !== 'excluded' &&
    (combo.type === 'fixed' || combo.eligibility === 'manual'
      ? Object.hasOwn(combo.products, p.slug)
      : p.comboEligibility !== 'selected' || (p.comboSlugs || []).includes(combo.slug)));
}

export function grams(weight) {
  const match = /^([\d.]+)\s*(kg|g|gm|grams?)$/i.exec(String(weight).trim());
  return match ? Math.round(Number(match[1]) * (match[2].toLowerCase() === 'kg' ? 1000 : 1)) : 0;
}

const money = value => Math.round(value * 100) / 100;

export function quoteCombo(combo, selection, products, { checkStock = true } = {}) {
  const chosen = combo.type === 'fixed' ? combo.products : selection;
  const eligible = eligibleProducts(combo, products);
  const items = [];
  for (const [slug, qty] of Object.entries(chosen || {})) {
    const p = eligible.find(product => product.slug === slug);
    if (!p || !Number.isInteger(qty) || qty < 1 || qty > combo.packs || (checkStock && qty > p.stock)) return null;
    items.push({ slug, qty, name: p.name, price: p.price, weight: p.weight, originalPrice: p.originalPrice });
  }
  if (items.reduce((sum, item) => sum + item.qty, 0) !== combo.packs) return null;
  const originalPrice = money(items.reduce((sum, item) => sum + item.price * item.qty, 0));
  const retailPrice = money(items.reduce((sum, item) => sum + Math.max(item.price, item.originalPrice ?? item.price) * item.qty, 0));
  const target = combo.discount === 'price' ? combo.value :
    combo.discount === 'percent' ? originalPrice * (1 - combo.value / 100) : originalPrice - combo.value;
  const price = money(Math.min(originalPrice, Math.max(0, target)));
  if (!(price > 0 && price < originalPrice)) return null;
  const savings = money(originalPrice - price);
  const weight = items.reduce((sum, item) => sum + grams(item.weight) * item.qty, 0);
  return { items, originalPrice, retailPrice, price, savings, weight, percent: Math.round(savings / originalPrice * 100) };
}

export function comboPreview(combo, products) {
  if (combo.type === 'fixed') return quoteCombo(combo, {}, products);
  const eligible = eligibleProducts(combo, products).filter(p => p.stock > 0);
  const build = (direction) => {
    let remaining = combo.packs;
    const selection = {};
    for (const p of [...eligible].sort((a, b) => direction * (a.price - b.price))) {
      const qty = Math.min(remaining, p.stock);
      if (qty > 0) selection[p.slug] = qty;
      remaining -= qty;
      if (!remaining) break;
    }
    return quoteCombo(combo, selection, products);
  };
  const cheapest = build(1), highest = build(-1), quote = cheapest || highest;
  return quote && { ...quote, example: !cheapest, varies: !cheapest || cheapest.price !== highest?.price || cheapest.originalPrice !== highest?.originalPrice ||
    new Set(eligible.map(p => grams(p.weight))).size > 1 };
}

export function orderLines(order) {
  return [
    ...(order.individualItems ?? order.items),
    ...(order.combos || []).map(c => ({ ...c, weight: c.weight + 'g', contents: c.items })),
  ];
}

export function orderTotals(items, subtotal, deliveryCharge, method, zone, business = {}) {
  const productWeight = items.reduce((sum, i) => sum + grams(i.weight) * i.qty, 0);
  const shipmentWeight = productWeight + (business.packagingGrams || 0);
  const manufacturingCosts = Object.fromEntries(items.map(i => [i.slug, business.productCosts?.[i.slug] ?? null]));
  const manufacturing = items.every(i => Number.isFinite(manufacturingCosts[i.slug]))
    ? money(items.reduce((sum, i) => sum + manufacturingCosts[i.slug] * i.qty, 0)) : null;
  const tiers = business.courier?.[zone];
  const courier = (shipmentWeight > 500 ? tiers?.heavy : tiers?.standard) ?? null;
  const packaging = business.packagingCost ?? null;
  const paymentFee = method === 'razorpay' && Number.isFinite(business.paymentPercent)
    ? money((subtotal + deliveryCharge) * business.paymentPercent / 100) : method === 'cod' ? 0 : null;
  const extra = business.extraCost ?? null;
  return { productWeight, shipmentWeight, expenses: { manufacturing, manufacturingCosts, courier, packaging, paymentFee, extra } };
}

export function orderProfit(order, actual = false) {
  if (!order.expenses || order.status === 'Cancelled') return null;
  const { manufacturing, courier, packaging, paymentFee, extra } = order.expenses;
  const amounts = [manufacturing, actual ? order.fulfilment?.actualCourier : courier, packaging, paymentFee, extra];
  return amounts.every(Number.isFinite) ? money(order.total - amounts.reduce((sum, amount) => sum + amount, 0)) : null;
}

export function comboLimitExceeded(order, orders) {
  const totals = {};
  for (const combo of order.combos || []) totals[combo.slug] = (totals[combo.slug] || 0) + combo.qty;
  return (order.combos || []).some(combo => combo.max && totals[combo.slug] + orders
    .filter(o => o.id !== order.id && o.customer.mobile === order.customer.mobile && o.status !== 'Cancelled' &&
      (o.payment.method === 'cod' || o.payment.status === 'paid'))
    .flatMap(o => o.combos || []).filter(c => c.slug === combo.slug).reduce((sum, c) => sum + c.qty, 0) > combo.max);
}

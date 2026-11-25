import { orderProfit } from './combos';

export const saleDate = timestamp => new Date(Date.parse(timestamp) + 330 * 60000).toISOString().slice(0, 10);

export function salesInRange(orders, from, to) {
  return orders.filter(o => {
    if (o.status === 'Cancelled' || (o.payment.method !== 'cod' && o.payment.status !== 'paid')) return false;
    const date = saleDate(o.createdAt);
    return (!from || from <= date) && (!to || date <= to);
  });
}

export const courierCost = order => order.fulfilment?.actualCourier ?? order.expenses?.courier;

export function salesSummary(orders) {
  const combos = new Map();
  const sum = value => orders.reduce((total, order) => total + (value(order) || 0), 0);
  for (const order of orders) for (const c of order.combos || []) {
    const current = combos.get(c.slug);
    combos.set(c.slug, { name: c.name, qty: (current?.qty || 0) + c.qty });
  }
  const best = [...combos.values()].sort((a, b) => b.qty - a.qty)[0];
  const entries = [
    ['Combo orders', orders.filter(o => o.combos?.length).length],
    ['Orders with individual products', orders.filter(o => (o.individualItems ?? o.items).length).length],
    ['Packs sold', sum(o => o.items.reduce((total, i) => total + i.qty, 0))],
    ['Product revenue', sum(o => o.subtotal), true],
    ['Delivery charges collected', sum(o => ['paid', 'cod_collected'].includes(o.payment.status) ? o.deliveryCharge : 0), true],
    ['Courier expenses (actual or estimated)', sum(courierCost), true],
    ['Manufacturing expenses (recorded)', sum(o => o.expenses?.manufacturing), true],
    ['Outer packaging expenses (recorded)', sum(o => o.expenses?.packaging), true],
    ['Estimated profit (orders with costs)', sum(o => orderProfit(o)), true],
    ['Recorded profit (orders with actual courier cost)', sum(o => orderProfit(o, true)), true],
    ['Bestselling combo', best?.name || '—'],
    ['Average order value', orders.length ? sum(o => o.total) / orders.length : 0, true],
  ];
  return entries;
}

export function periodKey(date, period) {
  if (period === 'day') return date;
  if (period !== 'week') return date.slice(0, 7);
  const week = new Date(date);
  week.setUTCDate(week.getUTCDate() - (week.getUTCDay() + 6) % 7);
  return week.toISOString().slice(0, 10);
}

export function salesByPeriod(orders, period) {
  const groups = new Map();
  for (const o of orders) {
    const key = periodKey(saleDate(o.createdAt), period);
    const group = groups.get(key) || { key, count: 0, revenue: 0 };
    group.count++;
    group.revenue += o.total;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

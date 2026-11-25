import { orderProfit } from './combos';
import { periodKey, saleDate } from './combo-sales';

const emptyTotals = () => ({
  orders: 0, sales: 0, productCost: 0, costOrders: 0, razorpay: 0, codCollected: 0, codPending: 0,
  estimatedProfit: 0, estimatedOrders: 0, recordedProfit: 0, recordedOrders: 0,
});

export function businessOverview(orders, { from, to, period }) {
  const totals = emptyTotals();
  const groups = new Map();

  function record(at, values) {
    if (!Number.isFinite(Date.parse(at))) return;
    const date = saleDate(at);
    if ((from && date < from) || (to && date > to)) return;
    const key = periodKey(date, period);
    const group = period === 'all' ? null : groups.get(key) || emptyTotals();
    if (group) groups.set(key, group);
    for (const [metric, value] of Object.entries(values)) {
      totals[metric] += value;
      if (group) group[metric] += value;
    }
  }

  for (const order of orders) {
    const { method, status, paidAt } = order.payment;
    const cod = method === 'cod';
    const activeSale = order.status !== 'Cancelled' && (cod || status === 'paid');
    if (activeSale) {
      const cost = order.expenses?.manufacturing;
      const estimate = orderProfit(order);
      const actual = orderProfit(order, true);
      record(order.createdAt, {
        orders: 1, sales: order.total,
        ...(Number.isFinite(cost) && { productCost: cost, costOrders: 1 }),
        ...(estimate !== null && { estimatedProfit: estimate, estimatedOrders: 1 }),
        ...(actual !== null && { recordedProfit: actual, recordedOrders: 1 }),
        ...(cod && status !== 'cod_collected' && { codPending: order.total }),
      });
    }

    if (method === 'razorpay' && status === 'paid') {
      record(paidAt || order.createdAt, { razorpay: order.total });
    }
    if (cod && status === 'cod_collected') {
      const delivered = order.statusHistory?.find(entry => entry.status === 'Delivered');
      record(delivered?.at || order.createdAt, { codCollected: order.total });
    }
  }

  return { totals, rows: [...groups].sort(([a], [b]) => b.localeCompare(a)).map(([key, values]) => ({ key, ...values })) };
}

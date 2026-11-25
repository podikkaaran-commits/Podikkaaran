import { isAdmin } from '@/lib/auth';
import { getOrders } from '@/lib/db';
import { courierCost, saleDate, salesByPeriod, salesInRange, salesSummary } from '@/lib/combo-sales';
import { orderProfit } from '@/lib/combos';

export const dynamic = 'force-dynamic';
// CSV opens directly in Excel and Google Sheets. BOM keeps Tamil/₹ characters correct.
const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // block spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};
function exportCsv(rows, name) {
  const csv = '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + name + '-' + new Date().toISOString().slice(0, 10) + '.csv"' } });
}
export async function GET(req) {
  if (!isAdmin()) return new Response('Unauthorized', { status: 401 });
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status'), from = sp.get('from'), to = sp.get('to');
  let orders = await getOrders();
  if (sp.get('report') === 'combo') {
    const sales = salesInRange(orders, from, to);
    return exportCsv([['Metric', 'Value'], ...salesSummary(sales).map(([label, value]) => [label, value]), [],
      ['Period', 'Orders', 'Total revenue (INR)'],
      ...salesByPeriod(sales, sp.get('period') || 'day').map(row => [row.key, row.count, row.revenue])], 'podikkaaran-combo-sales');
  }
  if (status && status !== 'All') orders = orders.filter((o) => o.status === status);
  if (from) orders = orders.filter((o) => saleDate(o.createdAt) >= from);
  if (to) orders = orders.filter((o) => saleDate(o.createdAt) <= to);
  const head = ['Order ID', 'Date', 'Time', 'Status', 'Payment Method', 'Payment Status', 'Customer Name', 'Mobile', 'House/Flat', 'Street', 'Area', 'City', 'State', 'Pincode', 'Items', 'Subtotal (INR)', 'Delivery Charge (INR)', 'Total (INR)', 'Combos', 'Shipment weight (g)', 'Manufacturing', 'Courier expense', 'Estimated profit', 'Recorded profit', 'Courier partner', 'AWB', 'Tracking link'];
  const rows = orders.map((o) => {
    const d = new Date(o.createdAt), ist = new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString();
    const c = o.customer;
    return [o.id, ist.slice(0, 10), ist.slice(11, 16), o.status, o.payment.method === 'cod' ? 'COD' : 'Online', o.payment.status, c.name, c.mobile, c.house, c.street, c.area, c.city, c.state, c.pincode,
      o.items.map((i) => `${i.name} ${i.weight} x${i.qty}`).join(' | '), o.subtotal, o.deliveryCharge, o.total,
      (o.combos || []).map(combo => combo.name + ' x' + combo.qty + ' (' + combo.items.map(i => i.name + ' x' + i.qty).join(', ') + ')').join(' | '),
      o.shipmentWeight, o.expenses?.manufacturing, courierCost(o), orderProfit(o), orderProfit(o, true), o.fulfilment?.courier, o.fulfilment?.awb, o.fulfilment?.tracking];
  });
  return exportCsv([head, ...rows], 'podikkaaran-orders');
}

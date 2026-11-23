import { isAdmin } from '@/lib/auth';
import { getOrders } from '@/lib/db';

export const dynamic = 'force-dynamic';
// CSV opens directly in Excel and Google Sheets. BOM keeps Tamil/₹ characters correct.
const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // block spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};
export async function GET(req) {
  if (!isAdmin()) return new Response('Unauthorized', { status: 401 });
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status'), from = sp.get('from'), to = sp.get('to');
  let orders = await getOrders();
  if (status && status !== 'All') orders = orders.filter((o) => o.status === status);
  if (from) orders = orders.filter((o) => o.createdAt.slice(0, 10) >= from);
  if (to) orders = orders.filter((o) => o.createdAt.slice(0, 10) <= to);
  const head = ['Order ID', 'Date', 'Time', 'Status', 'Payment Method', 'Payment Status', 'Customer Name', 'Mobile', 'House/Flat', 'Street', 'Area', 'City', 'State', 'Pincode', 'Items', 'Subtotal (INR)', 'Delivery Charge (INR)', 'Total (INR)'];
  const rows = orders.map((o) => {
    const d = new Date(o.createdAt), ist = new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString();
    const c = o.customer;
    return [o.id, ist.slice(0, 10), ist.slice(11, 16), o.status, o.payment.method === 'cod' ? 'COD' : 'Online', o.payment.status, c.name, c.mobile, c.house, c.street, c.area, c.city, c.state, c.pincode,
      o.items.map((i) => `${i.name} ${i.weight} x${i.qty}`).join(' | '), o.subtotal, o.deliveryCharge, o.total];
  });
  const csv = '\uFEFF' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="podikkaaran-orders-${new Date().toISOString().slice(0, 10)}.csv"` } });
}

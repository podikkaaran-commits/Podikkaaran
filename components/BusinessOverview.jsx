'use client';

import { useMemo, useState } from 'react';
import { businessOverview } from '@/lib/business-overview';
import { rupee } from '@/lib/site';

const periods = [['all', 'Overall'], ['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly']];
const amount = value => rupee(Math.round(value * 100) / 100);
const coveredAmount = (value, coverage) => coverage ? amount(value) : '—';
const metrics = [
  ['Orders', row => row.orders],
  ['Total sales', row => amount(row.sales)],
  ['Product cost on orders', row => coveredAmount(row.productCost, row.costOrders), 'costOrders'],
  ['Total received', row => amount(row.razorpay + row.codCollected)],
  ['Razorpay received', row => amount(row.razorpay)],
  ['COD collected', row => amount(row.codCollected)],
  ['COD pending', row => amount(row.codPending)],
  ['Estimated profit', row => coveredAmount(row.estimatedProfit, row.estimatedOrders), 'estimatedOrders'],
  ['Recorded profit', row => coveredAmount(row.recordedProfit, row.recordedOrders), 'recordedOrders'],
  ['Delivery charges on orders', row => amount(row.shippingCharges)],
  ['Delivery charges collected', row => amount(row.shippingCollected)],
  ['Actual courier expenses', row => coveredAmount(row.actualCourier, row.courierOrders), 'courierOrders'],
  ['Shipping profit / loss', row => coveredAmount(row.shippingProfit, row.courierOrders), 'courierOrders'],
];

const dateLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function periodLabel(key, period) {
  if (period === 'month') return monthLabel.format(new Date(key + '-01'));
  const date = dateLabel.format(new Date(key));
  return period === 'week' ? 'Week of ' + date : date;
}

export default function BusinessOverview({ orders }) {
  const [period, setPeriod] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const invalidRange = Boolean(from && to && from > to);
  const { totals, rows } = useMemo(() => businessOverview(orders, { from, to, period }), [orders, from, to, period]);

  return (
    <section className="space-y-5" aria-labelledby="business-overview">
      <h2 id="business-overview" className="text-2xl">Business Overview</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Report period">
          {periods.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={value === period} className={value === period ? 'btn-primary' : 'btn-outline'}
              onClick={() => setPeriod(value)}>{label}</button>
          ))}
        </div>
        <label><span className="label">From (India time)</span><input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label><span className="label">To (India time)</span><input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        {(from || to) && <button type="button" className="btn-outline" onClick={() => { setFrom(''); setTo(''); }}>Clear dates</button>}
      </div>
      {invalidRange ? <p className="err" role="alert">Choose an end date on or after the start date.</p> : <>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {metrics.map(([label, display, coverage]) => (
            <div key={label} className="card p-3 sm:p-4">
              <dt className="text-sm">{label}</dt>
              <dd className="mt-1 break-words text-xl font-bold text-forest">{display(totals)}</dd>
              {coverage && <dd className="mt-1 text-xs">{totals[coverage]} of {totals.orders} orders have the required costs</dd>}
            </div>
          ))}
        </dl>
        <p className="text-sm">Sales, pending COD and profit use the order date. Receipts use the payment or delivery date when recorded.
          Razorpay totals show captured payments before settlement fees or refunds. Product costs come from saved order costs.
          Shipping profit uses the customer delivery charge less actual courier cost for orders with a recorded courier expense.</p>
        {period !== 'all' && <div className="card overflow-x-auto p-3" tabIndex={0} role="region" aria-label="Period breakdown">
          <table className="w-full border-collapse text-left text-sm">
            <thead><tr><th scope="col" className="p-2">Period</th>{metrics.map(([label]) => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
            <tbody>
              {rows.map(row => <tr key={row.key} className="border-t border-brown/10">
                <th scope="row" className="whitespace-nowrap p-2">{periodLabel(row.key, period)}</th>
                {metrics.map(([label, display]) => <td className="whitespace-nowrap p-2" key={label}>{display(row)}</td>)}
              </tr>)}
              {!rows.length && <tr><td className="p-2" colSpan={metrics.length + 1}>No activity in this date range.</td></tr>}
            </tbody>
          </table>
        </div>}
      </>}
    </section>
  );
}

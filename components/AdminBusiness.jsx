'use client';

import { useState } from 'react';
import { orderProfit } from '@/lib/combos';
import { salesByPeriod, salesInRange, salesSummary } from '@/lib/combo-sales';
import { ZONE_LABEL } from '@/lib/delivery';
import { rupee, SITE } from '@/lib/site';
import { checkoutCompleted } from '@/lib/order-status';

const amount = value => Number.isFinite(value) ? rupee(value) : '—';

async function save(api, data, note, reload) {
  try {
    const r = await api(data);
    if (!r.ok) throw new Error((await r.json()).error);
    await reload();
    note('Saved');
  } catch (error) { note(error.message || 'Could not save'); }
}

export function BusinessCosts({ business = {}, api, note, reload }) {
  const [values, set] = useState(business);
  const field = (label, value, onChange, step = '0.01') => <label key={label}><span className="label">{label}</span>
    <input className="input" type="number" min="0" step={step} value={value ?? ''} onChange={e => onChange(e.target.value)} /></label>;
  return <form className="card space-y-3 p-5" onSubmit={e => { e.preventDefault(); save(api, { kind: 'business', settings: values }, note, reload); }}>
    <h2 className="text-xl">Order costs</h2>
    <p className="text-sm">Used for future orders. Enter 0 for an expense that does not apply.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {[['packagingGrams', 'Outer packaging weight (g)'], ['packagingCost', 'Outer packaging cost (₹)'],
        ['paymentPercent', 'Online payment fee (%)'], ['extraCost', 'Additional expenses per order (₹)']]
        .map(([key, label]) => field(label, values[key], value => set(v => ({ ...v, [key]: value })), key === 'packagingGrams' ? '1' : '0.01'))}
    </div>
    {Object.entries(ZONE_LABEL).map(([zone, name]) => <fieldset key={zone} className="grid gap-2 rounded-lg bg-cream p-3 sm:grid-cols-2">
      <legend className="font-semibold">{name}</legend>
      {[['standard', 'Up to 500g (₹)'], ['heavy', 'Over 500g (₹)']].map(([key, label]) => field(label, values.courier?.[zone]?.[key],
        value => set(v => ({ ...v, courier: { ...v.courier, [zone]: { ...v.courier?.[zone], [key]: value } } }))))}
    </fieldset>)}
    <button className="btn-primary">Save costs</button>
  </form>;
}

export function Fulfilment({ order, api, note, reload }) {
  const [values, set] = useState(() => ({
    ...order.fulfilment,
    ...(order.fulfilment?.shadowfax?.state === 'pending' ? { courier: 'Shadowfax' } : {}),
  }));
  const update = key => e => set(current => ({ ...current, [key]: e.target.value }));
  const partners = ['Shadowfax', 'ATS', 'Shree Maruti', 'Other'];
  const [carrierResult, setCarrierResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const booking = order.fulfilment?.shadowfax;
  const [weight, setWeight] = useState(booking?.weightGrams ?? order.shipmentWeight ?? '');
  const [bookingNow, setBookingNow] = useState(false);
  const canBook = checkoutCompleted(order) && !['Shipped', 'Delivered'].includes(order.status) && !order.fulfilment?.awb;
  const bookingLinked = booking?.state === 'booked';

  async function bookShipment(event) {
    event.preventDefault();
    if (!window.confirm('Book this shipment with Shadowfax? Booking sends the delivery details to Shadowfax and may incur courier charges.')) return;
    setBookingNow(true);
    setCarrierResult(null);
    try {
      const response = await fetch('/api/admin/shadowfax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, weightGrams: Number(weight) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Shadowfax booking failed.');
      set(result.fulfilment);
      setCarrierResult({ message: 'Shadowfax (' + result.mode + ') booked. AWB ' + result.fulfilment.awb });
      await reload();
    } catch (error) {
      setCarrierResult({ error: error.message });
    } finally {
      setBookingNow(false);
    }
  }

  async function checkShadowfax(query) {
    setChecking(true);
    setCarrierResult(null);
    try {
      const response = await fetch('/api/admin/shadowfax?' + new URLSearchParams(query));
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Shadowfax check failed.');
      const leg = query.leg === 'pickup' ? 'pickup' : 'delivery';
      const message = result.trackingStatus || (result.tiers.length ? 'Available ' + leg + ' tiers: ' + result.tiers.join(', ') : 'No ' + leg + ' tiers found for this pincode.');
      setCarrierResult({ message: 'Shadowfax (' + result.mode + '): ' + message });
    } catch (error) {
      setCarrierResult({ error: error.message });
    } finally {
      setChecking(false);
    }
  }
  return <details className="mt-4 border-t border-brown/10 pt-3">
    <summary className="cursor-pointer font-semibold">Shipping and expenses {order.shipmentWeight > 500 && <span className="err">· Over 500g</span>}</summary>
    <dl className="my-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[['Shipment weight', order.shipmentWeight == null ? '—' : order.shipmentWeight + 'g'], ['Estimated courier', amount(order.expenses?.courier)],
        ['Manufacturing', amount(order.expenses?.manufacturing)], ['Packaging', amount(order.expenses?.packaging)], ['Payment fee', amount(order.expenses?.paymentFee)],
        ['Extra expenses', amount(order.expenses?.extra)], ['Estimated profit', amount(orderProfit(order))], ['Recorded profit', amount(orderProfit(order, true))]
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}
    </dl>
    <form className="grid gap-2 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); save(api, { kind: 'fulfilment', id: order.id, fulfilment: values }, note, reload); }}>
      <label><span className="label">Courier partner</span><select className="input" disabled={bookingLinked || bookingNow} value={values.courier || ''} onChange={update('courier')}>
        <option value="">Select a partner</option>{partners.map(name => <option key={name}>{name}</option>)}</select></label>
      {[['awb', 'AWB number', 'text'], ['tracking', 'Tracking link', 'url'], ['actualCourier', 'Actual courier expense (₹)', 'number']].map(([key, label, type]) =>
        <label key={key}><span className="label">{label}</span><input className="input" type={type} min="0" step="0.01" readOnly={bookingLinked && key === 'awb'} value={values[key] ?? ''} onChange={update(key)} /></label>)}
      <button className="btn-outline sm:w-fit" disabled={bookingNow}>{booking?.state === 'pending' ? 'Verify and save existing AWB' : 'Save shipment details'}</button>
    </form>
    {(values.courier === 'Shadowfax' || booking) && <div className="mt-3 space-y-2">
      {canBook && <form className="flex flex-wrap items-end gap-2" onSubmit={bookShipment}>
        <label><span className="label">Packed parcel weight (g)</span>
          <input className="input" type="number" min="1" step="1" required value={weight}
            readOnly={booking?.state === 'pending'} onChange={event => setWeight(event.target.value)} />
        </label>
        <button className="btn-primary" disabled={bookingNow || checking}>{bookingNow ? 'Booking…' : booking ? 'Retry Shadowfax booking' : 'Book with Shadowfax'}</button>
      </form>}
      {bookingLinked && <p>Booked in Shadowfax {booking.mode} · AWB {order.fulfilment.awb}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-outline" disabled={checking || bookingNow} onClick={() => checkShadowfax({ pincode: order.customer.pincode })}>Check delivery pincode</button>
        <button type="button" className="btn-outline" disabled={checking || bookingNow} onClick={() => checkShadowfax({ pincode: SITE.address.pin, leg: 'pickup' })}>Check store pickup pincode</button>
        {order.fulfilment?.courier === 'Shadowfax' && order.fulfilment.awb &&
          <button type="button" className="btn-outline" disabled={checking} onClick={() => checkShadowfax({ orderId: order.id })}>Check saved AWB</button>}
      </div>
      {checking && <p role="status">Checking Shadowfax…</p>}
      {carrierResult?.message && <p role="status">{carrierResult.message}</p>}
      {carrierResult?.error && <p className="err" role="alert">{carrierResult.error}</p>}
    </div>}
  </details>;
}

export function ComboAnalytics({ orders }) {
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [period, setPeriod] = useState('day');
  const list = salesInRange(orders, from, to);
  return <section className="space-y-4">
    <h2 className="text-2xl">Combo Analytics</h2>
    <div className="flex flex-wrap items-end gap-3">
      <label><span className="label">From (India time)</span><input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label><span className="label">To (India time)</span><input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      <a className="btn-accent" href={'/api/admin/export?report=combo&from=' + from + '&to=' + to + '&period=' + period}>Export analytics CSV</a>
    </div>
    <p className="text-sm">Includes confirmed online orders and active COD orders. Expenses and profit use orders with the applicable costs recorded.</p>
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{salesSummary(list).map(([label, value, money]) =>
      <div className="card p-3" key={label}><dt className="text-sm">{label}</dt><dd className="font-bold">{money ? amount(value) : value}</dd></div>)}</dl>
    <label className="block max-w-xs"><span className="label">Group sales by</span><select className="input" value={period} onChange={e => setPeriod(e.target.value)}>
      <option value="day">Day</option><option value="week">Week starting Monday</option><option value="month">Month</option></select></label>
    <table className="w-full text-left text-sm"><thead><tr><th>Period</th><th>Orders</th><th>Total revenue</th></tr></thead>
      <tbody>{salesByPeriod(list, period).map(group => <tr className="border-t border-brown/10" key={group.key}>
        <td className="py-2">{group.key}</td><td>{group.count}</td><td>{amount(group.revenue)}</td></tr>)}
        {!list.length && <tr><td colSpan={3} className="py-2">No sales in this date range.</td></tr>}</tbody>
    </table>
  </section>;
}

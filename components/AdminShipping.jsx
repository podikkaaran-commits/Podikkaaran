'use client';

import { useState } from 'react';
import { SHIPPING_ZONES } from '@/lib/shipping';

export default function AdminShipping({ settings, api, reload, note }) {
  const [draft, setDraft] = useState(() => ({
    ...Object.fromEntries(SHIPPING_ZONES.map(([, , key]) => [key, settings[key]])),
    freeEnabled: settings.shipping.freeEnabled,
    minimums: settings.shipping.minimums,
    pins: Object.entries(settings.shipping.pins).map(([pin, rule], id) => ({ ...rule, pin, id })),
    coupons: Object.entries(settings.coupons || {}).map(([code, rule], id) => ({ ...rule, code, id })),
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const edit = (list, id, key, value) => setDraft(current => ({
    ...current, [list]: current[list].map(row => row.id === id ? { ...row, [key]: value } : row),
  }));
  const add = (list, row) => setDraft(current => ({ ...current, [list]: [...current[list], { ...row, id: crypto.randomUUID() }] }));
  const remove = (list, id) => setDraft(current => ({ ...current, [list]: current[list].filter(row => row.id !== id) }));

  async function save(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await api({ kind: 'shipping', shipping: draft });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not save shipping settings.');
      await reload();
      note('Shipping settings saved');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return <form className="card space-y-5 p-5" onSubmit={save}>
    <h2 className="text-xl">Shipping &amp; Delivery Settings</h2>
    <fieldset disabled={busy} className="space-y-4">
      <label className="flex items-center gap-2"><input type="checkbox" checked={draft.freeEnabled} onChange={e => set('freeEnabled', e.target.checked)} /> Enable free delivery</label>
      <div className="grid gap-3 md:grid-cols-3">
        {SHIPPING_ZONES.map(([zone, label, key]) => <fieldset key={zone} className="space-y-2 rounded-xl bg-cream p-3">
          <legend className="font-semibold">{label}</legend>
          <label><span className="label">Charge per order (₹)</span><input className="input" type="number" min="0" max="100000" step="0.01" required value={draft[key]} onChange={e => set(key, e.target.value)} /></label>
          <label><span className="label">Free delivery from (₹)</span><input className="input" type="number" min="1" max="100000" step="0.01" required value={draft.minimums[zone]} onChange={e => setDraft(current => ({ ...current, minimums: { ...current.minimums, [zone]: e.target.value } }))} /></label>
        </fieldset>)}
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">Pincode availability and charge overrides</legend>
        {draft.pins.map(row => <div key={row.id} className="grid items-end gap-2 rounded-xl bg-cream p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <label><span className="label">Pincode</span><input className="input" required pattern="[1-9][0-9]{5}" inputMode="numeric" maxLength={6} value={row.pin} onChange={e => edit('pins', row.id, 'pin', e.target.value)} /></label>
          <label><span className="label">Availability</span><select className="input" value={String(row.enabled)} onChange={e => edit('pins', row.id, 'enabled', e.target.value === 'true')}><option value="true">Available</option><option value="false">Unavailable</option></select></label>
          <label><span className="label">Override charge (₹)</span><input className="input" type="number" min="0" max="100000" step="0.01" placeholder="Use standard charge" value={row.charge ?? ''} onChange={e => edit('pins', row.id, 'charge', e.target.value)} /></label>
          <button type="button" className="btn-outline" onClick={() => remove('pins', row.id)}>Remove</button>
        </div>)}
        <button type="button" className="btn-outline" onClick={() => add('pins', { pin: '', enabled: true, charge: '' })}>Add pincode rule</button>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">Coupons</legend>
        {draft.coupons.map(row => <div key={row.id} className="grid items-end gap-2 rounded-xl bg-cream p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <label><span className="label">Code</span><input className="input" type="text" required minLength={3} maxLength={30} value={row.code} onChange={e => edit('coupons', row.id, 'code', e.target.value)} /></label>
          <label><span className="label">Fixed discount (₹)</span><input className="input" type="number" min="1" max="100000" step="0.01" required value={row.amount} onChange={e => edit('coupons', row.id, 'amount', e.target.value)} /></label>
          <label className="flex items-center gap-2 self-center"><input type="checkbox" checked={row.enabled} onChange={e => edit('coupons', row.id, 'enabled', e.target.checked)} /> Enabled</label>
          <button type="button" className="btn-outline" onClick={() => remove('coupons', row.id)}>Remove</button>
        </div>)}
        <button type="button" className="btn-outline" onClick={() => add('coupons', { code: '', amount: '', enabled: true })}>Add coupon</button>
      </fieldset>
      <button className="btn-primary">{busy ? 'Saving…' : 'Save shipping settings'}</button>
    </fieldset>
    {error && <p className="err" role="alert">{error}</p>}
  </form>;
}

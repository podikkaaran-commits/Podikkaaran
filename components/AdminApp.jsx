'use client';
import { useCallback, useEffect, useState } from 'react';
import { rupee } from '@/lib/site';
import { configuredCombos, orderLines } from '@/lib/combos';
import AdminCombos, { ProductEligibility } from '@/components/AdminCombos';
import { BusinessCosts, ComboAnalytics, Fulfilment } from '@/components/AdminBusiness';

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const api = (body) => fetch('/api/admin/data', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export default function AdminApp() {
  const [data, setData] = useState(null), [auth, setAuth] = useState(null), [pw, setPw] = useState(''), [err, setErr] = useState(''), [tab, setTab] = useState('orders'), [flash, setFlash] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/admin/data');
    if (r.status === 401) { setAuth(false); return; }
    setData(await r.json()); setAuth(true);
  }, []);
  useEffect(() => { load(); }, [load]);
  const note = (m) => { setFlash(m); setTimeout(() => setFlash(''), 2500); };

  async function login(e) {
    e.preventDefault(); setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    if (r.ok) { setPw(''); load(); } else setErr((await r.json()).error);
  }
  async function logout() { await fetch('/api/admin/login', { method: 'DELETE' }); setAuth(false); setData(null); }

  if (auth === null) return <p className="wrap py-10">Loading…</p>;
  if (!auth) return (
    <form onSubmit={login} className="wrap max-w-sm space-y-3 py-16"><h1 className="text-3xl">Admin login</h1>
      <label className="label" htmlFor="pw">Password</label><input id="pw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
      {err && <p className="err" role="alert">{err}</p>}<button className="btn-primary w-full">Log in</button></form>
  );
  return (
    <div className="wrap py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl">Admin dashboard</h1><div className="flex flex-wrap gap-2">
        {['orders', 'products', 'Combo Offers', 'Combo Analytics', 'settings'].map((t) => <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn-primary' : 'btn-outline'}>{t[0].toUpperCase() + t.slice(1)}</button>)}
        <button onClick={logout} className="btn-outline">Log out</button></div></div>
      {flash && <p className="fixed right-4 top-20 z-50 rounded-lg bg-forest px-4 py-2 text-cream shadow-lg" role="status">{flash}</p>}
      {tab === 'orders' && <Orders orders={data.orders} reload={load} note={note} />}
      {tab === 'products' && <Products products={data.products} settings={data.settings} reload={load} note={note} />}
      {tab === 'Combo Offers' && <AdminCombos settings={data.settings} products={data.products} api={api} reload={load} note={note} />}
      {tab === 'Combo Analytics' && <ComboAnalytics orders={data.orders} />}
      {tab === 'settings' && <div className="space-y-4"><Settings settings={data.settings} reload={load} note={note} /><BusinessCosts business={data.settings.business} api={api} reload={load} note={note} /></div>}
    </div>
  );
}

function Orders({ orders, reload, note }) {
  const [filter, setFilter] = useState('All'), [rng, setRng] = useState({ from: '', to: '' });
  const list = orders.filter((o) => filter === 'All' || o.status === filter);
  const change = async (id, status) => { const r = await api({ kind: 'order', id, status }); if (r.ok) { note('Status updated'); reload(); } else note((await r.json()).error || 'Could not update order'); };
  return (<div>
    <div className="mb-3 flex flex-wrap gap-2 text-sm">{['All', ...STATUSES].map((s) => <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 ${filter === s ? 'bg-forest text-cream' : 'bg-cream'}`}>{s}</button>)}</div>
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-cream p-3 text-sm">
      <div><label className="label" htmlFor="df">From date</label><input id="df" type="date" className="input" value={rng.from} onChange={(e) => setRng({ ...rng, from: e.target.value })} /></div>
      <div><label className="label" htmlFor="dt2">To date</label><input id="dt2" type="date" className="input" value={rng.to} onChange={(e) => setRng({ ...rng, to: e.target.value })} /></div>
      <a className="btn-accent" href={`/api/admin/export?status=${filter}&from=${rng.from}&to=${rng.to}`}>⬇ Download orders (Excel / Sheets CSV)</a>
    </div>
    {!list.length && <p>No orders yet.</p>}
    <div className="space-y-4">{list.map((o) => (
      <article key={o.id} className="card p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><b className="text-base">{o.id}</b><div className="text-xs">{new Date(o.createdAt).toLocaleString('en-IN')}</div></div>
          <div className="flex items-center gap-2"><span className="rounded bg-cream px-2 py-1 text-xs">{o.payment.method === 'cod' ? 'COD' : 'Online'} · {o.payment.status}</span>
            <select aria-label="Order status" className="input !w-auto" value={o.status} onChange={(e) => change(o.id, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div></div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div><b>Customer</b><br />{o.customer.name}<br />{o.customer.mobile}</div>
          <div><b>Delivery address</b><br />{o.customer.house}, {o.customer.street}<br />{o.customer.area}, {o.customer.city}<br />{o.customer.state}<br /><b>Pincode {o.customer.pincode}</b></div>
          <div><b>Products ordered</b>
            <ul className="my-1 divide-y divide-brown/10">{orderLines(o).map((i, index) => (
              <li key={i.slug + index} className="flex flex-wrap justify-between gap-x-2 py-1">
                <span>{i.name} ({i.weight}){i.contents && <small className="block">{i.contents.map(p => p.name + ' ×' + p.qty).join(' · ')} · Save {rupee(i.savings)} per combo</small>}</span>
                <span><b>Qty {i.qty}</b> · {rupee(i.price * i.qty)}</span>
              </li>
            ))}</ul>
            <div>Product revenue: {rupee(o.subtotal)}</div><div>Delivery: {rupee(o.deliveryCharge)}</div><div className="font-bold">Total: {rupee(o.total)}</div></div></div>
        <Fulfilment order={o} api={api} note={note} reload={reload} />
      </article>))}</div></div>);
}

function Products({ products, settings, reload, note }) {
  const [drafts, setDrafts] = useState({});
  const combos = configuredCombos(settings);
  const rows = products.map(p => ({ ...p, manufacturingCost: settings.business?.productCosts?.[p.slug], ...drafts[p.slug] }));
  const up = (slug, key, value) => setDrafts(current => ({ ...current, [slug]: {
    ...current[slug], [key]: value,
    ...(key === 'comboSlugs' && { comboEligibility: 'selected' }),
  } }));
  const save = async () => {
    const r = await api({ kind: 'products', products: Object.entries(drafts).map(([slug, patch]) => ({ slug, ...patch })) });
    if (r.ok) { await reload(); setDrafts({}); note('Products saved'); } else note((await r.json()).error || 'Could not save products');
  };
  return (<div className="space-y-6">
    <section className="card p-4">
      <h2 className="mb-3 text-xl">Existing products</h2>
      <div className="divide-y divide-brown/10">
        {rows.map(p => (
          <div key={p.slug} className="grid grid-cols-2 items-end gap-3 py-4 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
            <h3 className="col-span-2 self-center font-semibold md:col-span-1">{p.name} <span className="text-xs">({p.weight})</span></h3>
            {[
              ['originalPrice', 'Original price (₹)', 0],
              ['price', 'Selling price (₹)', 1],
              ['stock', 'Stock', 0],
            ].map(([key, label, min]) => (
              <label key={key} className="min-w-0">
                <span className="label">{label}</span>
                <input aria-label={p.name + ' ' + label} className="input" type="number" min={min} value={p[key] ?? ''} onChange={e => up(p.slug, key, e.target.value)} />
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={p.active} onChange={e => up(p.slug, 'active', e.target.checked)} aria-label={p.name + ' active'} /> Active
            </label>
            <label><span className="label">Manufacturing cost per pack (₹)</span><input className="input" type="number" min="0" step="0.01"
              aria-label={p.name + ' manufacturing cost'} value={p.manufacturingCost ?? ''} onChange={e => up(p.slug, 'manufacturingCost', e.target.value)} /></label>
            <div className="col-span-2 md:col-span-4"><ProductEligibility product={p} combos={combos} update={(key, value) => up(p.slug, key, value)} /></div>
          </div>
        ))}
      </div>
      <button onClick={save} className="btn-primary mt-3">Save changes</button>
    </section>
    <AddProduct combos={combos} reload={reload} note={note} />
  </div>);
}

const EMPTY = { name: '', tamilName: '', originalPrice: '', price: '', weight: '100g', stock: '', badge: '', short: '', description: '', ingredients: '', usage: '', storage: '', images: [] };
function AddProduct({ combos, reload, note }) {
  const [f, setF] = useState(EMPTY), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function upload(e) {
    setErr(''); const urls = [];
    for (const file of e.target.files) {
      const fd = new FormData(); fd.append('file', file);
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd }); const j = await r.json();
      if (!r.ok) { setErr(j.error); break; } urls.push(j.url);
    }
    setF((x) => ({ ...x, images: [...x.images, ...urls] })); e.target.value = '';
  }
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const r = await api({ kind: 'addProduct', product: f }); const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error);
    note('Product added: /products/' + j.slug); setF(EMPTY); reload();
  }
  const T = (k, l, extra = {}) => <div className={extra.wide ? 'sm:col-span-2' : ''}><label className="label" htmlFor={'n-' + k}>{l}</label>{extra.area ? <textarea id={'n-' + k} rows={3} className="input" value={f[k]} onChange={set(k)} /> : <input id={'n-' + k} type={extra.type || 'text'} className="input" value={f[k] ?? ''} step={k === 'manufacturingCost' ? '0.01' : undefined} onChange={set(k)} />}</div>;
  return (
    <form onSubmit={submit} className="card space-y-4 p-5"><h2 className="text-xl">Add new product</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {T('name', 'Product name *')}{T('tamilName', 'Tamil name (optional)')}
        {T('originalPrice', 'Original price (₹)', { type: 'number' })}{T('price', 'Selling price (₹) *', { type: 'number' })}{T('weight', 'Weight (e.g. 100g)')}
        {T('stock', 'Stock quantity', { type: 'number' })}{T('badge', 'Badge (e.g. New)')}
        {T('short', 'Short description (1 line)', { wide: true })}
        {T('description', 'Full description', { wide: true, area: true })}
        {T('ingredients', 'Ingredients (as printed on pack)', { wide: true, area: true })}
        {T('usage', 'How to use (one point per line)', { wide: true, area: true })}
        {T('storage', 'Storage instructions (blank = default)', { wide: true })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {T('manufacturingCost', 'Manufacturing cost per pack (₹)', { type: 'number' })}
        <ProductEligibility product={f} combos={combos} update={(key, value) => setF(current => ({ ...current, [key]: value }))} />
      </div>
      <div><label className="label" htmlFor="imgs">Product images * (first image = main pouch photo; JPG/PNG/WEBP, max 5MB each)</label>
        <input id="imgs" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} className="max-w-full text-sm" />
        <div className="mt-2 flex flex-wrap gap-2">{f.images.map((u) => <div key={u} className="relative"><img src={u} alt="" className="h-20 w-16 rounded-lg object-cover ring-1 ring-brown/20" /><button type="button" aria-label="Remove image" onClick={() => setF({ ...f, images: f.images.filter((x) => x !== u) })} className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-700 text-xs text-white">×</button></div>)}</div></div>
      <p className="text-xs">Only enter ingredients and claims that are true for this product.</p>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add product'}</button>
    </form>);
}

function Settings({ settings, reload, note }) {
  const [s, setS] = useState(settings);
  const set = (k) => (e) => setS({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async (e) => { e.preventDefault(); const r = await api({ kind: 'settings', settings: s }); if (r.ok) { note('Settings saved'); reload(); } };
  const N = ([k, l]) => <div key={k}><label className="label" htmlFor={k}>{l}</label><input id={k} type="number" min="0" className="input" value={s[k]} onChange={set(k)} /></div>;
  return (<form onSubmit={save} className="card max-w-xl space-y-4 p-5"><h2 className="text-xl">Delivery charges (per order)</h2>
    <div className="grid gap-3 sm:grid-cols-3">{[['deliveryChennai', 'Within Chennai (₹)'], ['deliveryTN', 'Tamil Nadu – outside Chennai (₹)'], ['deliveryOther', 'Other states (₹)']].map(N)}</div>
    <div className="grid gap-3 sm:grid-cols-2">{[['chennaiPinMin', 'Chennai pincode from'], ['chennaiPinMax', 'Chennai pincode to']].map(N)}</div>
    <div><label className="label" htmlFor="dt">Delivery time text</label><input id="dt" className="input" value={s.deliveryTime} onChange={set('deliveryTime')} /></div>
    <div><label className="label" htmlFor="wa">WhatsApp Business number (digits, with country code, e.g. 91XXXXXXXXXX)</label><input id="wa" className="input" value={s.whatsappNumber} onChange={set('whatsappNumber')} /></div>
    <label className="flex items-center gap-2"><input type="checkbox" checked={s.codEnabled} onChange={set('codEnabled')} /> Cash on Delivery enabled</label>
    <button className="btn-primary">Save settings</button></form>);
}

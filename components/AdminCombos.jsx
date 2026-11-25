'use client';

import { useState } from 'react';
import Image from '@/components/StoreImage';
import { activeCombos, comboPreview, configuredCombos } from '@/lib/combos';
import { rupee } from '@/lib/site';

const empty = { slug: '', name: '', description: '', packs: 2, order: 10, badge: '', max: 0, type: 'custom',
  eligibility: 'auto', products: {}, discount: 'amount', value: '', start: '', end: '', images: [], active: true, home: true, featured: false };
const inIST = date => date ? new Date(Date.parse(date) + 330 * 60000).toISOString().slice(0, 16) : '';
const toISO = date => date ? new Date(date + '+05:30').toISOString() : '';
const slugify = name => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function ProductEligibility({ product, combos, update }) {
  const mode = product.comboEligibility || 'all';
  return <div className="space-y-2">
    <label><span className="label">Combo eligibility</span><select className="input" value={mode} onChange={e => update('comboEligibility', e.target.value)}>
      <option value="all">Include in all eligible combos</option><option value="selected">Selected combos only</option><option value="excluded">Exclude from combo offers</option>
    </select></label>
    {mode === 'selected' && <fieldset className="flex flex-wrap gap-2"><legend className="label">Automatic combos for this product</legend>
      {combos.filter(c => c.type !== 'fixed' && c.eligibility === 'auto').map(c => <label className="flex items-center gap-1 text-sm" key={c.slug}>
        <input type="checkbox" checked={(product.comboSlugs || []).includes(c.slug)} onChange={e => update('comboSlugs', e.target.checked
          ? [...(product.comboSlugs || []), c.slug] : product.comboSlugs.filter(s => s !== c.slug))} />{c.name}
      </label>)}
    </fieldset>}
  </div>;
}

export default function AdminCombos({ settings, products, api, reload, note }) {
  const list = configuredCombos(settings);
  const [editor, edit] = useState(null), [previousSlug, setPrevious] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const set = (key, value) => edit(current => ({ ...current, [key]: value }));
  function open(combo, duplicate = false) {
    setError('');
    setPrevious(duplicate ? '' : combo?.slug || '');
    edit(combo ? { ...combo, ...duplicate && { name: combo.name + ' copy', slug: '', active: false }, start: inIST(combo.start), end: inIST(combo.end) } : empty);
  }
  async function save(body) {
    setError(''); setBusy(true);
    try {
      const r = await api({ kind: 'combo', ...body });
      if (!r.ok) throw new Error((await r.json()).error || 'Could not save offer.');
      await reload(); edit(null); note(body.action === 'delete' ? 'Offer deleted' : 'Offer saved');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function upload(e) {
    const files = Array.from(e.target.files).slice(0, 8 - editor.images.length);
    e.target.value = ''; setError(''); setBusy(true);
    try {
      for (const file of files) {
        const form = new FormData(); form.append('file', file);
        const r = await fetch('/api/admin/upload', { method: 'POST', body: form });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        edit(current => ({ ...current, images: [...current.images, j.url] }));
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const field = (key, label, type = 'text') => <label key={key}><span className="label">{label}</span>
    <input className="input" type={type} value={editor[key] ?? ''} disabled={key === 'slug' && !!previousSlug} step={key === 'value' ? '0.01' : undefined}
      onChange={e => set(key, e.target.value)} /></label>;
  const choice = (key, label, options) => <label><span className="label">{label}</span>
    <select className="input" value={editor[key]} onChange={e => set(key, e.target.value)}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl">Combo Offers</h2><button className="btn-primary" disabled={busy} onClick={() => open()}>Create New Combo</button></div>
    {error && <p className="err" role="alert">{error}</p>}
    {editor && <form className="card space-y-4 p-4" onSubmit={e => {
      e.preventDefault();
      save({ previousSlug, combo: { ...editor, slug: editor.slug || slugify(editor.name), start: toISO(editor.start), end: toISO(editor.end) } });
    }}>
      <h3 className="text-xl">{previousSlug ? 'Edit offer' : 'New offer'}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {field('name', 'Combo name')}{field('slug', 'URL slug (generated from name if blank)')}
        {field('packs', 'Required packs', 'number')}{field('badge', 'Offer badge')}
        {choice('type', 'Combo type', [['custom', 'Customizable'], ['fixed', 'Fixed products'], ['quantity', 'Quantity-based']])}
        {editor.type !== 'fixed' && choice('eligibility', 'Product eligibility', [['auto', 'Automatic'], ['manual', 'Manual']])}
        {choice('discount', 'Discount type', [['price', 'Fixed combo price (₹)'], ['percent', 'Percentage discount (%)'], ['amount', 'Fixed amount off (₹)']])}
        {field('value', 'Price or discount value', 'number')}
        {field('start', 'Starts (India time)', 'datetime-local')}{field('end', 'Ends (India time)', 'datetime-local')}
        {field('order', 'Display order', 'number')}{field('max', 'Max per customer (0 = unlimited)', 'number')}
      </div>
      <p className="text-xs">Original value is calculated using the selected products’ current selling prices.</p>
      <label className="block"><span className="label">Description</span><textarea className="input" rows={3} value={editor.description} onChange={e => set('description', e.target.value)} /></label>
      {(editor.type === 'fixed' || editor.eligibility === 'manual') && <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="label">Choose products{editor.type === 'fixed' && ' and quantities'}</legend>
        {products.map(p => <label key={p.slug} className="flex items-center justify-between gap-2 rounded-lg bg-cream p-2 text-sm"><span>{p.name} · {p.stock} in stock</span>
          {editor.type === 'fixed' ? <input type="number" className="input !w-20" min="0" max={editor.packs} value={editor.products[p.slug] || ''}
            onChange={e => {
              const quantities = { ...editor.products };
              if (Number(e.target.value) > 0) quantities[p.slug] = Number(e.target.value);
              else delete quantities[p.slug];
              set('products', quantities);
            }} /> : <input type="checkbox" checked={Object.hasOwn(editor.products, p.slug)} onChange={e => {
              const selection = { ...editor.products };
              if (e.target.checked) selection[p.slug] = 1; else delete selection[p.slug];
              set('products', selection);
            }} />}
        </label>)}</fieldset>}
      <label className="block"><span className="label">Combo images (first is the thumbnail)</span>
        <input className="max-w-full" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || editor.images.length >= 8} onChange={upload} />
      </label>
      <div className="flex flex-wrap gap-2">{editor.images.map((src, index) => <div key={src} className="space-y-1">
        <Image src={src} width={60} height={60} alt={editor.name || 'Combo photo'} className="h-16 w-16 object-contain" />
        <button type="button" className="text-xs underline" onClick={() => set('images', editor.images.filter((_, i) => i !== index))}>Remove</button>
        {index > 0 && <button type="button" className="ml-1 text-xs underline" onClick={() => set('images', [src, ...editor.images.filter((_, i) => i !== index)])}>Make thumbnail</button>}
      </div>)}</div>
      <div className="flex flex-wrap gap-4">{[['active', 'Active'], ['home', 'Show on homepage'], ['featured', 'Featured']].map(([key, label]) =>
        <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={editor[key]} onChange={e => set(key, e.target.checked)} />{label}</label>)}</div>
      <div className="flex gap-2"><button className="btn-primary" disabled={busy}>Save offer</button><button type="button" className="btn-outline" disabled={busy} onClick={() => edit(null)}>Cancel</button></div>
    </form>}
    {!list.length && <p>No offers yet.</p>}
    {list.map(c => {
      const quote = comboPreview(c, products);
      const live = activeCombos(settings).some(offer => offer.slug === c.slug);
      return <article key={c.slug} className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div><h3 className="text-lg">{c.name}</h3><p className="text-sm">{c.packs} packs · {live ? 'Active' : c.active ? 'Outside offer schedule' : 'Inactive'} · {quote ? (quote.varies ? 'From ' : '') + rupee(quote.price) : 'No available selection'}</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" disabled={busy} onClick={() => open(c)}>Edit</button>
          <button className="btn-outline" disabled={busy} onClick={() => open(c, true)}>Duplicate</button>
          <button className="btn-outline" disabled={busy} onClick={() => save({ previousSlug: c.slug, combo: { ...c, active: !c.active } })}>{c.active ? 'Deactivate' : 'Activate'}</button>
          <button className="p-2 text-sm text-red-700 underline" disabled={busy} onClick={() => { if (confirm('Delete ' + c.name + '?')) save({ previousSlug: c.slug, action: 'delete' }); }}>Delete</button>
        </div>
      </article>;
    })}
  </div>;
}

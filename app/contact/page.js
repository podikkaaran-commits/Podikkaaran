import Breadcrumb from '@/components/Breadcrumb';
import { SITE, fullAddress, mapsEmbed, mapsDirections } from '@/lib/site';
import { getSettings } from '@/lib/storefront';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contact PODIKKAARAN – Podi Shop in Chennai', description: 'Contact PODIKKAARAN, homemade podi in Nerkundram, Chennai. Get directions, order help and delivery information.', alternates: { canonical: '/contact' } };
export default async function Contact() {
  const wa = (await getSettings()).whatsappNumber;
  return (<><Breadcrumb list={[['Contact', '/contact']]} />
    <div className="wrap grid gap-8 py-10 md:grid-cols-2">
      <div className="space-y-3"><h1 className="text-3xl sm:text-4xl">Contact Us</h1>
        <address className="not-italic"><b>PODIKKAARAN</b><br />{fullAddress()}</address>
        {SITE.phone && <p>Phone: <a className="underline" href={`tel:${SITE.phone}`}>{SITE.phone}</a></p>}
        {SITE.email && <p>Email: <a className="underline" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>}
        {wa ? <a className="btn-primary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent('Hi PODIKKAARAN, I would like to place an order enquiry.')}`}>Order enquiry on WhatsApp</a> : <p className="text-sm italic">WhatsApp number not added yet (Admin → Settings).</p>}
        <div className="flex gap-3 pt-2"><a className="btn-outline" target="_blank" rel="noopener noreferrer" href={mapsDirections}>Get directions</a>{SITE.gbp && <a className="btn-outline" target="_blank" rel="noopener noreferrer" href={SITE.gbp}>Google Business Profile</a>}</div>
        <p className="text-sm">Delivery Available Across India · 3–5 business days.</p></div>
      <iframe title="PODIKKAARAN on Google Maps" src={mapsEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-80 w-full rounded-2xl border-0 md:h-full md:min-h-[360px]" />
    </div></>);
}

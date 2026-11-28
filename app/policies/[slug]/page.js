import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';
import { getSettings } from '@/lib/storefront';
import { fullAddress, rupee } from '@/lib/site';
import { SHIPPING_ZONES } from '@/lib/shipping';
export const dynamic = 'force-dynamic';
const T = { 'shipping-policy': 'Shipping Policy', 'return-refund-policy': 'Return & Refund Policy', 'privacy-policy': 'Privacy Policy', 'terms-and-conditions': 'Terms & Conditions' };
export async function generateMetadata({ params }) { return T[params.slug] ? { title: T[params.slug], alternates: { canonical: `/policies/${params.slug}` } } : {}; }
export default async function Policy({ params }) {
  const t = T[params.slug]; if (!t) notFound();
  const s = await getSettings();
  const body = {
    'shipping-policy': [`We deliver to serviceable pincodes across India. Estimated delivery is ${s.deliveryTime}.`, 'Enter your pincode to check availability and see the final delivery charge. Delivery is charged once per order.'],
    'return-refund-policy': ['Please write your own return and refund rules here, for example how to report a damaged or wrong item and how refunds are processed for online payments.', 'Edit this text in app/policies/[slug]/page.js.'],
    'privacy-policy': ['We collect your name, mobile number, email and delivery address only to process and deliver your order and to contact you about it.', 'We do not store card or UPI details; online payments are handled by Razorpay. We do not sell your personal data.', `Questions? Write to us at ${fullAddress()}.`],
    'terms-and-conditions': ['By placing an order you confirm that the details you provide are correct. Prices are in Indian Rupees and inclusive of taxes. Orders are subject to stock availability.', 'Please add any additional terms that apply to your business here.'],
  }[params.slug];
  return (<><Breadcrumb list={[[t, `/policies/${params.slug}`]]} /><article className="wrap prose-pk max-w-2xl py-8"><h1 className="mb-4 text-3xl">{t}</h1>
    {params.slug === 'return-refund-policy' || params.slug === 'terms-and-conditions' ? <p className="mb-4 rounded-lg bg-turmeric/30 p-3 text-sm font-semibold">DRAFT – review and replace with your actual policy before launch.</p> : null}
    {body.map((x, i) => <p key={i}>{x}</p>)}
    {params.slug === 'shipping-policy' && <>
      <div className="my-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-brown/20"><th scope="col" className="p-2">Delivery area</th><th scope="col" className="p-2">Charge per order</th>{s.shipping.freeEnabled && <th scope="col" className="p-2">Free delivery from</th>}</tr></thead>
          <tbody>{SHIPPING_ZONES.map(([zone, label, key]) => <tr key={zone} className="border-b border-brown/10">
            <th scope="row" className="p-2 font-medium">{label}</th><td className="p-2">{rupee(s[key])}</td>
            {s.shipping.freeEnabled && <td className="p-2">{rupee(s.shipping.minimums[zone])}</td>}
          </tr>)}</tbody>
        </table>
      </div>
      {s.shipping.freeEnabled && <p>Free delivery applies when the product subtotal after all discounts reaches the amount shown above.</p>}
      <p>Charges and availability may vary for specific pincodes. Your cart shows the rate for your pincode.</p>
    </>}
    </article></>);
}

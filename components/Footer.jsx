import Link from 'next/link';
import Image from 'next/image';
import { SITE, fullAddress } from '@/lib/site';

export default function Footer({ whatsapp }) {
  const L = ({ href, children, ext }) => <li><a href={href} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="hover:underline">{children}</a></li>;
  return (
    <footer className="mt-20 bg-forest text-cream">
      <div className="wrap grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image src="/images/logo.jpg" alt="PODIKKAARAN" width={90} height={90} className="rounded-full bg-white p-1" />
          <p className="mt-3 font-display text-xl text-turmeric">{SITE.tagline}</p>
          <p className="text-sm opacity-80">{SITE.tagline2}</p>
        </div>
        <nav aria-label="Footer"><h2 className="mb-3 text-lg !text-turmeric">Explore</h2><ul className="space-y-1.5 text-sm">
          <L href="/about">About Us</L><L href="/shop">Shop Products</L><L href="/blog">Blog</L><L href="/contact">Contact Us</L><L href="/order">Track Order</L>
          {whatsapp && <L ext href={`https://wa.me/${whatsapp}`}>WhatsApp</L>}
          {SITE.instagram && <L ext href={SITE.instagram}>Instagram</L>}{SITE.facebook && <L ext href={SITE.facebook}>Facebook</L>}
        </ul></nav>
        <nav aria-label="Policies"><h2 className="mb-3 text-lg !text-turmeric">Policies</h2><ul className="space-y-1.5 text-sm">
          <L href="/policies/shipping-policy">Shipping Policy</L><L href="/policies/return-refund-policy">Return &amp; Refund Policy</L><L href="/policies/privacy-policy">Privacy Policy</L><L href="/policies/terms-and-conditions">Terms &amp; Conditions</L>
        </ul></nav>
        <address className="text-sm not-italic"><h2 className="mb-3 text-lg !text-turmeric">Visit / Contact</h2>PODIKKAARAN<br />{fullAddress()}
          {SITE.phone && <><br />Phone: {SITE.phone}</>}{SITE.email && <><br />{SITE.email}</>}
          {SITE.fssai && <><br />FSSAI Lic. No.: {SITE.fssai}</>}</address>
      </div>
      <p className="border-t border-cream/20 py-4 text-center text-xs opacity-80">© {new Date().getFullYear()} PODIKKAARAN. All rights reserved.</p>
    </footer>
  );
}

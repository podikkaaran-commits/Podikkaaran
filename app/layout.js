import './globals.css';
import { SITE } from '@/lib/site';
import { getProducts, getSettings } from '@/lib/storefront';
import { publicSettings } from '@/lib/db';
import CartProvider from '@/components/CartProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import WhatsApp from '@/components/WhatsApp';
import Analytics from '@/components/Analytics';
import JsonLd from '@/components/JsonLd';
import { orgSchema, localSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';
export const metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'Homemade Podi Online in Chennai | PODIKKAARAN – Amma Samayal Taste', template: '%s | PODIKKAARAN' },
  description: 'Buy homemade South Indian podi online – Curry Leaf, Moringa & Paruppu Podi at ₹69. Podi delivery in Chennai and across India. COD available.',
  openGraph: { type: 'website', siteName: 'PODIKKAARAN', locale: 'en_IN', images: ['/images/curry-pouch.jpg'] },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : undefined,
};
export const viewport = { themeColor: '#174D2B' };

export default async function RootLayout({ children }) {
  const [catalogue, rawSettings] = await Promise.all([getProducts(), getSettings()]);
  const settings = publicSettings(rawSettings);
  const products = catalogue.filter((p) => p.active).map(({ slug, name, price, originalPrice, weight, stock, images }) => ({ slug, name, price, originalPrice, weight, stock, images }));
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Hind:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;600&display=swap" />
        <JsonLd data={orgSchema()} /><JsonLd data={localSchema()} />
      </head>
      <body>
        <CartProvider products={products} settings={settings}>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
          <Header />
          <main id="main" className="page-in">{children}</main>
          <Footer whatsapp={settings.whatsappNumber} />
          <CartDrawer /><WhatsApp />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}

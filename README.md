# PODIKKAARAN – E-commerce Website (Next.js 14 + Tailwind)

## Run locally
```bash
npm install
cp .env.example .env.local      # edit values (ADMIN_PASSWORD + ADMIN_SECRET required for /admin)
npm run dev                     # http://localhost:3000
```
Production: `npm run build && npm start`

## Folder structure
```
app/                   pages + API routes (App Router)
  page.js                Home
  shop, all-products     listings (+ ?q= search)
  products/[slug]        /products/curry-leaf-podi, /moringa-podi, /paruppu-podi
  cart, checkout, order  cart, checkout, confirmation + order tracking
  about, contact, blog, blog/[slug], policies/[slug]
  admin                  login + dashboard (orders, products, settings)
  api/orders             create order (server recomputes prices + delivery)
  api/pincode            delivery checker
  api/payments/razorpay/verify   HMAC signature check - only place an online order becomes "paid"
  api/admin/*            login (httpOnly signed cookie) + data
  sitemap.js, robots.js
components/            Header, CartProvider, CartDrawer, ProductCard, ProductBuy, Analytics ...
lib/                   db.js (JSON storage), orders.js, delivery.js, auth.js, schema.js, blog.js, site.js
data/products.json     EDITABLE PRODUCT CATALOGUE (copy an entry to add a product)
public/images/         your uploaded photos (resized) + logo
.env.example           every setting to fill
```

## Admin (/admin)
- **Orders tab:** view/update status, filter, and **Download orders** (CSV - opens in Excel / Google Sheets; optional date range + status filter).
- **Products tab:** edit price/stock/active, and **Add new product** form (photo upload included). New products appear on the site, shop, sitemap and get their own /products/<slug> page immediately.
- **Settings tab:** delivery charges, Chennai pincode range, COD, WhatsApp number.
- Uploaded photos are saved in `data/uploads` (or DATA_DIR) - back this folder up along with `data/orders.json`.

## Where to edit
- Products / price / stock: `data/products.json` or Admin > Products
- Delivery charges (55/70/85), Chennai pincode range, COD on/off, WhatsApp number: Admin > Settings
- Address, social links, FSSAI no.: `.env.local` and `lib/site.js`
- Blog: `lib/blog.js`. Policies: `app/policies/[slug]/page.js` (Return & Terms are DRAFTS)

## Before going live
1. Storage is JSON files in `data/` (or `DATA_DIR`): fine on a VPS / Railway / Render with a persistent disk. NOT on Vercel/Netlify (ephemeral FS) - swap `lib/db.js` for Postgres/Supabase/Mongo there.
2. Razorpay: set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET. Orders confirm only after server-side signature verification. Add a `payment.captured` webhook as a safety net.
3. WhatsApp, phone, email, Instagram, Facebook, Google Business Profile URL were not provided - nothing invented; buttons hide until set.
4. Maps use an address-based embed (no invented coordinates).
5. Analytics: set GTM / GA4 / Meta Pixel IDs. With GTM set, GA4 is not loaded directly (no double counting). `purchase` fires once per order and only for COD or verified-paid orders.
6. Pincode checker applies zone rules; it does not verify a pincode physically exists.

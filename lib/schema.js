import { SITE } from '@/lib/site';
const sameAs = [SITE.instagram, SITE.facebook, SITE.gbp].filter(Boolean);
export const orgSchema = () => ({
  '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: SITE.url, logo: `${SITE.url}/images/logo.jpg`, slogan: SITE.tagline,
  ...(SITE.phone && { telephone: SITE.phone }), ...(sameAs.length && { sameAs }),
});
export const localSchema = () => ({
  '@context': 'https://schema.org', '@type': 'FoodEstablishment', name: SITE.name, url: SITE.url, image: `${SITE.url}/images/curry-pouch.jpg`,
  description: 'Homemade South Indian podi (curry leaf, moringa, paruppu) from Nerkundram, Chennai, delivered across India.',
  address: { '@type': 'PostalAddress', streetAddress: SITE.address.line, addressLocality: SITE.address.city, addressRegion: SITE.address.state, postalCode: SITE.address.pin, addressCountry: 'IN' },
  areaServed: [{ '@type': 'City', name: 'Chennai' }, { '@type': 'State', name: 'Tamil Nadu' }, { '@type': 'Country', name: 'India' }],
  ...(SITE.phone && { telephone: SITE.phone }), ...(sameAs.length && { sameAs }),
});
export const crumbs = (list) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: list.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE.url + path })),
});
export const productSchema = (p) => ({
  '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description, image: p.images.map((i) => SITE.url + i), sku: p.slug,
  brand: { '@type': 'Brand', name: SITE.name }, category: 'Podi',
  offers: { '@type': 'Offer', url: `${SITE.url}/products/${p.slug}`, priceCurrency: 'INR', price: p.price, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', itemCondition: 'https://schema.org/NewCondition' },
});
export const FAQ = (s) => [
  ['Where can I buy homemade podi online?', 'You can order PODIKKAARAN homemade South Indian podi directly on this website with Cash on Delivery or online payment.'],
  ['What is the price of PODIKKAARAN podi?', 'Curry Leaf Podi, Moringa Podi and Paruppu Podi (100g each) are priced at ₹69 per pack, inclusive of taxes.'],
  ['Is Cash on Delivery available?', s.codEnabled ? 'Yes, Cash on Delivery is available.' : 'Cash on Delivery is currently unavailable; please use online payment.'],
  ['How many days does delivery take?', `Delivery takes ${s.deliveryTime.toLowerCase()}.`],
  ['How are delivery charges calculated?', 'Enter your pincode in the cart or at checkout to see your delivery charge. It is applied once per order.'],
  ['How can I order homemade podi?', 'Choose your podi, add it to the cart, enter your delivery address and pincode at checkout, then pick Cash on Delivery or online payment.'],
];
export const faqSchema = (s) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ(s).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

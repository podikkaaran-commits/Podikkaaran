export const dynamic = 'force-dynamic';
import { SITE } from '@/lib/site';
import { getProducts, getSettings } from '@/lib/storefront';
import { activeCombos } from '@/lib/combos';
import { POSTS } from '@/lib/blog';
export default async function sitemap() {
  const u = (p, pr = 0.7) => ({ url: SITE.url + p, lastModified: new Date(), priority: pr });
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);
  return [u('/', 1), u('/shop', .9), u('/all-products', .8), u('/about'), u('/contact'), u('/blog', .6),
    ...activeCombos(settings).map(c => u('/combos/' + c.slug, .8)),
    ...products.filter((p) => p.active).map((p) => u(`/products/${p.slug}`, .9)),
    ...POSTS.map((p) => u(`/blog/${p.slug}`, .6)),
    ...['shipping-policy', 'return-refund-policy', 'privacy-policy', 'terms-and-conditions'].map((s) => u(`/policies/${s}`, .2))];
}

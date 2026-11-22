import { SITE } from '@/lib/site';
import { getProducts } from '@/lib/db';
import { POSTS } from '@/lib/blog';
export default function sitemap() {
  const u = (p, pr = 0.7) => ({ url: SITE.url + p, lastModified: new Date(), priority: pr });
  return [u('/', 1), u('/shop', .9), u('/all-products', .8), u('/about'), u('/contact'), u('/blog', .6),
    ...getProducts().filter((p) => p.active).map((p) => u(`/products/${p.slug}`, .9)),
    ...POSTS.map((p) => u(`/blog/${p.slug}`, .6)),
    ...['shipping-policy', 'return-refund-policy', 'privacy-policy', 'terms-and-conditions'].map((s) => u(`/policies/${s}`, .2))];
}

import { SITE } from '@/lib/site';
export default function robots() {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/checkout', '/cart', '/order'] }], sitemap: `${SITE.url}/sitemap.xml` };
}

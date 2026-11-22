export const itemOf = (p, qty = 1) => ({ item_id: p.slug, item_name: p.name, price: p.price, quantity: qty, item_category: 'Podi' });
const FB = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', add_payment_info: 'AddPaymentInfo', purchase: 'Purchase' };
export function track(event, ecommerce = {}) {
  if (typeof window === 'undefined') return;
  const payload = { currency: 'INR', ...ecommerce };
  try {
    if (window.__pkGA && window.gtag) window.gtag('event', event, payload);
    else { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ ecommerce: null }); window.dataLayer.push({ event, ecommerce: payload }); }
    if (window.fbq && FB[event]) {
      window.fbq('track', FB[event], {
        currency: 'INR', value: payload.value, content_type: 'product',
        content_ids: (payload.items || []).map((i) => i.item_id),
      });
    }
  } catch {}
}

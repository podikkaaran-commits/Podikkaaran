export const itemOf = (p, qty = 1) => ({ item_id: p.slug, item_name: p.name, price: p.price, quantity: qty, item_category: 'Podi' });
const FB = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', add_payment_info: 'AddPaymentInfo', purchase: 'Purchase', generate_lead: 'Lead' };
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


const sentOrderEvents = new Set();

export function trackPlacedOrder(order) {
  const payload = {
    transaction_id: order.id,
    value: order.total,
    shipping: order.deliveryCharge,
    payment_type: order.payment.method,
    items: order.items.map(item => itemOf(item, item.qty)),
  };
  for (const [event, key] of [
    ['generate_lead', 'pk_lead_' + order.id],
    ['purchase', 'pk_purchase_' + order.id],
  ]) {
    if (sentOrderEvents.has(key)) continue;
    try {
      if (localStorage.getItem(key)) continue;
      localStorage.setItem(key, '1');
    } catch {
      // An in-memory marker still prevents duplicates when storage is unavailable.
    }
    sentOrderEvents.add(key);
    track(event, payload);
  }
}

export function checkoutCompleted(order) {
  return order.status !== 'Cancelled' && (order.payment.method === 'cod' || order.payment.status === 'paid');
}

export function checkoutStatus(order) {
  if (order.status === 'Cancelled') return { label: 'Cancelled', tone: 'cancelled' };
  if (checkoutCompleted(order)) return { label: 'Completed', tone: 'success' };
  return { label: 'Awaiting payment', tone: 'pending' };
}

export function paymentStatus(payment) {
  if (['paid', 'cod_collected'].includes(payment.status)) return { label: 'Payment done', tone: 'success' };
  if (payment.method === 'cod') return { label: 'Pay on delivery', tone: 'pending' };
  return { label: 'Awaiting payment', tone: 'pending' };
}

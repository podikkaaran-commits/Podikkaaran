import { orderLines } from '@/lib/combos';
import { checkoutCompleted } from '@/lib/order-status';
import { SITE } from '@/lib/site';

export function canBookShadowfax(order) {
  return checkoutCompleted(order) && !['Shipped', 'Delivered'].includes(order.status) && !order.fulfilment?.awb;
}

export function shadowfaxShipment(order, weightGrams) {
  const phone = (process.env.SHADOWFAX_PICKUP_PHONE || SITE.phone).replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error('Set SHADOWFAX_PICKUP_PHONE to the store pickup mobile number.');
  }
  const products = orderLines(order);
  if (order.subtotal >= 50000) throw new Error('Book this order in Shadowfax with its e-way bill and seller GSTIN.');
  if (!products.length || !Number.isFinite(order.subtotal) || !Number.isFinite(order.total)) {
    throw new Error('This order has incomplete product or payment details.');
  }

  const customer = order.customer;
  if (!customer?.city || customer.city.length > 50 || !/^[1-9]\d{5}$/.test(customer.pincode) ||
      !/^[6-9]\d{9}$/.test(customer.mobile)) {
    throw new Error('Check the customer city, pincode and mobile number before booking.');
  }
  const seller = {
    name: SITE.name,
    contact: phone,
    address_line_1: SITE.address.line,
    city: SITE.address.city,
    pincode: Number(SITE.address.pin),
  };
  const collectOnDelivery = order.payment.method === 'cod' && order.payment.status !== 'cod_collected';
  return {
    order_type: 'marketplace',
    customer_details: {
      name: customer.name,
      contact: customer.mobile,
      address_line_1: [customer.house, customer.street, customer.area].filter(Boolean).join(', '),
      city: customer.city,
      state: customer.state,
      pincode: Number(customer.pincode),
    },
    order_details: {
      client_order_id: order.id,
      product_value: order.subtotal,
      payment_mode: collectOnDelivery ? 'cod' : 'prepaid',
      cod_amount: collectOnDelivery ? order.total : 0,
      total_amount: order.total,
      actual_weight: weightGrams / 1000,
    },
    pickup_details: { pickup_type: 'seller', ...seller },
    return_details: { return_type: 'seller', ...seller },
    product_details: products.map(item => ({
      sku_id: item.slug,
      sku_name: item.name,
      price: item.price,
      brand: SITE.name,
      additional_details: { quantity: item.qty },
    })),
  };
}

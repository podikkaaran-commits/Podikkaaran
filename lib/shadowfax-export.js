import ExcelJS from 'exceljs';
import { grams, orderLines } from '@/lib/combos';
import { SITE } from '@/lib/site';

const columns = [
  ['Order Id', 24], ['AWB', 22], ['Pickup type', 14], ['Pickup Name', 22], ['Pickup Contact', 18],
  ['Pickup Address Line 1', 44], ['Pickup Address Line 2', 27], ['Pickup City', 18], ['Pickup State', 20], ['Pickup Pincode', 16],
  ['Customer Name', 25], ['Customer Contact', 19], ['Alternate Customer Contact', 27],
  ['Customer Address Line 1', 44], ['Customer Address Line 2', 33], ['Customer City', 22], ['Customer State', 22], ['Customer Pincode', 19],
  ['Promised Delivery Date', 25], ['Quantity', 12], ['Actual Weight', 15], ['Volumetric Weight', 19],
  ['Declared Value', 16], ['Total Amount', 15], ['Cod Amount', 14], ['SKU', 32], ['Product Name', 44], ['Price', 17],
  ['Category', 20], ['Brand', 20], ['Seller Name', 22], ['Seller Address', 44], ['Seller State', 21],
  ['GSTIN Number', 19], ['HSN Code', 15], ['Invoice No', 17], ['SGST', 12], ['IGST', 12], ['CGST', 12], ['Total Tax', 14],
  ['Delivery Type', 17], ['Remarks', 26], ['Return Name', 22], ['Return Address Line 1', 44], ['Return Address Line 2', 27],
  ['Return City', 19], ['Return State', 20], ['Return Pincode', 17], ['Return Contact', 18],
  ['E-Way Bill', 18], ['Order Service', 17], ['Reseller Name', 22],
];

function orderRow(order, pickupPhone) {
  const { customer, fulfilment, payment } = order;
  const address = SITE.address;
  const products = orderLines(order);
  const collectOnDelivery = payment.method === 'cod' && payment.status !== 'cod_collected';
  const paid = ['paid', 'cod_collected'].includes(payment.status);
  const paymentType = order.status === 'Cancelled' ? null : collectOnDelivery ? 'COD' : paid ? 'Prepaid' : null;
  const bookedWeight = fulfilment?.shadowfax?.state === 'booked' ? fulfilment.shadowfax.weightGrams : order.shipmentWeight;
  const packs = order.items.reduce((sum, item) => sum + item.qty, 0);
  const weight = bookedWeight ?? order.items.reduce((sum, item) => sum + grams(item.weight) * item.qty, 0);
  return [
    order.id, fulfilment?.courier === 'Shadowfax' ? fulfilment.awb : null,
    'Seller', SITE.name, pickupPhone, address.line, null, address.city, address.state, address.pin,
    customer.name, String(customer.mobile ?? ''), null,
    [customer.house, customer.street].filter(Boolean).join(', '), customer.area, customer.city, customer.state, String(customer.pincode ?? ''),
    null, packs || null, weight || null, null, order.subtotal, order.total,
    paymentType === 'COD' ? order.total : paymentType === 'Prepaid' ? 0 : null,
    products.map(item => item.slug).join(' | '), products.map(item => item.name).join(' | '),
    products.length === 1 ? products[0].price : products.map(item => item.price).join(' | '),
    null, SITE.name, SITE.name, address.line, address.state, null, null, null, null, null, null, null,
    paymentType, null, SITE.name, address.line, null, address.city, address.state, address.pin, pickupPhone, null, null, null,
  ];
}

export async function shadowfaxWorkbook(orders) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Orders');
  sheet.columns = columns.map(([header, width]) => ({ header, width }));
  const pickupPhone = (process.env.SHADOWFAX_PICKUP_PHONE || SITE.phone).replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  for (const order of orders) sheet.addRow(orderRow(order, /^[6-9]\d{9}$/.test(pickupPhone) ? pickupPhone : null));
  return workbook.xlsx.writeBuffer();
}

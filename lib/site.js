export const SITE = {
  name: 'PODIKKAARAN',
  tagline: 'Amma Samayal Taste',
  tagline2: 'Healthy • Homemade • Ready to Eat',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  address: {
    line: 'No.1 Krishna Nagar 7th Street, Nerkundram',
    city: 'Chennai', state: 'Tamil Nadu', pin: '600107', country: 'IN',
  },
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || '',
  gbp: process.env.NEXT_PUBLIC_GBP_URL || '',
  fssai: process.env.NEXT_PUBLIC_FSSAI_NUMBER || '',
};
export const fullAddress = () => `${SITE.address.line}, ${SITE.address.city} - ${SITE.address.pin}, ${SITE.address.state}`;
export const mapsQuery = () => encodeURIComponent(`PODIKKAARAN, ${fullAddress()}`);
export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery()}`;
export const mapsDirections = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery()}`;
export const mapsEmbed = `https://www.google.com/maps?q=${mapsQuery()}&output=embed`;
export const rupee = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const STATES = ['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];

'use client';
import { useCart } from '@/components/CartProvider';

export const waLink = (num, text) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
export default function WhatsApp() {
  const { settings, count } = useCart();
  if (!settings.whatsappNumber) return null;
  return (
    <a href={waLink(settings.whatsappNumber, 'Hi PODIKKAARAN, I have a question about your podi.')} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
       className={`fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105 ${count > 0 ? 'bottom-20 md:bottom-5' : 'bottom-5'}`}>
      <svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 00-11 19.8L3 29l6.4-1.7A13 13 0 1016 3zm0 23.6a10.600 10.600 0 01-5.400-1.500l-.4-.2-3.800 1 1-3.700-.3-.4A10.600 10.600 0 1116 26.600zm5.800-7.900c-.3-.2-1.900-.9-2.200-1s-.5-.2-.7.200-.8 1-1 1.200-.4.200-.7 0a8.700 8.700 0 01-4.300-3.800c-.3-.6.300-.5.900-1.700a.6.600 0 000-.6c-.1-.2-.7-1.700-1-2.300s-.5-.5-.7-.5h-.6a1.200 1.200 0 00-.9.4 3.700 3.700 0 00-1.100 2.700c0 1.600 1.200 3.200 1.300 3.400s2.300 3.500 5.600 4.900c2 .8 2.800.9 3.800.7a3.200 3.200 0 002.100-1.500 2.600 2.600 0 00.2-1.500c-.1-.2-.3-.3-.6-.4z"/></svg>
    </a>
  );
}

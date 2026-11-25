import Link from 'next/link';
import Image from '@/components/StoreImage';
import { activeCombos, comboPreview, eligibleProducts } from '@/lib/combos';
import { rupee } from '@/lib/site';

export default function ComboOffers({ settings, products }) {
  const offers = activeCombos(settings).filter(c => c.home).map(combo => ({ combo, quote: comboPreview(combo, products) }));
  if (!offers.length) return null;
  return (
    <section id="combo-offers" className="wrap scroll-mt-24 py-14">
      <h2 className="text-3xl">Shop Our Exclusive Combo Offers</h2>
      <p className="mt-2">Choose your favourite homemade podis and enjoy more taste at better prices.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {offers.map(({ combo, quote }) => (
          <article key={combo.slug} className="card flex flex-col overflow-hidden">
            <div className="relative flex h-36 items-center justify-center gap-1 bg-cream/70">
              {(combo.images.length ? combo.images.slice(0, 1) : eligibleProducts(combo, products).filter(p => p.images[0]).slice(0, 3).map(p => p.images[0])).map(src => (
                <Image key={src} src={src} alt={combo.name} width={140} height={120} className={combo.images.length ? 'h-32 max-w-full object-contain' : 'h-28 max-w-[31%] object-contain'} />
              ))}
              {combo.badge && <span className="absolute left-2 top-2 rounded-full bg-turmeric px-2 py-1 text-xs font-bold">{combo.badge}</span>}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="text-xl">{combo.name}</h3>
              <p className="text-sm">{combo.packs} packs{quote?.weight > 0 && !quote.varies && ' · ' + quote.weight + 'g'}</p>
              {quote && <p className="text-sm"><del>{rupee(quote.originalPrice)}</del> <b className="text-forest">{quote.example ? 'Example price ' : quote.varies ? 'From ' : 'Offer price '}{rupee(quote.price)}</b>
                <span className="block">Save {rupee(quote.savings)} ({quote.percent}%){quote.varies ? ' on this selection' : ''}</span></p>}
              <p className="flex-1 text-sm">{combo.description}</p>
              {quote ? <>
                <Link prefetch={false} className="btn-primary" href={'/combos/' + combo.slug}>{combo.type === 'fixed' ? 'View combo' : 'Customize Combo'}</Link>
                <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold">
                  <Link prefetch={false} className="rounded-full border border-forest/40 py-2 text-forest" href={'/combos/' + combo.slug + '?intent=add'}>Add to Cart</Link>
                  <Link prefetch={false} className="rounded-full border border-forest/40 py-2 text-forest" href={'/combos/' + combo.slug + '?intent=buy'}>Buy Now</Link>
                </div>
              </> : <p className="text-sm font-semibold">Currently unavailable</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

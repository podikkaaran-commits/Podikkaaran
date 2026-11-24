import Image from '@/components/StoreImage';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';
export const metadata = { title: 'About PODIKKAARAN – Traditional Homemade Podi', description: 'The story of PODIKKAARAN: traditional South Indian homemade podi with Amma Samayal taste, made in Nerkundram, Chennai.', alternates: { canonical: '/about' } };
export default function About() {
  return (<><Breadcrumb list={[['About Us', '/about']]} />
    <div className="wrap grid items-center gap-8 py-10 md:grid-cols-2">
      <div className="prose-pk"><h1 className="mb-4 text-3xl sm:text-4xl">A Little Taste of Home in Every Spoon</h1>
        <p>PODIKKAARAN is a homemade South Indian food brand from Nerkundram, Chennai. We believe the simplest meals – hot rice, a spoon of ghee and a good podi – are the ones we remember most.</p>
        <p>Our Curry Leaf, Moringa and Paruppu podis follow traditional South Indian flavours and are made with carefully selected ingredients. Every pack lists its ingredients clearly, so you know exactly what goes into your meal.</p>
        <p>We make podi that is ready to eat: mix it with rice and ghee, or serve it with idli, dosa and chapati. That is what we mean by <b>Amma Samayal Taste</b>.</p>
        <Link href="/shop" className="btn-primary">Shop our podi</Link></div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl"><Image src="/images/moringa-serving.jpg" alt="Moringa podi with rice, ghee and curry on a banana leaf" fill sizes="(max-width:768px) 100vw,520px" className="object-cover" /></div>
    </div></>);
}

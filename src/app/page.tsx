import Navbar from "@/components/Navbar";
import HeroCarousel from "@/components/HeroCarousel";
import FeaturedProducts from "@/components/FeaturedProducts";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import { getStoreCatalog } from "@/app/lib/storeData";

/* El catalogo sale de la base en cada visita: si el dueno da de alta un
   producto en el panel, aparece en la tienda sin volver a compilar. */
export const dynamic = "force-dynamic";

export default async function Home() {
  const { products, categories } = await getStoreCatalog();

  return (
    <div className="min-h-screen w-full bg-[#F7F5F0] text-stone-800">
      <Navbar categories={categories} />
      <HeroCarousel />
      {/* Solo una vidriera: el catalogo con filtros, orden y busqueda vive en
          /productos, que es a donde llevan las categorias y el buscador. */}
      <FeaturedProducts products={products} />
      <Footer />
      <CartDrawer />
    </div>
  );
}

import { Suspense } from "react";

import Navbar from "@/components/Navbar";
import HeroCarousel from "@/components/HeroCarousel";
import ProductGrid from "@/components/ProductGrid";
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
      <Navbar />
      <HeroCarousel />
      {/* El listado lee la busqueda de la URL con useSearchParams; Next pide
          que eso viva dentro de un Suspense. */}
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <ProductGrid products={products} categories={categories} />
      </Suspense>
      <Footer />
      <CartDrawer />
    </div>
  );
}

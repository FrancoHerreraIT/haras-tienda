import { Suspense } from "react";
import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
import ProductGrid from "@/components/ProductGrid";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import { getStoreCatalog } from "@/app/lib/storeData";

/* El catalogo sale de la base en cada visita, igual que la home: un producto
   dado de alta en el panel aparece sin volver a compilar. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Productos | Haras del Este",
  description:
    "Catalogo completo de Haras del Este: tablas de asado, cuchilleria artesanal, cocina de hierro y articulos de campo. Filtra por rubro y precio.",
};

/**
 * El catalogo.
 *
 * Filtrar por rubro y buscar terminan siempre aca (ver RUTA_CATALOGO en
 * lib/search): antes las dos cosas reescribian la home y scrolleaban hasta la
 * grilla, asi que el rubro elegido no tenia pagina propia ni URL para
 * compartir. La home ahora solo muestra una vidriera corta.
 */
export default async function ProductosPage() {
  const { products, categories } = await getStoreCatalog();

  return (
    <div className="min-h-screen w-full bg-[#F7F5F0] text-stone-800">
      <Navbar categories={categories} />
      {/* ProductGrid lee el rubro y la consulta de la URL con useSearchParams;
          Next pide que eso viva dentro de un Suspense. */}
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <ProductGrid products={products} categories={categories} />
      </Suspense>
      <Footer />
      <CartDrawer />
    </div>
  );
}

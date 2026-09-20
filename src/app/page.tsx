import Navbar from "@/components/Navbar";
import HeroCarousel from "@/components/HeroCarousel";
import CatalogSection from "@/components/CatalogSection";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import { parsePagina } from "@/app/lib/catalogo";
import { getCatalogPage, getStoreCategories } from "@/app/lib/storeData";

/* El catalogo sale de la base en cada visita: si el dueno da de alta un
   producto en el panel, aparece en la tienda sin volver a compilar. */
export const dynamic = "force-dynamic";

/**
 * La portada.
 *
 * Una sola grilla con el catalogo entero, paginada de a 12, con los productos
 * destacados a la cabeza. La consulta no baja todo el catalogo para mostrar
 * doce: eso era barato con pocos productos y deja de serlo apenas crece.
 *
 * `searchParams` es una promesa desde Next 15: se espera antes de leer `page`.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const pagina = parsePagina((await searchParams).page);

  /* Las dos consultas son independientes: van juntas para no encadenar dos
     idas y vueltas a la base. */
  const [catalogo, categories] = await Promise.all([
    getCatalogPage(pagina),
    getStoreCategories(),
  ]);

  return (
    <div className="min-h-screen w-full bg-[#F7F5F0] text-stone-800">
      <Navbar categories={categories} />
      <HeroCarousel />
      <CatalogSection catalogo={catalogo} />
      <Footer />
      <CartDrawer />
    </div>
  );
}

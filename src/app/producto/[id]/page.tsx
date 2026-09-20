import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import AddToCartButton from "@/components/AddToCartButton";
import {
  getStoreCategories,
  getStoreProduct,
  portada,
} from "@/app/lib/storeData";
import { hrefCategoria } from "@/app/lib/search";
import { DESCUENTO_TRANSFERENCIA } from "@/app/lib/paymentConfig";

/* La ficha sale de la base en cada visita, igual que el listado. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getStoreProduct(id);
  if (!data) return { title: "Producto no encontrado | Haras del Este" };

  const { product } = data;
  const foto = portada(product);

  return {
    title: `${product.title} | Haras del Este`,
    description:
      product.description ??
      `${product.title} en Haras del Este. Retiralo en cualquiera de nuestras dos sucursales.`,
    openGraph: {
      title: product.title,
      description: product.description ?? undefined,
      images: foto ? [foto] : undefined,
    },
  };
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  /* Las categorias son para la barra del Navbar, que tambien vive aca. */
  const [data, categories] = await Promise.all([
    getStoreProduct(id),
    getStoreCategories(),
  ]);

  /* Producto inexistente o despublicado: 404, no una ficha vacia. */
  if (!data) notFound();

  const { product, related } = data;
  const agotado = product.stock <= 0;
  const ultimas = !agotado && product.stock <= 3;

  return (
    <div className="min-h-screen w-full bg-[#F7F5F0] text-stone-800">
      <Navbar categories={categories} />

      <main className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-6 md:py-10">
        {/* Migas de pan */}
        <nav aria-label="Ubicacion" className="mb-6 flex flex-wrap items-center gap-1 text-xs text-stone-500">
          <Link href="/" className="py-1 transition-colors hover:text-amber-800">
            Inicio
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-stone-300" />
          {/* Ahora la miga cumple lo que promete: lleva al catalogo filtrado
              por el rubro del producto, no a la home. */}
          <Link
            href={hrefCategoria(product.categoryId)}
            className="py-1 transition-colors hover:text-amber-800"
          >
            {product.categoryName}
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-stone-300" />
          <span className="py-1 text-stone-700">{product.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <ProductGallery images={product.images} title={product.title} />

          <div className="lg:pt-2">
            <span className="text-[11px] font-semibold tracking-wide text-amber-800/80">
              {product.categoryName}
            </span>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight text-stone-900 sm:text-3xl md:text-4xl">
              {product.title}
            </h1>

            <p className="mt-5 font-[family-name:var(--font-display)] text-3xl text-stone-900 md:text-4xl">
              $ {product.price.toLocaleString("es-AR")}
            </p>
            {/* Tamaño en px y no `text-sm`: el :root esta al 67%
                (globals.css) y las clases en rem salen diminutas. */}
            <p className="mt-1 text-[13px] font-medium text-green-700">
              {DESCUENTO_TRANSFERENCIA}% OFF con transferencia
            </p>

            {/* Estado de stock, con el mismo criterio que el listado */}
            <p className="mt-2 text-sm">
              {agotado ? (
                <span className="font-semibold text-red-700">Sin stock</span>
              ) : ultimas ? (
                <span className="font-semibold text-amber-700">
                  Ultimas {product.stock} unidades
                </span>
              ) : (
                <span className="text-emerald-700">
                  Disponible ({product.stock} en stock)
                </span>
              )}
            </p>

            <div className="mt-7">
              <AddToCartButton product={product} />
            </div>

            {product.description && (
              <section className="mt-8 border-t border-stone-200 pt-7">
                <h2 className="text-[11px] font-semibold tracking-wide text-stone-500">
                  Descripcion
                </h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-stone-700">
                  {product.description}
                </p>
              </section>
            )}

            {/* Ficha tecnica: por ahora lo que hay en la base. Cuando se
                agreguen atributos al producto, se suman como filas aca. */}
            <section className="mt-8 border-t border-stone-200 pt-7">
              <h2 className="text-[11px] font-semibold tracking-wide text-stone-500">
                Detalles
              </h2>
              <dl className="mt-3 divide-y divide-stone-200 text-sm">
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-stone-500">Categoria</dt>
                  <dd className="text-right text-stone-800">
                    {product.categoryName}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-stone-500">Disponibilidad</dt>
                  <dd className="text-right text-stone-800">
                    {agotado ? "Sin stock" : `${product.stock} unidades`}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-stone-500">Codigo</dt>
                  <dd className="text-right font-mono text-xs text-stone-500">
                    {product.id.slice(0, 8).toUpperCase()}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-14 border-t border-stone-200 pt-10 md:mt-20">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-800 sm:text-3xl">
              Tambien de {product.categoryName}
            </h2>
            <span className="mt-2 mb-7 block h-px w-12 bg-[#8B5A2B]" />
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-6 xl:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}

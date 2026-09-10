"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Package, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { portada, type StoreProduct } from "@/app/lib/storeData";

interface ProductCardProps {
  product: StoreProduct;
}

/* Con muchas fotos los puntitos se amontonan: a partir de aca se muestra
   el contador "2 / 8" en lugar de la fila de puntos. */
const MAX_PUNTOS = 5;

export default function ProductCard({ product }: ProductCardProps) {
  const addToCart = useCartStore((state) => state.addToCart);

  /* Foto que se esta viendo en la tarjeta. Al carrito siempre viaja la
     portada, no la que el visitante haya dejado a la vista. */
  const [activa, setActiva] = useState(0);

  const fotos = product.images;
  const foto = portada(product);
  const tieneGaleria = fotos.length > 1;
  const agotado = product.stock <= 0;
  const ultimasUnidades = !agotado && product.stock <= 3;
  const ficha = `/producto/${product.id}`;

  /* Da la vuelta en los extremos: desde la ultima foto, "siguiente" vuelve
     a la primera. */
  const ir = (siguiente: number) =>
    setActiva((siguiente + fotos.length) % fotos.length);

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 border border-stone-200 shadow-sm shadow-stone-200/50 hover:shadow-lg hover:shadow-stone-300/50 hover:border-stone-300 hover:-translate-y-0.5 transition-all flex flex-col h-full">
      {/* Marco de la foto. Es un div y no el Link porque las flechas son
          botones: un <button> dentro de un <a> no es HTML valido. El Link
          se superpone en toda el area y las flechas quedan por encima. */}
      <div className="relative w-full aspect-[4/3] bg-[#F7F5F0] rounded-lg border border-stone-100 overflow-hidden flex items-center justify-center mb-4 sm:mb-6 group">
        {foto ? (
          <Image
            src={fotos[activa]}
            alt={
              tieneGaleria
                ? `${product.title} — foto ${activa + 1} de ${fotos.length}`
                : product.title
            }
            fill
            sizes="(max-width: 420px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              agotado ? "opacity-60" : ""
            }`}
          />
        ) : (
          /* Producto sin foto cargada en el panel: marcador neutro. */
          <Package
            className="w-10 h-10 sm:w-14 sm:h-14 text-stone-300"
            strokeWidth={1}
          />
        )}

        {/* La foto abre la ficha del producto */}
        <Link
          href={ficha}
          aria-label={`Ver detalle de ${product.title}`}
          className="absolute inset-0 z-10"
        />

        {agotado && (
          <span className="absolute top-2 left-2 z-20 rounded-full bg-[#1C1A19]/90 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-stone-100">
            Sin stock
          </span>
        )}
        {ultimasUnidades && (
          <span className="absolute top-2 left-2 z-20 rounded-full bg-amber-700 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white">
            Últimas {product.stock}
          </span>
        )}

        {/* Galeria en la vidriera: pasar las fotos sin entrar a la ficha */}
        {tieneGaleria && (
          <>
            <button
              type="button"
              onClick={() => ir(activa - 1)}
              aria-label={`Foto anterior de ${product.title}`}
              className="absolute left-1.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-amber-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => ir(activa + 1)}
              aria-label={`Foto siguiente de ${product.title}`}
              className="absolute right-1.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-amber-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {fotos.length <= MAX_PUNTOS ? (
              /* Puntos: ademas de marcar en cual va, saltan a una foto */
              <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#1C1A19]/55 px-2 py-1 backdrop-blur-sm">
                {fotos.map((url, indice) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiva(indice)}
                    aria-label={`Ver foto ${indice + 1} de ${product.title}`}
                    aria-current={indice === activa}
                    className={`h-1.5 rounded-full transition-all ${
                      indice === activa
                        ? "w-4 bg-stone-50"
                        : "w-1.5 bg-stone-50/50 hover:bg-stone-50/80"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <span className="absolute bottom-2 right-2 z-20 rounded-full bg-[#1C1A19]/75 px-2 py-0.5 text-[10px] font-medium tabular-nums text-stone-100">
                {activa + 1} / {fotos.length}
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <span className="text-[11px] text-amber-800/80 font-semibold tracking-wide">
          {product.categoryName}
        </span>
        <h3 className="text-[14px] sm:text-[15px] leading-snug mt-1.5 mb-3 sm:mb-4 line-clamp-2 min-h-[2.6em]">
          <Link
            href={ficha}
            className="text-stone-800 transition-colors hover:text-amber-800"
          >
            {product.title}
          </Link>
        </h3>

        <div className="mt-auto">
          <p className="font-[family-name:var(--font-display)] text-[20px] sm:text-[24px] text-stone-900 mb-4 sm:mb-5">
            $ {product.price.toLocaleString("es-AR")}
          </p>

          <button
            type="button"
            onClick={() =>
              addToCart({
                id: product.id,
                title: product.title,
                price: product.price,
                imageUrl: foto,
                categoryName: product.categoryName,
                stock: product.stock,
              })
            }
            disabled={agotado}
            aria-label={
              agotado
                ? `${product.title} sin stock`
                : `Sumar ${product.title} al carrito`
            }
            className="w-full bg-[#8B5A2B] hover:bg-[#6b4421] active:scale-[0.98] disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed disabled:active:scale-100 text-[#F7F5F0] font-semibold tracking-wide py-3 sm:py-3.5 rounded-lg text-[12px] sm:text-[13px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all"
          >
            {!agotado && <ShoppingCart className="w-4 h-4 shrink-0" />}
            <span className="truncate">
              {agotado ? "Sin stock" : "Sumar al carrito"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

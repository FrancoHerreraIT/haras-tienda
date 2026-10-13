"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Package, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { DESCUENTO_TRANSFERENCIA } from "@/app/lib/paymentConfig";
import { portada, type StoreProduct } from "@/app/lib/storeData";
import ProductBadges, { ALTO_BADGE } from "./ProductBadges";

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
  const ficha = `/producto/${product.id}`;

  /* Da la vuelta en los extremos: desde la ultima foto, "siguiente" vuelve
     a la primera. */
  const ir = (siguiente: number) =>
    setActiva((siguiente + fotos.length) % fotos.length);

  return (
    <div className="bg-white rounded-xl p-[10px] sm:p-[14px] border border-stone-200 shadow-sm shadow-stone-200/50 hover:shadow-lg hover:shadow-stone-300/50 hover:border-stone-300 hover:-translate-y-0.5 transition-all flex flex-col h-full">
      {/* Las etiquetas van arriba de la foto y no encima: con object-contain
          una foto vertical ocupa todo el alto del marco y la etiqueta le
          tapaba el producto. El alto minimo reserva la fila aunque no haya
          ninguna, para que las fotos arranquen a la misma altura en todas las
          tarjetas. "Destacado" explica por que esos productos encabezan una
          grilla que si no se leeria en orden alfabetico. */}
      <ProductBadges
        stock={product.stock}
        destacado={product.isFeatured}
        className={`mb-[8px] ${ALTO_BADGE}`}
      />

      {/* Marco de la foto. Es un div y no el Link porque las flechas son
          botones: un <button> dentro de un <a> no es HTML valido. El Link
          se superpone en toda el area y las flechas quedan por encima. */}
      {/* 5/6 y object-contain: casi todas las fotos se sacan con el celular,
          en vertical (3/4). Con el marco apaisado y object-cover se recortaba
          buena parte del producto; asi se ve entero y el crema rellena lo que
          sobra. 5/6 y no 4/5: una foto vertical sigue llenando el alto (y el
          90% del ancho), y a una cuadrada le quedan franjas de ~8% arriba y
          abajo en vez de 10%. 1/1 achicaba mas la tarjeta pero dejaba a las
          verticales con un cuarto del ancho vacio. El marco fijo deja todas
          las tarjetas de la grilla con la foto del mismo alto. */}
      <div className="relative w-full aspect-[5/6] bg-[#F7F5F0] rounded-lg border border-stone-100 overflow-hidden flex items-center justify-center mb-[10px] sm:mb-[12px] group">
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
            className={`object-contain transition-transform duration-300 group-hover:scale-[1.03] ${
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
        {/* El nombre manda y el rubro va debajo, chico y apagado: con el rubro
            arriba en cuero y semibold se leia como el titulo de la tarjeta.
            Van pegados como un bloque: el nombre ya no reserva el alto de dos
            lineas, que con nombres cortos dejaba el rubro flotando en el medio.
            Lo que alinea las tarjetas de una fila es el mt-auto del precio. */}
        <h3 className="text-[14px] sm:text-[16px] font-medium leading-snug line-clamp-2">
          <Link
            href={ficha}
            className="text-stone-800 transition-colors hover:text-amber-800"
          >
            {product.title}
          </Link>
        </h3>
        <span className="mt-[3px] truncate text-[12px] text-stone-500">
          {product.categoryName}
        </span>

        <div className="mt-auto pt-[10px] sm:pt-[12px]">
          <p className="font-[family-name:var(--font-display)] text-[20px] sm:text-[24px] text-stone-900">
            $ {product.price.toLocaleString("es-AR")}
          </p>
          {/* Tamaño en px y no `text-sm`: el :root esta al 67% (globals.css)
              y las clases en rem salen diminutas. */}
          <p className="mt-[2px] mb-[10px] text-[12px] font-medium text-green-700 sm:mb-[12px]">
            {DESCUENTO_TRANSFERENCIA}% OFF con transferencia
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
            className="w-full bg-[#8B5A2B] hover:bg-[#6b4421] active:scale-[0.98] disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed disabled:active:scale-100 text-[#F7F5F0] font-semibold tracking-wide min-h-[42px] px-2 rounded-lg text-[12px] sm:text-[13px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all"
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

"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, ImageOff, Package, Pencil, Plus, Trash2 } from "lucide-react";

import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import ProductImagesField from "./ProductImagesField";
import { useAbmFormModal } from "./useAbmFormModal";
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  cardClass,
  formatARS,
  inputClass,
  labelClass,
} from "./ui";
import {
  createProduct,
  deleteProduct,
  toggleProductActive,
  updateProduct,
} from "@/app/admin/productos/actions";

export type ProductRow = {
  id: string;
  title: string;
  description: string | null;
  /** Ya convertido desde Decimal: Prisma.Decimal no cruza al cliente. */
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
  categoryId: string;
  categoryName: string;
  orderItemCount: number;
};

export type CategoryOption = { id: string; name: string };

type ProductTableProps = {
  rows: ProductRow[];
  categories: CategoryOption[];
};

export default function ProductTable({ rows, categories }: ProductTableProps) {
  /* Alta y edicion en el mismo formulario, como en Categorias. */
  const form = useAbmFormModal<ProductRow>({
    create: createProduct,
    update: (product, formData) => updateProduct(product.id, formData),
  });

  const [deleting, setDeleting] = useState<ProductRow | null>(null);
  const [toggling, setToggling] = useState<ProductRow | null>(null);

  const { current, isNew } = form;
  const noCategories = categories.length === 0;

  /* Mismos tres botones en la tabla de desktop y en las tarjetas de mobile. */
  const rowActions = (row: ProductRow) => (
    <>
      <button type="button" onClick={() => setToggling(row)} className={btnGhost}>
        {row.isActive ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
        {row.isActive ? "Desactivar" : "Activar"}
      </button>
      <button type="button" onClick={() => form.open(row)} className={btnGhost}>
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </button>
      <button
        type="button"
        onClick={() => setDeleting(row)}
        className={`${btnGhost} hover:bg-red-50 hover:text-red-700`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Eliminar
      </button>
    </>
  );

  const thumb = (row: ProductRow, size: string) => (
    <div
      className={`relative ${size} shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100`}
    >
      {row.images[0] ? (
        <Image
          src={row.images[0]}
          alt={row.title}
          fill
          sizes="64px"
          className="object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-stone-300">
          <ImageOff className="h-4 w-4" />
        </span>
      )}
    </div>
  );

  const stockClass = (stock: number) =>
    stock === 0
      ? "text-red-700"
      : stock <= 3
        ? "text-amber-700"
        : "text-stone-700";

  return (
    <>
      <div className="mb-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {noCategories ? (
          <p className="text-sm text-amber-800">
            Carga al menos una categoria antes de dar de alta productos.
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => form.open("new")}
          disabled={noCategories}
          className={`${btnPrimary} w-full sm:w-auto`}
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Package className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-3 text-sm text-stone-500">
              Todavia no hay productos en el catalogo.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: una tarjeta por producto. Una tabla de 7 columnas en un
                telefono obliga a scrollear de costado para leer cada fila. */}
            <ul className="divide-y divide-stone-100 lg:hidden">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className={`p-4 ${row.isActive ? "" : "opacity-60"}`}
                >
                  <div className="flex gap-3">
                    {thumb(row, "h-16 w-16")}

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-stone-800">{row.title}</p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {row.categoryName}
                      </p>
                      <p className="mt-1.5 font-semibold text-stone-900">
                        {formatARS(row.price)}
                      </p>
                    </div>

                    {row.isActive ? (
                      <span className="h-fit shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                        Activo
                      </span>
                    ) : (
                      <span className="h-fit shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                        Inactivo
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-stone-500">
                    Stock:{" "}
                    <span className={`font-semibold ${stockClass(row.stock)}`}>
                      {row.stock}
                    </span>
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1 border-t border-stone-100 pt-3">
                    {rowActions(row)}
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: la tabla completa */}
            <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/80">
                <tr className="text-[11px] uppercase tracking-[0.14em] text-stone-500">
                  <th className="px-4 py-3 font-semibold">Foto</th>
                  <th className="px-4 py-3 font-semibold">Producto</th>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 text-right font-semibold">Precio</th>
                  <th className="px-4 py-3 text-right font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="sticky right-0 bg-stone-50 px-4 py-3 text-right font-semibold shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`group hover:bg-stone-50/60 ${
                      row.isActive ? "" : "opacity-60"
                    }`}
                  >
                    <td className="px-4 py-4">{thumb(row, "h-12 w-12")}</td>
                    <td className="max-w-[280px] px-4 py-4">
                      <p className="truncate font-semibold text-stone-800">
                        {row.title}
                      </p>
                      {row.description && (
                        <p className="mt-0.5 truncate text-xs text-stone-400">
                          {row.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-stone-500">
                      {row.categoryName}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-stone-800">
                      {formatARS(row.price)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`font-semibold ${stockClass(row.stock)}`}>
                        {row.stock}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {row.isActive ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                          Inactivo
                        </span>
                      )}
                    </td>
                    {/* sticky: la tabla es mas ancha que el panel, y sin esto
                        el boton Eliminar quedaba cortado a la derecha. */}
                    <td className="sticky right-0 bg-white px-4 py-4 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)] group-hover:bg-stone-50">
                      <div className="flex justify-end gap-1">
                        {rowActions(row)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      <Modal
        open={form.isOpen}
        onClose={form.requestClose}
        dismissible={form.dismissible}
        title={isNew ? "Nuevo Producto" : "Editar Producto"}
        description={
          isNew
            ? "Los productos activos son los que ve el cliente en la tienda."
            : `Modificando "${current?.title}".`
        }
        size="lg"
      >
        <form {...form.formProps} className="space-y-5">
          <div>
            <label htmlFor="title" className={labelClass}>
              Titulo
            </label>
            <input
              id="title"
              name="title"
              required
              autoFocus
              maxLength={140}
              defaultValue={current?.title ?? ""}
              placeholder="Tabla de Asado Premium Nogal 40x30cm"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              Descripcion <span className="normal-case">(opcional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={600}
              defaultValue={current?.description ?? ""}
              placeholder="Madera maciza de nogal, terminacion con aceite de lino..."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="price" className={labelClass}>
                Precio (ARS)
              </label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={current?.price ?? ""}
                placeholder="45000"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="stock" className={labelClass}>
                Stock
              </label>
              <input
                id="stock"
                name="stock"
                type="number"
                step="1"
                min="0"
                required
                defaultValue={current?.stock ?? 0}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="categoryId" className={labelClass}>
                Categoria
              </label>
              <select
                id="categoryId"
                name="categoryId"
                required
                defaultValue={current?.categoryId ?? ""}
                className={inputClass}
              >
                <option value="" disabled>
                  Elegir...
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ProductImagesField
            key={current?.id ?? "nuevo"}
            defaultValue={current?.images ?? []}
            onChanged={form.markDirty}
          />

          <label className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={current?.isActive ?? true}
              className="h-5 w-5 shrink-0 accent-[#8B5A2B]"
            />
            <span className="text-sm text-stone-700">
              Producto activo
              <span className="block text-xs text-stone-400">
                Si lo desactivas deja de aparecer en la tienda, pero conserva su
                historial de ventas.
              </span>
            </span>
          </label>

          {form.error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {form.error}
            </p>
          )}

          <div className="mt-1 flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={form.requestClose}
              className={btnSecondary}
            >
              Cancelar
            </button>
            <button type="submit" className={btnPrimary}>
              {isNew ? "Crear Producto" : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmar el alta o la edicion */}
      <ConfirmDialog
        {...form.confirmSave}
        layer="top"
        tone="default"
        title={isNew ? "Crear producto" : "Guardar cambios"}
        confirmLabel={isNew ? "Si, crear" : "Si, guardar"}
        cancelLabel="Volver al formulario"
        message={
          isNew ? (
            <>
              Se va a dar de alta un producto nuevo. Si queda activo, aparece
              en la tienda enseguida.
            </>
          ) : (
            <>
              Vas a modificar <strong>{current?.title}</strong>. Los cambios de
              precio no afectan a los pedidos ya realizados.
            </>
          )
        }
      />

      {/* Confirmar el descarte de cambios sin guardar */}
      <ConfirmDialog
        {...form.confirmDiscard}
        layer="top"
        title="Descartar cambios"
        confirmLabel="Si, descartar"
        cancelLabel="Seguir editando"
        message={<>Tenes cambios sin guardar. Si salis ahora se pierden.</>}
      />

      <ConfirmDialog
        open={toggling !== null}
        onClose={() => setToggling(null)}
        tone="default"
        title={toggling?.isActive ? "Desactivar producto" : "Activar producto"}
        confirmLabel={toggling?.isActive ? "Desactivar" : "Activar"}
        message={
          toggling?.isActive ? (
            <>
              <strong>{toggling?.title}</strong> va a dejar de mostrarse en la
              tienda. Podes volver a activarlo cuando quieras.
            </>
          ) : (
            <>
              <strong>{toggling?.title}</strong> vuelve a publicarse en la
              tienda.
            </>
          )
        }
        onConfirm={async () => {
          if (!toggling) return;
          const result = await toggleProductActive(
            toggling.id,
            !toggling.isActive,
          );
          return result.error;
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Eliminar producto"
        confirmLabel="Si, eliminar"
        message={
          <>
            Vas a eliminar <strong>{deleting?.title}</strong> de forma
            definitiva.
            {deleting && deleting.orderItemCount > 0 && (
              <span className="mt-2 block text-red-700">
                Ojo: aparece en {deleting.orderItemCount} pedido(s), asi que
                solo vas a poder desactivarlo.
              </span>
            )}
          </>
        }
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteProduct(deleting.id);
          return result.error;
        }}
      />
    </>
  );
}

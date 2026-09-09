"use client";

import { useState } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";

import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { useAbmFormModal } from "./useAbmFormModal";
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  cardClass,
  inputClass,
  labelClass,
} from "./ui";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/app/admin/categorias/actions";

export type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
};

export default function CategoryTable({ rows }: { rows: CategoryRow[] }) {
  const form = useAbmFormModal<CategoryRow>({
    create: createCategory,
    update: (category, formData) => updateCategory(category.id, formData),
  });

  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

  const { current, isNew } = form;

  /* Los mismos dos botones en la tabla de desktop y en las tarjetas mobile. */
  const rowActions = (row: CategoryRow) => (
    <>
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

  const countBadge = (count: number) => (
    <span className="inline-flex min-w-[2rem] justify-center rounded-full bg-[#8B5A2B]/10 px-2.5 py-1 text-xs font-semibold text-[#8B5A2B]">
      {count}
    </span>
  );

  return (
    <>
      <div className="mb-5 flex justify-stretch sm:justify-end">
        <button
          type="button"
          onClick={() => form.open("new")}
          className={`${btnPrimary} w-full sm:w-auto`}
        >
          <Plus className="h-4 w-4" />
          Nueva Categoria
        </button>
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Tags className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-3 text-sm text-stone-500">
              Todavia no cargaste ninguna categoria.
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Necesitas al menos una para poder dar de alta productos.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: tarjetas. La tabla obligaba a scrollear de costado. */}
            <ul className="divide-y divide-stone-100 lg:hidden">
              {rows.map((row) => (
                <li key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-stone-800">{row.name}</p>
                    {countBadge(row.productCount)}
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {row.description ?? (
                      <span className="text-stone-300">Sin descripcion</span>
                    )}
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
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Descripcion</th>
                  <th className="px-4 py-3 font-semibold">Productos</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/60">
                    <td className="px-4 py-4 font-semibold text-stone-800">
                      {row.name}
                    </td>
                    <td className="max-w-md px-4 py-4 text-stone-500">
                      {row.description ?? (
                        <span className="text-stone-300">Sin descripcion</span>
                      )}
                    </td>
                    <td className="px-4 py-4">{countBadge(row.productCount)}</td>
                    <td className="px-4 py-4">
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

      {/* Alta y edicion comparten el mismo formulario */}
      <Modal
        open={form.isOpen}
        onClose={form.requestClose}
        dismissible={form.dismissible}
        title={isNew ? "Nueva Categoria" : "Editar Categoria"}
        description={
          isNew
            ? "Los rubros agrupan el catalogo y son el filtro de la tienda."
            : `Modificando "${current?.name}".`
        }
        size="md"
      >
        <form {...form.formProps} className="space-y-5">
          <div>
            <label htmlFor="name" className={labelClass}>
              Nombre
            </label>
            <input
              id="name"
              name="name"
              required
              autoFocus
              maxLength={80}
              defaultValue={current?.name ?? ""}
              placeholder="Tablas de Asado"
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
              maxLength={300}
              defaultValue={current?.description ?? ""}
              placeholder="Tablas de madera maciza para asado y picada."
              className={`${inputClass} resize-none`}
            />
          </div>

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
              {isNew ? "Crear Categoria" : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmar el alta o la edicion */}
      <ConfirmDialog
        {...form.confirmSave}
        layer="top"
        tone="default"
        title={isNew ? "Crear categoria" : "Guardar cambios"}
        confirmLabel={isNew ? "Si, crear" : "Si, guardar"}
        cancelLabel="Volver al formulario"
        message={
          isNew ? (
            <>Se va a dar de alta una nueva categoria en el catalogo.</>
          ) : (
            <>
              Vas a modificar <strong>{current?.name}</strong>. Los cambios se
              reflejan en la tienda al instante.
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
        message={
          <>Tenes cambios sin guardar. Si salis ahora se pierden.</>
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Eliminar categoria"
        confirmLabel="Si, eliminar"
        message={
          <>
            Vas a eliminar <strong>{deleting?.name}</strong>. Esta accion no se
            puede deshacer.
          </>
        }
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteCategory(deleting.id);
          return result.error;
        }}
      />
    </>
  );
}

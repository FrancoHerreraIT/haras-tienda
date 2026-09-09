"use client";

import { useState } from "react";

export type ActionResult = { error?: string };

/**
 * Flujo compartido de los formularios del panel (Categorias y Productos).
 *
 * Guardar nunca escribe directo: el submit "estaciona" los datos y abre un
 * dialogo de confirmacion. Cancelar con cambios sin guardar tampoco cierra
 * de una: pregunta antes de descartarlos.
 *
 * Vive aca y no en cada tabla para que las dos pantallas no se desincronicen.
 */
export function useAbmFormModal<T>(actions: {
  create: (formData: FormData) => Promise<ActionResult>;
  update: (item: T, formData: FormData) => Promise<ActionResult>;
}) {
  /* null = cerrado | "new" = alta | T = edicion */
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [staged, setStaged] = useState<FormData | null>(null);
  const [askDiscard, setAskDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEditing(null);
    setDirty(false);
    setStaged(null);
    setAskDiscard(false);
    setError(null);
  }

  function open(item: T | "new") {
    reset();
    setEditing(item);
  }

  /** Cierre pedido por el usuario (boton Cancelar, X, Escape o fondo). */
  function requestClose() {
    if (staged) return; /* hay una confirmacion de guardado en curso */
    if (dirty) {
      setAskDiscard(true);
      return;
    }
    reset();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    /* FormData se captura ahora: el form sigue montado detras del dialogo. */
    setStaged(new FormData(event.currentTarget));
  }

  /** Lo ejecuta el ConfirmDialog de guardado; el texto devuelto es el error. */
  async function confirmSave(): Promise<string | void> {
    if (!staged || editing === null) return;

    const result =
      editing === "new"
        ? await actions.create(staged)
        : await actions.update(editing as T, staged);

    if (result.error) {
      /* El error se muestra en el formulario, que queda abierto y con los
         valores puestos: es donde estan los campos que hay que corregir. */
      setStaged(null);
      setError(result.error);
      return;
    }

    reset();
  }

  const isNew = editing === "new";

  return {
    /** Item en edicion, o null si es un alta. */
    current: editing !== "new" ? editing : null,
    isNew,
    isOpen: editing !== null,
    error,
    open,
    requestClose,
    /** Para campos que no emiten `input` al cambiar (ej: la subida de foto). */
    markDirty: () => setDirty(true),
    /** Props para el <form>: marca cambios y engancha el submit. */
    formProps: {
      onSubmit: handleSubmit,
      onInput: () => setDirty(true),
    },
    /** El formulario no se puede cerrar mientras hay un dialogo encima. */
    dismissible: !staged && !askDiscard,
    confirmSave: {
      open: staged !== null,
      onClose: () => setStaged(null),
      onConfirm: confirmSave,
    },
    confirmDiscard: {
      open: askDiscard,
      onClose: () => setAskDiscard(false),
      onConfirm: async () => {
        reset();
      },
    },
  };
}

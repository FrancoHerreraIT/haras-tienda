"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown } from "lucide-react";

export type SortDropdownOption<T extends string> = {
  value: T;
  label: string;
};

type SortDropdownProps<T extends string> = {
  label: string;
  value: T;
  options: readonly SortDropdownOption<T>[];
  onChange: (value: T) => void;
};

/**
 * Selector de orden del catalogo.
 *
 * Reemplaza al <select> nativo, cuyo desplegable dibuja el navegador (fondo
 * blanco, resaltado azul, letra chica) y no se puede estilar. Sigue el patron
 * listbox de ARIA: el boton abre la lista, las flechas recorren las opciones,
 * Enter o Espacio eligen y Escape cierra devolviendo el foco al boton.
 *
 * En desktop se abre como un panel debajo del boton; en el telefono, como
 * panel inferior (bottom sheet): ocupa el ancho de la pantalla, asi que no se
 * puede salir de ella, y deja las opciones al alcance del pulgar.
 */
export default function SortDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: SortDropdownProps<T>) {
  const [abierto, setAbierto] = useState(false);
  /* Opcion resaltada con el teclado o el puntero, todavia sin elegir. */
  const [activo, setActivo] = useState(0);

  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);

  const id = useId();
  const idEtiqueta = `${id}-etiqueta`;
  const idBoton = `${id}-boton`;
  const idLista = `${id}-lista`;
  const idOpcion = (indice: number) => `${id}-opcion-${indice}`;

  const indiceElegido = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const abrir = () => {
    setActivo(indiceElegido);
    setAbierto(true);
  };

  const cerrar = () => {
    setAbierto(false);
    boton.current?.focus();
  };

  const elegir = (indice: number) => {
    onChange(options[indice].value);
    cerrar();
  };

  /* Al abrir, el foco pasa a la lista para que las flechas la recorran.
     preventScroll: en el telefono la lista es un panel fijo y enfocarla no
     tiene por que mover la pagina. */
  useEffect(() => {
    if (abierto) lista.current?.focus({ preventScroll: true });
  }, [abierto]);

  /* Click afuera y Escape cierran. Escape se escucha en el documento y no en
     la lista: si el foco quedo en otro lado igual tiene que cerrar. */
  useEffect(() => {
    if (!abierto) return;

    const alTocarAfuera = (evento: PointerEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    const alApretarTecla = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };

    document.addEventListener("pointerdown", alTocarAfuera);
    document.addEventListener("keydown", alApretarTecla);
    return () => {
      document.removeEventListener("pointerdown", alTocarAfuera);
      document.removeEventListener("keydown", alApretarTecla);
    };
  }, [abierto]);

  const teclaEnBoton = (evento: KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      abrir();
    }
  };

  const teclaEnLista = (evento: KeyboardEvent<HTMLUListElement>) => {
    const ultimo = options.length - 1;
    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        setActivo((i) => Math.min(i + 1, ultimo));
        break;
      case "ArrowUp":
        evento.preventDefault();
        setActivo((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        evento.preventDefault();
        setActivo(0);
        break;
      case "End":
        evento.preventDefault();
        setActivo(ultimo);
        break;
      case "Enter":
      case " ":
        evento.preventDefault();
        elegir(activo);
        break;
      /* Tab cierra y deja el foco en el boton: si la lista se desmonta con el
         foco adentro, el navegador lo tira al <body>. */
      case "Tab":
        evento.preventDefault();
        cerrar();
        break;
    }
  };

  return (
    <div ref={contenedor} className="relative flex items-center gap-3">
      <span
        id={idEtiqueta}
        className="text-[13px] text-stone-500 whitespace-nowrap"
      >
        {label}
      </span>

      <button
        ref={boton}
        id={idBoton}
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={teclaEnBoton}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-labelledby={`${idEtiqueta} ${idBoton}`}
        className={`inline-flex min-h-[44px] items-center gap-2 border-b py-2 text-[13px] sm:text-[14px] tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5A2B] ${
          abierto
            ? "border-[#8B5A2B] text-amber-800"
            : "border-stone-300 text-stone-700 hover:border-[#8B5A2B] hover:text-amber-800"
        }`}
      >
        <span className="whitespace-nowrap">{options[indiceElegido].label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {abierto && (
        <>
          {/* Fondo del bottom sheet: solo en el telefono. Tocarlo cierra. */}
          <div
            aria-hidden="true"
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-50 bg-[#1C1A19]/40 sm:hidden"
          />

          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-[#F7F5F0] pb-safe shadow-2xl shadow-stone-900/30 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[220px] sm:rounded-xl sm:border sm:border-stone-200 sm:bg-white sm:pb-0 sm:shadow-xl sm:shadow-stone-300/40">
            <div className="px-5 pt-3 pb-1 sm:hidden">
              <span
                aria-hidden="true"
                className="mx-auto block h-1 w-10 rounded-full bg-stone-300"
              />
              <p className="mt-4 text-[12px] font-semibold tracking-wide text-amber-800">
                {label}
              </p>
            </div>

            <ul
              ref={lista}
              id={idLista}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={idEtiqueta}
              aria-activedescendant={idOpcion(activo)}
              onKeyDown={teclaEnLista}
              className="py-2 outline-none sm:py-1.5"
            >
              {options.map((opcion, indice) => {
                const elegida = indice === indiceElegido;
                return (
                  <li
                    key={opcion.value}
                    id={idOpcion(indice)}
                    role="option"
                    aria-selected={elegida}
                    onClick={() => elegir(indice)}
                    onPointerMove={() => setActivo(indice)}
                    className={`flex min-h-[52px] cursor-pointer select-none items-center justify-between gap-3 px-5 text-[15px] transition-colors sm:min-h-[40px] sm:px-4 sm:text-[14px] ${
                      indice === activo ? "bg-[#8B5A2B]/10" : ""
                    } ${
                      elegida
                        ? "font-semibold text-amber-800"
                        : "text-stone-700"
                    }`}
                  >
                    {opcion.label}
                    {elegida && (
                      <Check
                        className="h-4 w-4 shrink-0 text-[#8B5A2B]"
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

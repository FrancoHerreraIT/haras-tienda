"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { labelClass } from "./ui";
import {
  detectarFormatoDeArchivo,
  EXTENSIONES_ACEPTADAS,
  NOMBRE_FORMATO,
  type ImageFormat,
} from "@/lib/imageType";

/* Tope del plan de Cloudinary para imagenes. El archivo ya no pasa por
   nuestro servidor, asi que el limite lo pone Cloudinary y no el hosting. */
const MAX_BYTES = 10 * 1024 * 1024;

/** Mas de esto en una ficha de producto no aporta y complica la galeria. */
const MAX_FOTOS = 6;

/* Se listan las extensiones ademas de los MIME: para un .heic el navegador
   informa tipo vacio, y sin la extension el selector no lo deja ni elegir. */
const ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
  ...EXTENSIONES_ACEPTADAS,
].join(",");

type FirmaResponse = {
  signature: string;
  timestamp: number;
  folder: string;
  allowed_formats: string;
  transformation: string;
  apiKey: string;
  cloudName: string;
};

type ProductImagesFieldProps = {
  /** Nombre del campo repetido que lee la server action. */
  name?: string;
  /** Fotos ya guardadas, al editar un producto existente. */
  defaultValue?: string[];
  label?: string;
  /** Avisa que hubo cambios, para marcar el formulario como sucio. */
  onChanged?: () => void;
};

/**
 * Fotos del producto.
 *
 * La primera de la lista es la portada: es la que se ve en el listado, el
 * carrito y el checkout. El resto arma la galeria de la ficha.
 *
 * Cada archivo va derecho del navegador a Cloudinary; este servidor solo
 * entrega un permiso firmado (ver /api/upload/firma). Al formulario le quedan
 * unicamente las URL, en inputs ocultos repetidos.
 */
export default function ProductImagesField({
  name = "images",
  defaultValue = [],
  label = "Fotos del producto",
  onChanged,
}: ProductImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendientes = useRef<XMLHttpRequest[]>([]);

  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [subiendo, setSubiendo] = useState(0);
  const [total, setTotal] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [convertidas, setConvertidas] = useState<ImageFormat[]>([]);

  /* Si se cierra el formulario a mitad de una subida, se corta. */
  useEffect(
    () => () => {
      for (const xhr of pendientes.current) xhr.abort();
    },
    [],
  );

  function actualizar(siguiente: string[]) {
    setUrls(siguiente);
    onChanged?.();
  }

  function subirACloudinary(file: File, firma: FirmaResponse) {
    return new Promise<{ secure_url: string; format: string }>(
      (resolve, reject) => {
        const body = new FormData();
        body.append("file", file);
        body.append("api_key", firma.apiKey);
        body.append("timestamp", String(firma.timestamp));
        body.append("folder", firma.folder);
        body.append("allowed_formats", firma.allowed_formats);
        body.append("transformation", firma.transformation);
        body.append("signature", firma.signature);

        const xhr = new XMLHttpRequest();
        pendientes.current.push(xhr);
        xhr.open(
          "POST",
          `https://api.cloudinary.com/v1_1/${firma.cloudName}/image/upload`,
        );

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgreso(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          let payload: {
            secure_url?: string;
            format?: string;
            error?: { message?: string };
          };
          try {
            payload = JSON.parse(xhr.responseText);
          } catch {
            reject(new Error("Cloudinary devolvio una respuesta ilegible."));
            return;
          }
          if (xhr.status >= 200 && xhr.status < 300 && payload.secure_url) {
            resolve({
              secure_url: payload.secure_url,
              format: payload.format ?? "",
            });
          } else {
            reject(
              new Error(payload.error?.message ?? "No se pudo subir la imagen."),
            );
          }
        };
        xhr.onerror = () =>
          reject(new Error("No se pudo conectar con Cloudinary."));
        xhr.onabort = () => reject(new Error("Subida cancelada."));

        xhr.send(body);
      },
    );
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const elegidos = [...(event.target.files ?? [])];
    event.target.value = ""; /* permite volver a elegir el mismo archivo */
    if (elegidos.length === 0) return;

    setError(null);
    setConvertidas([]);

    const lugar = MAX_FOTOS - urls.length;
    if (lugar <= 0) {
      setError(`Ya tenes ${MAX_FOTOS} fotos, que es el maximo.`);
      return;
    }

    const archivos = elegidos.slice(0, lugar);
    if (elegidos.length > lugar) {
      setError(`Solo entran ${lugar} foto(s) mas: se toman las primeras.`);
    }

    setTotal(archivos.length);
    const nuevas: string[] = [];
    const cambiadas: ImageFormat[] = [];

    for (const [indice, file] of archivos.entries()) {
      setSubiendo(indice + 1);
      setProgreso(0);

      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" supera los 10 MB.`);
        continue;
      }

      /* Se miran los primeros bytes antes de subir: si no es una imagen, se
         evita mandar varios MB al pedo desde el celular. El filtro definitivo
         igual lo aplica Cloudinary con allowed_formats. */
      const formato = await detectarFormatoDeArchivo(file);
      if (!formato) {
        setError(
          `"${file.name}" no parece una imagen. Se aceptan JPG, PNG, WEBP, AVIF y HEIC de iPhone.`,
        );
        continue;
      }

      try {
        const respuesta = await fetch("/api/upload/firma", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formato }),
        });
        if (!respuesta.ok) {
          const detalle = await respuesta.json().catch(() => null);
          setError(detalle?.error ?? "No se pudo autorizar la subida.");
          break;
        }
        const firma: FirmaResponse = await respuesta.json();
        const { secure_url, format } = await subirACloudinary(file, firma);
        nuevas.push(secure_url);
        if (format && format !== (formato === "jpeg" ? "jpg" : formato)) {
          cambiadas.push(formato);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
        break;
      }
    }

    pendientes.current = [];
    setSubiendo(0);
    setTotal(0);
    setProgreso(0);
    setConvertidas([...new Set(cambiadas)]);
    if (nuevas.length > 0) actualizar([...urls, ...nuevas]);
  }

  const mover = (desde: number, hacia: number) => {
    if (hacia < 0 || hacia >= urls.length) return;
    const copia = [...urls];
    const [sacada] = copia.splice(desde, 1);
    copia.splice(hacia, 0, sacada);
    actualizar(copia);
  };

  const quitar = (indice: number) =>
    actualizar(urls.filter((_, i) => i !== indice));

  const ocupado = subiendo > 0;

  return (
    <div>
      <span className={labelClass}>{label}</span>

      {/* La server action solo lee esto: los binarios ya viajaron a Cloudinary. */}
      {urls.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}

      <div className="rounded-lg border border-stone-300 bg-white p-3 sm:p-4">
        {urls.length > 0 && (
          <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {urls.map((url, indice) => (
              <li key={url} className="group relative">
                <div
                  className={`relative aspect-square overflow-hidden rounded-lg border bg-stone-100 ${
                    indice === 0 ? "border-[#8B5A2B]" : "border-stone-200"
                  }`}
                >
                  <Image
                    src={url}
                    alt={
                      indice === 0
                        ? "Portada del producto"
                        : `Foto ${indice + 1} del producto`
                    }
                    fill
                    sizes="(max-width: 640px) 33vw, 120px"
                    className="object-cover"
                  />

                  {indice === 0 && (
                    <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-[#8B5A2B] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-stone-50">
                      <Star className="h-2.5 w-2.5" />
                      Portada
                    </span>
                  )}
                </div>

                {/* Orden y borrado. La primera posicion es la portada, asi que
                    mover una foto al principio equivale a elegir la portada. */}
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => mover(indice, indice - 1)}
                      disabled={indice === 0 || ocupado}
                      aria-label={`Mover la foto ${indice + 1} hacia adelante`}
                      className="flex h-8 w-8 items-center justify-center rounded text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(indice, indice + 1)}
                      disabled={indice === urls.length - 1 || ocupado}
                      aria-label={`Mover la foto ${indice + 1} hacia atras`}
                      className="flex h-8 w-8 items-center justify-center rounded text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(indice)}
                    disabled={ocupado}
                    aria-label={`Quitar la foto ${indice + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded text-stone-400 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleFileChange}
          className="sr-only"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={ocupado || urls.length >= MAX_FOTOS}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3.5 py-3 text-xs font-semibold tracking-wide text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-60 sm:py-2"
          >
            {ocupado ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : urls.length === 0 ? (
              <ImagePlus className="h-3.5 w-3.5" />
            ) : (
              <UploadCloud className="h-3.5 w-3.5" />
            )}
            {ocupado
              ? `Subiendo ${subiendo} de ${total}...`
              : urls.length === 0
                ? "Elegir fotos"
                : "Agregar mas"}
          </button>

          <span className="text-xs text-stone-400">
            {urls.length} de {MAX_FOTOS}
          </span>
        </div>

        {ocupado && (
          <div className="mt-3">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200"
              role="progressbar"
              aria-valuenow={progreso}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de la subida"
            >
              <div
                className="h-full rounded-full bg-[#8B5A2B] transition-[width] duration-200"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {progreso < 100 ? `Subiendo ${progreso}%` : "Procesando..."}
            </p>
          </div>
        )}

        {!ocupado && (
          <p className="mt-2 text-xs text-stone-400">
            Podes elegir varias a la vez. JPG, PNG, WEBP, AVIF o HEIC de iPhone,
            hasta 10 MB cada una. La primera es la portada.
          </p>
        )}

        {convertidas.length > 0 && !ocupado && (
          <p className="mt-1.5 text-xs font-medium text-emerald-700">
            Foto {convertidas.map((f) => NOMBRE_FORMATO[f]).join(" y ")}{" "}
            convertida automaticamente a un formato que se ve en todos los
            navegadores.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-2 text-xs font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

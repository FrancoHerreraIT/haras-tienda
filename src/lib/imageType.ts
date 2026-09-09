/**
 * Deteccion del tipo de imagen por el contenido del archivo.
 *
 * Funciona igual en el navegador y en el servidor (usa Uint8Array, no Buffer),
 * porque la foto ahora se sube directo del navegador a Cloudinary y el
 * descarte temprano conviene hacerlo antes de gastar la subida.
 *
 * No se usa el MIME que informa el navegador por dos razones:
 *
 *  1. Para un .heic Chrome en Windows informa cadena vacia (el sistema no
 *     conoce la extension), asi que una lista blanca de MIME rechaza justo
 *     las fotos de iPhone que queremos aceptar.
 *  2. El MIME lo elige el cliente: no es una validacion, es una sugerencia.
 */

export type ImageFormat = "jpeg" | "png" | "webp" | "avif" | "heic";

/** Alcanza con el arranque del archivo para reconocer el formato. */
export const BYTES_A_INSPECCIONAR = 64;

/** Marcas ISO-BMFF de la familia HEIF/HEIC. */
const MARCAS_HEIC = new Set([
  "heic",
  "heix",
  "heim",
  "heis",
  "hevc",
  "hevx",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

/** Marcas ISO-BMFF de AVIF: mismo contenedor que HEIC, distinta marca. */
const MARCAS_AVIF = new Set(["avif", "avis"]);

const PNG_FIRMA = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Lee `largo` bytes como texto ASCII, que es como se guardan las marcas. */
const texto = (bytes: Uint8Array, desde: number, hasta: number) =>
  String.fromCharCode(...bytes.subarray(desde, hasta));

const leerMarcas = (bytes: Uint8Array): string[] => {
  /* Caja ftyp: [tamano:4]["ftyp":4][marca principal:4][version:4][compatibles...] */
  const tamano = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(0);
  const fin = Math.min(tamano, bytes.length);

  const marcas = [texto(bytes, 8, 12)];
  for (let i = 16; i + 4 <= fin; i += 4) marcas.push(texto(bytes, i, i + 4));
  return marcas;
};

/**
 * Devuelve el formato real del archivo, o null si no es una imagen aceptada.
 */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length < 12) return null;

  /* JPEG: FF D8 FF */
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";

  /* PNG: 89 "PNG" CR LF 1A LF */
  if (PNG_FIRMA.every((b, i) => bytes[i] === b)) return "png";

  /* WebP: "RIFF" .... "WEBP" */
  if (texto(bytes, 0, 4) === "RIFF" && texto(bytes, 8, 12) === "WEBP") {
    return "webp";
  }

  /* AVIF y HEIC comparten el contenedor ISO-BMFF: se distinguen por la marca. */
  if (texto(bytes, 4, 8) === "ftyp") {
    const marcas = leerMarcas(bytes);
    if (marcas.some((m) => MARCAS_AVIF.has(m))) return "avif";
    if (marcas.some((m) => MARCAS_HEIC.has(m))) return "heic";
  }

  return null;
}

/** Extensiones que ofrece el selector de archivos, incluidas las de iPhone. */
export const EXTENSIONES_ACEPTADAS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".heic",
  ".heif",
] as const;

/**
 * Lee el arranque del archivo elegido y dice que formato es.
 * Corre en el navegador, antes de subir: si no es una imagen, evita mandar
 * varios MB al pedo desde el celular.
 */
export async function detectarFormatoDeArchivo(
  file: File,
): Promise<ImageFormat | null> {
  const cabecera = await file.slice(0, BYTES_A_INSPECCIONAR).arrayBuffer();
  return detectImageFormat(new Uint8Array(cabecera));
}

/** Como se nombra cada formato cuando hay que avisarle algo al usuario. */
export const NOMBRE_FORMATO: Record<ImageFormat, string> = {
  jpeg: "JPG",
  png: "PNG",
  webp: "WEBP",
  avif: "AVIF",
  heic: "HEIC",
};

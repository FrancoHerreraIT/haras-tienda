import { NextResponse } from "next/server";

import { auth } from "@/auth";
import cloudinary, { assertCloudinaryConfig } from "@/lib/cloudinary";
import type { ImageFormat } from "@/lib/imageType";

/* El SDK de Cloudinary usa APIs de Node: no corre en el runtime edge. */
export const runtime = "nodejs";

const FOLDER = "productos";

/* Sin SVG a proposito: puede traer scripts adentro. */
const ALLOWED_FORMATS = "jpg,jpeg,png,webp,avif,heic,heif";

const RECORTE = "c_limit,w_1200,h_1200,q_auto";

/**
 * Transformacion que se aplica al guardar, segun el formato de entrada.
 *
 *  - Un JPEG o un HEIC nunca tienen transparencia, asi que se fuerza JPG.
 *    Importa: con f_auto una foto muy ruidosa puede terminar guardada como
 *    PNG y pesar varios MB (medido: 4,3 MB contra 1,4 MB en JPG).
 *  - Un PNG, WEBP o AVIF si puede tener transparencia, asi que se deja
 *    elegir a Cloudinary con f_auto y no se pierde el canal alfa.
 *
 * Es un mapa cerrado: lo que informa el navegador solo sirve para elegir una
 * de estas dos opciones, nunca para armar una transformacion a medida.
 */
const TRANSFORMACIONES: Record<ImageFormat, string> = {
  jpeg: `${RECORTE},f_jpg`,
  heic: `${RECORTE},f_jpg`,
  png: `${RECORTE},f_auto`,
  webp: `${RECORTE},f_auto`,
  avif: `${RECORTE},f_auto`,
};

/** Si el navegador no informa nada util, la opcion que nunca pierde datos. */
const TRANSFORMACION_POR_DEFECTO = `${RECORTE},f_auto`;

/**
 * Entrega un permiso firmado para que el navegador suba la foto directo a
 * Cloudinary, sin pasar por este servidor.
 *
 * Se hace asi porque el archivo no puede viajar por aca: las funciones
 * serverless de Vercel cortan el cuerpo del request en 4,5 MB, y una foto de
 * celular puede pasarse. Ademas, yendo directo viaja una sola vez.
 *
 * La clave secreta de Cloudinary nunca sale de este archivo: al navegador
 * solo va la firma, que vale para esta subida y caduca sola (Cloudinary
 * rechaza timestamps de mas de una hora).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    assertCloudinaryConfig();
  } catch (error) {
    console.error("[upload/firma] configuracion incompleta:", error);
    return NextResponse.json(
      { error: "El servidor no tiene configurado Cloudinary." },
      { status: 500 },
    );
  }

  const cuerpo = await request.json().catch(() => null);
  const formato = cuerpo?.formato as ImageFormat | undefined;
  const transformation =
    (formato && TRANSFORMACIONES[formato]) ?? TRANSFORMACION_POR_DEFECTO;

  const params = {
    timestamp: Math.round(Date.now() / 1000),
    folder: FOLDER,
    allowed_formats: ALLOWED_FORMATS,
    transformation,
  };

  const signature = cloudinary.utils.api_sign_request(
    params,
    cloudinary.config().api_secret as string,
  );

  return NextResponse.json({
    ...params,
    signature,
    /* Publicos: aparecen en cualquier URL de entrega. El secreto no. */
    apiKey: cloudinary.config().api_key,
    cloudName: cloudinary.config().cloud_name,
  });
}

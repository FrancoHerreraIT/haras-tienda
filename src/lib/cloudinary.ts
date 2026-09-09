import { v2 as cloudinary } from "cloudinary";

/**
 * Cliente unico de Cloudinary para el servidor.
 *
 * Las credenciales viven solo en .env (sin prefijo NEXT_PUBLIC_): este modulo
 * nunca debe importarse desde un Client Component.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/** Falla al arrancar y no en el primer upload, que es cuando molesta. */
export function assertCloudinaryConfig() {
  const missing = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ].filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de Cloudinary en .env: ${missing.join(", ")}`,
    );
  }
}

export default cloudinary;

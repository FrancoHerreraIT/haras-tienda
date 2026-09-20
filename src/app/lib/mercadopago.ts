/**
 * Acceso al SDK de Mercado Pago.
 *
 * ⚠ Este modulo es SOLO de servidor. El access token permite cobrar y
 * consultar los pagos de la cuenta, asi que no lleva prefijo NEXT_PUBLIC_ y
 * no puede importarse desde un componente cliente: ahi `process.env` no lo
 * resuelve y el token quedaria expuesto en el bundle.
 */
import { MercadoPagoConfig } from "mercadopago";

/**
 * Lee una variable de entorno obligatoria.
 *
 * Se resuelve al atender la request y no en el tope del modulo: si tirara al
 * importar, `next build` fallaria en cualquier maquina sin el .env.local.
 */
function leerEnv(nombre: string): string {
  const valor = process.env[nombre]?.trim();

  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Agregala a .env.local.`,
    );
  }

  return valor;
}

/** Cliente del SDK v3 (misma API que la 2.x: config + clases por recurso). */
export function getMercadoPagoClient(): MercadoPagoConfig {
  return new MercadoPagoConfig({
    accessToken: leerEnv("MP_ACCESS_TOKEN"),
    options: { timeout: 8000 },
  });
}

/**
 * URL publica de la app, sin barra final. Es la base de las back_urls y del
 * webhook, asi que tiene que ser la que ve el cliente, no la interna.
 */
export function getAppBaseUrl(): string {
  const explicita = process.env.APP_BASE_URL?.trim();
  if (explicita) return explicita.replace(/\/+$/, "");

  /* En Vercel el dominio viene sin protocolo. Sirve de red de seguridad si
     alguien despliega sin setear APP_BASE_URL. */
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

/**
 * Si Mercado Pago puede llegar a esa URL desde internet.
 *
 * Importa porque `auto_return` y `notification_url` se validan del lado de
 * MP: con http://localhost la creacion de la preferencia responde 400 y el
 * checkout no abre nunca. En desarrollo, o levantas un tunel (ngrok,
 * cloudflared) y apuntas APP_BASE_URL ahi, o la preferencia se crea sin esos
 * dos campos y el flujo igual funciona (el usuario vuelve con el boton
 * "Volver al sitio" y el pedido se confirma cuando haya webhook).
 */
export function esAlcanzableDesdeInternet(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);

    if (protocol !== "https:") return false;

    return (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "[::1]"
    );
  } catch {
    return false;
  }
}

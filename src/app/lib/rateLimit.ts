/**
 * Limite de intentos por ventana de tiempo. Corre **solo** en el servidor.
 *
 * Frena dos abusos de endpoints publicos:
 *  - Adivinar la clave del panel probando contraseñas en bucle (login).
 *  - Crear pedidos en bucle: cada pedido por transferencia manda un mail desde
 *    la casilla de la tienda, y un bot podria usarla para mandar spam hasta
 *    que Gmail la suspenda.
 *
 * El contador vive en Postgres (tabla RateLimit) y no en memoria: en Vercel
 * cada request puede caer en una instancia distinta, y un Map en memoria se
 * reinicia solo sin frenar a nadie.
 */
import { prisma } from "@/app/lib/prisma";

/**
 * Suma un intento a `clave` y dice si ya se paso de `maximo` dentro de la
 * ventana.
 *
 * Es una sola sentencia (INSERT ... ON CONFLICT): dos requests simultaneos
 * no pueden leer el mismo conteo y pasar los dos. La ventana es fija: arranca
 * con el primer intento y, cuando vence, el siguiente intento la reinicia en 1.
 *
 * Si la base falla, deja pasar: un problema del contador no puede dejar al
 * dueño afuera del panel ni frenar una venta. Queda en el log.
 */
export async function superaLimite(
  clave: string,
  maximo: number,
  ventanaSegundos: number,
): Promise<boolean> {
  try {
    const [fila] = await prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${clave}, 1, CURRENT_TIMESTAMP)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."windowStart" < CURRENT_TIMESTAMP - (${ventanaSegundos}::int * INTERVAL '1 second')
          THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "windowStart" = CASE
          WHEN "RateLimit"."windowStart" < CURRENT_TIMESTAMP - (${ventanaSegundos}::int * INTERVAL '1 second')
          THEN CURRENT_TIMESTAMP
          ELSE "RateLimit"."windowStart"
        END
      RETURNING "count"
    `;

    limpiarDeVezEnCuando();

    return Number(fila?.count ?? 0) > maximo;
  } catch (e) {
    console.error("[rate limit] no se pudo contar el intento", { clave, e });
    return false;
  }
}

/**
 * Borra los contadores viejos cada tanto, para que la tabla no crezca con
 * cada IP que alguna vez paso. No se espera: si falla, no importa.
 */
function limpiarDeVezEnCuando() {
  if (Math.random() > 0.02) return;

  prisma.$executeRaw`
    DELETE FROM "RateLimit"
    WHERE "windowStart" < CURRENT_TIMESTAMP - INTERVAL '1 day'
  `.catch((e) => {
    console.warn("[rate limit] no se pudieron borrar contadores viejos", e);
  });
}

/**
 * IP del cliente segun los headers del request.
 *
 * En Vercel, `x-real-ip` y el primer valor de `x-forwarded-for` los escribe
 * la plataforma, no el navegador: no se pueden falsear desde afuera.
 */
export function ipDelCliente(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  const reenviada = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || "desconocida";
}

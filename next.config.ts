import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /* Las fotos de producto viven en Cloudinary: next/image necesita el
       host declarado para poder optimizarlas. */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  /* El logo de los mails se lee del disco en tiempo de ejecucion
     (src/app/lib/emailLayout.ts) y no se sirve como asset: hay que pedirle al
     trace que lo empaquete con el servidor. Sin esto, en un deploy serverless
     el archivo no viaja con la funcion y los tres avisos salen con el
     encabezado vacio — y nadie se entera hasta que un cliente abre el mail.
     La clave global apunta a todas las rutas porque el mail sale de tres
     lugares distintos: el checkout, el webhook de MP y el panel. */
  outputFileTracingIncludes: {
    "/*": ["./public/logo-haras-mail.png"],
  },

  /* El dominio oficial es harasdeleste.com.ar: el de Vercel sigue vivo pero
     se redirige entero, con la misma ruta y query, para no tener dos copias
     del sitio indexadas. Solo matchea ese host exacto, asi que los previews
     (haras-tienda-git-*.vercel.app) y localhost no se tocan.
     `permanent: true` responde 308 y no 301: para buscadores es lo mismo,
     pero 308 conserva el metodo. Importa por el webhook de Mercado Pago —
     las preferencias creadas antes del cambio de dominio siguen notificando
     con POST al dominio viejo, y un 301 lo puede convertir en GET. */
  /* Headers de seguridad para todas las respuestas.
      - frame-ancestors / X-Frame-Options: nadie puede meter el sitio en un
        iframe. Evita el clickjacking, que en el panel seria que alguien haga
        clic en "Marcar como pagado" creyendo que toca otra cosa. X-Frame-
        Options queda por los navegadores viejos que no leen el CSP.
      - HSTS: el navegador no vuelve a entrar por http, ni siquiera tipeando
        la direccion a mano. Sin includeSubDomains ni preload: no sabemos que
        otros subdominios tiene el dominio, y preload no se deshace facil.
      - nosniff: un archivo se interpreta solo como el tipo que declara.
      - Referrer-Policy: al salir del sitio (a Mercado Pago, a WhatsApp) no
        viaja la URL completa, que en /checkout/transferencia lleva el id
        del pedido.
      - Permissions-Policy: el sitio no usa camara, microfono ni ubicacion.
     No hay un Content-Security-Policy completo a proposito: el checkout
     redirige a Mercado Pago, el panel sube fotos directo a Cloudinary y
     next/font sirve las fuentes. Una CSP que se olvide de uno de esos rompe
     la compra en produccion; si se agrega, hay que probarla entera antes. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  /* No anuncia "X-Powered-By: Next.js": no le sirve a nadie mas que al que
     busca que version atacar. */
  poweredByHeader: false,

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "haras-tienda.vercel.app" }],
        destination: "https://harasdeleste.com.ar/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

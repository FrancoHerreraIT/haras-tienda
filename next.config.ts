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

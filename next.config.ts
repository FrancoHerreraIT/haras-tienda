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
};

export default nextConfig;

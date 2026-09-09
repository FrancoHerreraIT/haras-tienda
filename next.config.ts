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
};

export default nextConfig;

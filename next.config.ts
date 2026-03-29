import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Subida de imágenes en createProperty / updateProperty (FormData en Server Actions) */
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;

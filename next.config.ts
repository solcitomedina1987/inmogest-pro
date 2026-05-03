import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard/admin-general/conceptos-pago",
        destination: "/dashboard/admin-general",
        permanent: true,
      },
      {
        source: "/dashboard/admin-general/tipos-propiedad",
        destination: "/dashboard/admin-general",
        permanent: true,
      },
      {
        source: "/dashboard/admin-general/estados-propiedad",
        destination: "/dashboard/admin-general",
        permanent: true,
      },
      {
        source: "/dashboard/admin-usuarios",
        destination: "/dashboard/admin-general?tab=usuarios",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  /* Hasta 10 imágenes × 5 MB + campos del formulario (createProperty / updateProperty). */
  experimental: {
    serverActions: {
      bodySizeLimit: "55mb",
    },
  },
};

export default nextConfig;

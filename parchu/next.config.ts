import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default es 1mb; la imagen de producto comprimida en el cliente mas
      // el resto del formulario necesita margen sobre ese limite.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;

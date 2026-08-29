/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/gestao",
  trailingSlash: true,
  experimental: {
    serverComponentsExternalPackages: ["exceljs"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

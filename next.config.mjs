/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/gestao",
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

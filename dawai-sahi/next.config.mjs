/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.56.1', '192.168.29.47', '192.168.29.47:3000', '10.34.238.147', '192.168.*', 'localhost:*'],
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required by the on-prem Dockerfile: emits .next/standalone with a
  // self-contained server.js and only the traced node_modules. Without this
  // the production image cannot be built at all.
  output: 'standalone',
};

export default nextConfig;

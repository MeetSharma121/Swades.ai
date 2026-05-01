import path from "node:path";

const monorepoRoot = path.resolve(process.cwd(), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;

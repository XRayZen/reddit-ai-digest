import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  // standalone 出力にして、runtime image に build toolchain と full node_modules を残さない。
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@swisseph/node"],
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals.push({
        "@swisseph/node": "commonjs @swisseph/node"
      });
    }
    return config;
  }
};

module.exports = nextConfig;

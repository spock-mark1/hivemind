/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@selanet/shared'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

module.exports = nextConfig;

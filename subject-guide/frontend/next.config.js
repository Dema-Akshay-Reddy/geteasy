/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare Sites deploys this as a static site: all routes in this app
  // are client components ("○ Static"), so a pure static export works.
  output: 'export',
};

module.exports = nextConfig;

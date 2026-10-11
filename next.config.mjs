/** @type {import('next').NextConfig} */
// Buildzeit-Option: z.B. NEXT_PUBLIC_BASE_PATH=/ImmoCash für
// https://BENUTZER.github.io/ImmoCash/ – leer für BENUTZER.github.io.
const rawBase = process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? '';
const basePath = rawBase === '/' || !rawBase ? '' : `/${rawBase.replace(/^\/+|\/+$/g, '')}`;

const nextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true
};

export default nextConfig;

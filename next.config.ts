import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  reactStrictMode: true,
  // Disable dev tools UI and error overlay in development
  ...(process.env.NODE_ENV === 'development' && {
    typescript: {
      tsconfigPath: './tsconfig.json',
    },
  }),
};

export default nextConfig;

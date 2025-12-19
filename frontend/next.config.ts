import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure environment variables are properly embedded
  env: {
    // Explicitly expose NEXT_PUBLIC_ variables (though Next.js does this automatically)
    // This is just to ensure they're available
  },
  // Include WASM files from @blobkit/kzg-wasm in the deployment bundle
  // This is required for KZG initialization in serverless environments (Vercel)
  outputFileTracingIncludes: {
    '/api/create-blob': [
      './node_modules/@blobkit/kzg-wasm/**/*',
      './node_modules/kzg-wasm/**/*',
    ],
  },
  // Prevent Next.js from bundling these packages (helps with WASM files)
  serverExternalPackages: ['@blobkit/kzg-wasm'],
  // Webpack configuration to ensure WASM files are included in the build
  // Note: This is used in production builds (Vercel uses webpack)
  webpack: (config) => {
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });
    return config;
  },
  // Turbopack configuration for local development
  // Empty config silences the warning - Turbopack handles WASM files natively
  turbopack: {},
};

export default nextConfig;

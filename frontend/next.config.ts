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
  experimental: {
    outputFileTracingIncludes: {
      '/api/create-blob': [
        './node_modules/@blobkit/kzg-wasm/**/*',
        './node_modules/kzg-wasm/**/*',
      ],
    },
  },
};

export default nextConfig;

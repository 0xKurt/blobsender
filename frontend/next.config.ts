import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure environment variables are properly embedded
  env: {
    // Explicitly expose NEXT_PUBLIC_ variables (though Next.js does this automatically)
    // This is just to ensure they're available
  },
};

export default nextConfig;

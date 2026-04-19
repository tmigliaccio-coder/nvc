import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Expose Vercel commit to the client so you can confirm Production is on the latest deploy. */
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// Owner: Member 3. Cache Components is turned off on purpose: our pages always
// need fresh data from the database and read the demo-role cookie.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  outputFileTracingIncludes: {
    "/*": [
      "./starters/react/**/*",
      "./starters/nextjs/**/*",
      "./starters/vue/**/*",
      "./starters/express-simple/**/*",
      "./starters/hono-nodejs-starter/**/*",
      "./starters/angular/**/*",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      }
    ],
  },
    async headers() {

        return [
            {
                source: "/:path*",

                headers: [

                    {
                        key:
                        "Cross-Origin-Opener-Policy",

                        value:
                        "same-origin"
                    },

                    {
                        key:
                        "Cross-Origin-Embedder-Policy",

                        value:
                        "require-corp"
                    }

                ]

            }
        ];

    }

};

export default nextConfig;

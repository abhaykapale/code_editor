import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
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

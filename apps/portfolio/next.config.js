import { fileURLToPath } from "node:url";

const config = {
  reactStrictMode: true,

  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      exclude: fileURLToPath(import.meta.resolve("./src/app/icon1.svg")),
      use: ["@svgr/webpack"],
    });
    return config;
  },

  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=2592000",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Permissions-Policy",
          value:
            "vibrate=(), geolocation=(), midi=(), notifications=(), push=(), sync-xhr=(), microphone=(), camera=(), magnetometer=(), gyroscope=(), speaker=(), vibrate=(), fullscreen=self",
        },
      ],
    },
  ],
};
export default config;

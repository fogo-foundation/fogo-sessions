const config = {
  headers: async () => [
    {
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
      source: "/:path*",
    },
  ],

  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  reactStrictMode: true,

  /**
   * pino, pino-pretty and thread-stream have an issue here:
   * https://github.com/vercel/next.js/issues/86099#issuecomment-3610573089
   *
   * when this problem fixed, we can remove these packages from the serverExternalPackages and from package.json
   */
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],

  turbopack: {
    rules: {
      "*.svg": {
        as: "*.js",
        loaders: ["@svgr/webpack"],
      },
    },
  },
};
export default config;

const config = {
  cacheComponents: true,

  headers: () =>
    Promise.resolve([
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
    ]),
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // Include binaries in the serverless function bundle
  outputFileTracingIncludes: {
    "/api/validate-transaction": ["./bin/**/*"],
  },
  reactStrictMode: true,
};
export default config;

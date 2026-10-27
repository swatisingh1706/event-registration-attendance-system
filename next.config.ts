import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs", "exceljs"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Camera is required by the check-in scanner (same-origin only).
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          // Browsers remember to use HTTPS only (ignored over plain http, e.g. localhost).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // Restrictions that cost nothing: no embedding, no plugins, forms and <base> stay on this site.
          { key: "Content-Security-Policy", value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'" },
        ],
      },
    ];
  },
};

export default config;

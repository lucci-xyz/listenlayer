import type { NextConfig } from "next";

// Base security headers applied to all routes
const baseSecurityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

// Content Security Policy for the main app
// Allows: self, Stripe, Supabase, Vercel Analytics
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://vitals.vercel-insights.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

// CSP for embed pages - allows being embedded anywhere
const embedCspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors *", // Allow embedding anywhere
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["jsdom", "@mozilla/readability"],
  poweredByHeader: false,
  async headers() {
    return [
      // Embed pages - allow framing from any origin
      {
        source: "/embed/:path*",
        headers: [
          ...baseSecurityHeaders.filter(h => h.key !== "X-Frame-Options"),
          { key: "Content-Security-Policy", value: embedCspDirectives },
        ],
      },
      // Widget.js - allow loading from any origin
      {
        source: "/widget.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
      // API routes - no CSP needed, but include security headers
      {
        source: "/api/:path*",
        headers: [
          ...baseSecurityHeaders,
        ],
      },
      // All other routes - full security headers
      {
        source: "/:path*",
        headers: [
          ...baseSecurityHeaders,
          { key: "Content-Security-Policy", value: cspDirectives },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;

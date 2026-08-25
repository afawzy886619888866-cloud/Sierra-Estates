import path from "node:path";
import type { NextConfig } from "next";

// Packages that use Node.js native binaries — must never be bundled client-side
const SERVER_ONLY_PACKAGES = [
  '@grpc/grpc-js',
  '@opentelemetry/exporter-trace-otlp-grpc',
  '@opentelemetry/exporter-trace-otlp-http',
  '@opentelemetry/exporter-logs-otlp-http',
  '@opentelemetry/sdk-node',
  '@opentelemetry/sdk-logs',
  '@opentelemetry/sdk-trace-node',
  '@opentelemetry/instrumentation-http',
  '@opentelemetry/instrumentation-express',
  'firebase-admin',
];


const nextConfig: NextConfig = {
  transpilePackages: [
    '@sierra-estates/memory-engine',
    '@sierra-estates/agents',
    '@sierra-estates/agents-core',
    '@sierra-estates/db',
    '@sierra-estates/ui',
    '@sierra-estates/obsidian',
  ],
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'sierra-estates-build';
  },

  serverExternalPackages: [
    '@grpc/grpc-js',
    '@opentelemetry/exporter-trace-otlp-grpc',
    '@opentelemetry/sdk-node',
    'firebase-admin',
    'googleapis',
    'twilio',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.firebasestorage.app' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '**.picsum.photos' },
      { protocol: 'https', hostname: 'media.istockphoto.com' },
    ],
  },
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return {
      // The static HTML portal under public/client-page/ has been retired in
      // favor of the App Router React homepage (app/(client)/ClientHome.tsx).
      // All prior rewrites here pointed at those now-deleted static files —
      // removed rather than left dangling. Every route below now has a real
      // App Router page (see app/compounds, app/properties, app/property,
      // app/virtual-tour, app/(client)/page.tsx).
      beforeFiles: [],
      afterFiles: [],
      // Do not use a catch-all fallback here. It captures /_next assets and
      // makes the App Router HTML load without its CSS/JS in production.
    };
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  turbopack: {
    // Pin the monorepo root so Turbopack never infers a different checkout's
    // lockfile as the workspace root (breaks module resolution in git worktrees)
    root: path.join(__dirname, '..', '..'),
    resolveAlias: {
      '@grpc/grpc-js': './lib/stubs/empty.js',
      '@opentelemetry/exporter-trace-otlp-grpc': './lib/stubs/empty.js',
      '@opentelemetry/exporter-trace-otlp-http': './lib/stubs/empty.js',
      '@opentelemetry/exporter-logs-otlp-http': './lib/stubs/empty.js',
      '@opentelemetry/sdk-node': './lib/stubs/empty.js',
      '@opentelemetry/sdk-logs': './lib/stubs/empty.js',
      '@opentelemetry/sdk-trace-node': './lib/stubs/empty.js',
      '@opentelemetry/instrumentation-http': './lib/stubs/empty.js',
      '@opentelemetry/instrumentation-express': './lib/stubs/empty.js',
      // firebase-admin is intentionally NOT aliased here — it is a real
      // server-only package handled by serverExternalPackages above.
    }
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      // Stub all server-only packages to empty modules in the browser bundle
      SERVER_ONLY_PACKAGES.forEach(pkg => {
        config.resolve.alias[pkg] = false;
      });
      config.resolve.alias['firebase-admin'] = false;
      config.resolve.alias['firebase-admin/firestore'] = false;
      config.resolve.alias['firebase-admin/storage'] = false;
    }
    return config;
  },
};

export default nextConfig;

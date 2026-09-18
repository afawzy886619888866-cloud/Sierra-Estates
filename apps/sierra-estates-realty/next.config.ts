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
];

const nextConfig: NextConfig = {
  // `npm run build` already type-checks via `tsc --noEmit` before `next build`.
  // On low-RAM local containers (<4GB) the in-build TypeScript re-check can
  // exhaust memory and stall. Set LOCAL_SKIP_TS=1 to skip ONLY the redundant
  // in-build re-check locally; CI/Vercel never sets it and always type-checks.
  typescript: {
    ignoreBuildErrors: process.env.LOCAL_SKIP_TS === '1',
  },
  // Pin the monorepo root so output file tracing (which produces the
  // serverless function file list for `vercel build`) resolves pnpm's
  // symlinked node_modules structure from the true workspace root instead
  // of inferring one from this app's subdirectory — mismatched from
  // turbopack.root below otherwise, which caused deployed middleware to
  // fail with "Cannot find module 'next/dist/build/adapter/setup-node-env.external'".
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
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

  // Legacy path: /dashboard used to serve the retired Houyez /client portal.
  // Redirect to home instead of rewriting to a route that no longer exists.
  async redirects() {
    return [{ source: '/dashboard', destination: '/', permanent: false }];
  },

  serverExternalPackages: [
    '@grpc/grpc-js',
    '@opentelemetry/exporter-trace-otlp-grpc',
    '@opentelemetry/sdk-node',
    'googleapis',
    'twilio',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '**.picsum.photos' },
      { protocol: 'https', hostname: 'media.istockphoto.com' },
      // Sierra's own Property Finder listing photography (canonical image source)
      { protocol: 'https', hostname: 'static.shared.propertyfinder.eg' },
      { protocol: 'https', hostname: '**.propertyfinder.eg' },
    ],
  },
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return {
      beforeFiles: [
        // Route admin subdomain or admin-mode deployments to /admin
        ...(process.env.NEXT_PUBLIC_SITE_MODE === 'admin'
          ? [
              {
                source: '/',
                destination: '/admin',
              },
              {
                source: '/login',
                destination: '/admin/login',
              },
              {
                source: '/signin',
                destination: '/admin/login',
              },
            ]
          : [
              {
                source: '/',
                has: [{ type: 'host' as const, value: 'admin.sierra-estates.net' }],
                destination: '/admin',
              },
              {
                source: '/login',
                has: [{ type: 'host' as const, value: 'admin.sierra-estates.net' }],
                destination: '/admin/login',
              },
              {
                source: '/signin',
                has: [{ type: 'host' as const, value: 'admin.sierra-estates.net' }],
                destination: '/admin/login',
              },
            ]),

        // RFC 5785 rewrites: Map .well-known endpoints to /api/well-known to ensure clean Vercel deployments
        {
          source: '/.well-known/oauth-authorization-server',
          destination: '/api/well-known/oauth-authorization-server',
        },
        {
          source: '/.well-known/oauth-protected-resource',
          destination: '/api/well-known/oauth-protected-resource',
        },
      ],
      afterFiles: [],
      fallback: [],
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
    }
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      // Stub all server-only packages to empty modules in the browser bundle
      SERVER_ONLY_PACKAGES.forEach(pkg => {
        config.resolve.alias[pkg] = false;
      });
    }
    return config;
  },
};

export default nextConfig;

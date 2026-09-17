/** @type {import('next').NextConfig} */
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const nextConfig = {
  // Server-rendered deployment; disable static export during production builds to support route handlers
  output: undefined,

  experimental: {
    // Enable partial prerendering for better prefetch behavior
    ppr: false,
    // Disable aggressive prefetching to reduce RSC errors
    optimisticClientCache: false,
  },

  // Move server external packages to correct location
  serverExternalPackages: ['@prisma/client'],

  // Enable turbopack for builds
  turbopack: {},

  // ============================================
  // BUNDLE SIZE OPTIMIZATIONS
  // ============================================

  // Bundle optimizations are handled automatically in Next.js 16

  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Prioritize .tsx over .ts for component resolution
    config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];

    // ============================================
    // CODE SPLITTING OPTIMIZATIONS
    // ============================================

    // Optimize chunk splitting for better caching
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Separate vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Separate React and Next.js chunks
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
          },
          // Separate UI library chunks
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|@headlessui|lucide-react)[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 15,
          },
          // Separate heavy libraries
          heavy: {
            test: /[\\/]node_modules[\\/](@prisma|stripe|axios)[\\/]/,
            name: 'heavy-libs',
            chunks: 'async', // Load asynchronously
            priority: 5,
          },
        },
      },
      // Enable module concatenation for smaller bundles
      concatenateModules: !dev,
      // Minimize bundle size in production
      minimize: !dev,
    };

    // ============================================
    // TREE SHAKING OPTIMIZATIONS
    // ============================================

    // Ensure tree shaking works properly
    config.resolve.mainFields = ['module', 'main'];

    // Add custom resolve aliases for better tree shaking
    config.resolve.alias = {
      ...config.resolve.alias,
      // Alias heavy components to lazy-loaded versions
      '@/components/heavy': path.resolve(__dirname, 'components/lazy'),
    };

    if (isServer) {
      // Externalize Prisma for serverless
      config.externals = config.externals || [];
      config.externals.push({
        '@prisma/client': 'commonjs @prisma/client',
      });
    }

    // ============================================
    // PERFORMANCE MONITORING
    // ============================================

    if (!dev) {
      // Add bundle analyzer in production (optional)
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './analyze/client.html',
            openAnalyzer: false,
          })
        );
      }
    }

    return config;
  },

  images: {
    // Modern configuration: prefer remotePatterns over deprecated domains list
    remotePatterns: [
      { protocol: 'https', hostname: 'maula.ai' },
      { protocol: 'https', hostname: 'www.maula.ai' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: '*.wikimedia.org' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      // AWS S3 bucket for chat uploads and media
      { protocol: 'https', hostname: 'maula-ai-bucket.s3.ap-southeast-1.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.ap-southeast-1.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
    ],
    unoptimized: false,
    // Fix CSP for Next.js images - allow inline scripts for Stripe, Cloudflare, Google Maps and other integrations
    contentSecurityPolicy:
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://static.cloudflareinsights.com https://maps.googleapis.com https://maps.gstatic.com; frame-src 'self' https://js.stripe.com https://www.google.com;",
  },

  // Expose Google Maps API key to the client; prefer NEXT_PUBLIC_ but fall back to non-prefixed if provided
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '',
  },

  // Skip type checking and linting during build (for faster production deployment)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ SECURITY: Disable source maps in production
  productionBrowserSourceMaps:
    process.env.NODE_ENV === 'production' ? false : true,

  // Set output file tracing root to resolve lockfile warnings
  outputFileTracingRoot: repoRoot,

  // ✅ SECURITY: Add security headers
  async headers() {
    return [
      // Cache policy for Next.js static assets (hashed, immutable)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Special handling for RSC requests to prevent 503 errors
      {
        source: '/:path*',
        has: [{ type: 'query', key: '_rsc' }],
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-RSC-Request',
            value: 'true',
          },
        ],
      },
      // CRITICAL: Prevent caching of HTML to avoid stale chunk references after deploys
      // All HTML pages should revalidate to get correct buildId chunk URLs
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Enable XSS protection
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser features (allow microphone for voice input)
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(self), camera=()',
          },
          // Content Security Policy - allow Stripe, Cloudflare Insights, AI APIs, Google Maps, and S3 uploads
          {
            key: 'Content-Security-Policy',
            // Allow Monaco workers (blob), Google Maps, PayPal, base64 image downloads, audio playback, third-party assets used by the canvas preview.
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://challenges.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://js.stripe.com https://m.stripe.network https://www.paypal.com https://static.cloudflareinsights.com https://maps.googleapis.com https://maps.gstatic.com https://checkout.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://tagmanager.google.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://js.stripe.com https://checkout.stripe.com https://tagmanager.google.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; connect-src 'self' blob: data: https://challenges.cloudflare.com https://maula.ai wss://maula.ai https://canvas.maula.ai wss://canvas.maula.ai https://studio.maula.ai wss://studio.maula.ai https://demo.maula.ai https://maula.ai/chat https://api.stripe.com https://m.stripe.network https://cloudflareinsights.com https://api.openai.com wss://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://*.s3.ap-southeast-1.amazonaws.com https://maula-ai-bucket.s3.ap-southeast-1.amazonaws.com https://maps.googleapis.com https://checkout.stripe.com https://api.ipify.org https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net; frame-src 'self' https://demo.maula.ai https://editor.maula.ai https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com https://www.google.com https://checkout.stripe.com; worker-src 'self' blob: data:; media-src 'self' blob: data: https://www.soundhelix.com https://*.s3.ap-southeast-1.amazonaws.com https://maula-ai-bucket.s3.ap-southeast-1.amazonaws.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self';",
          },
        ],
      },
    ];
  },

  // Redirect old routes
  async redirects() {
    return [

      {
        source: '/pricing',
        destination: '/overview',
        permanent: true,
      },
      {
        source: '/pricing/:path*',
        destination: '/overview/:path*',
        permanent: true,
      },
      {
        source: '/preview',
        destination: '/overview/spaces',
        permanent: true,
      },
      {
        source: '/preview/per-agent',
        destination: '/overview/per-agent',
        permanent: true,
      },
      {
        source: '/preview/overview',
        destination: '/overview',
        permanent: true,
      },
      {
        source: '/canvas-studio-pricing',
        destination: '/overview/pricing',
        permanent: true,
      },
    ];
  },

  // Proxy /api/* to backend only during local development.
  // In production, Next.js App Router serves its own API routes (e.g. /api/community, /api/tools, /api/status),
  // and Nginx will forward other backend APIs to the Node server.
  async rewrites() {
    const rules = [];

    if (process.env.NODE_ENV === 'development') {
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      rules.push({
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      });
    }

    return rules;
  },
};

module.exports = nextConfig;

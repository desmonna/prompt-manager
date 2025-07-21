/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self' https://*.aiassisant.xyz https://cdn.jsdelivr.net https://js.sentry-cdn.com https://browser.sentry-cdn.com https://*.sentry.io https://challenges.cloudflare.com https://scdn.clerk.com https://segapi.clerk.com https://api.stripe.com https://maps.googleapis.com https://*.js.stripe.com https://js.stripe.com;
              script-src 'self' 'unsafe-inline' https://scdn.clerk.com https://js.clerk.com https://*.clerk.com https://challenges.cloudflare.com;
              connect-src 'self' https://clerk.com https://*.clerk.com https://segapi.clerk.com https://api.clerk.com https://*.supabase.co https://api.stripe.com;
              img-src 'self' https://*.clerk.com https://img.clerk.com data: blob:;
              style-src 'self' 'unsafe-inline' https://scdn.clerk.com;
            `.replace(/\n/g, ' ').trim()
          },
        ],
      },
    ]
  },
};

export default nextConfig;

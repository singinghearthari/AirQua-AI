import type { NextConfig } from 'next';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com",
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
  "media-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=(self)',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: CONTENT_SECURITY_POLICY,
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

declare module 'next-pwa' {
  import { NextConfig } from 'next';

  interface PWAOptions {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    scope?: string;
    sw?: string;
    runtimeCaching?: any[];
    buildExcludes?: Array<string | RegExp>;
    publicExcludes?: Array<string | RegExp>;
  }

  declare function withPWA(
    options?: PWAOptions
  ): (nextConfig?: NextConfig) => NextConfig;

  export = withPWA;
}

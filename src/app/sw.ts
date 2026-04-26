import { defaultCache, PAGES_CACHE_NAME } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const stripRscPlugin = {
  async cacheKeyWillBeUsed({ request }: { request: Request }) {
    const url = new URL(request.url)

    if (url.searchParams.has('_rsc')) {
      url.searchParams.delete('_rsc')
      return new Request(url.toString(), {
        method: request.method,
        headers: request.headers,
        mode: request.mode,
        credentials: request.credentials,
        cache: request.cache,
        redirect: request.redirect,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        integrity: request.integrity,
        keepalive: request.keepalive,
        signal: request.signal,
      })
    }

    return request
  },
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /\/api\/auth\//,
      handler: new NetworkOnly(),
    },
    {
      matcher: /\/api\/offline\//,
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request }) => request.headers.get('next-action') != null,
      handler: new NetworkOnly(),
    },

    // RSC prefetch requests
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        request.headers.get('RSC') === '1' &&
        request.headers.get('Next-Router-Prefetch') === '1' &&
        sameOrigin &&
        !pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE_NAME.rscPrefetch,
        // Next.js RSC responses set `Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url`.
        // Without ignoreVary, offline navigations miss cached entries because real-nav requests
        // carry a Next-Router-State-Tree value the warming/prefetch fetches don't.
        matchOptions: { ignoreVary: true },
        plugins: [
          stripRscPlugin,
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },

    // Full RSC navigation requests
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        request.headers.get('RSC') === '1' && sameOrigin && !pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE_NAME.rsc,
        // See note on the prefetch handler above — same Vary-mismatch problem applies here.
        matchOptions: { ignoreVary: true },
        plugins: [
          stripRscPlugin,
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },

    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})

serwist.addEventListeners()

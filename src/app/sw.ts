import { defaultCache, PAGES_CACHE_NAME } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

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
    // Unified RSC cache: defaultCache splits prefetch and navigation RSC
    // requests into separate caches (pages-rsc-prefetch vs pages-rsc).
    // Offline, navigation RSC requests fail because they look in the empty
    // pages-rsc cache even though the prefetch response is in
    // pages-rsc-prefetch. This rule catches ALL RSC requests first and
    // puts them in a single cache, so prefetched payloads serve navigation.
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        request.headers.get('RSC') === '1' && sameOrigin && !pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE_NAME.rsc,
        plugins: [
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

import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const packageVersion = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
  .version as string

const revision = process.env.NEXT_PUBLIC_APP_VERSION ?? packageVersion

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  /* config options here */
}

export default withSerwist(nextConfig)

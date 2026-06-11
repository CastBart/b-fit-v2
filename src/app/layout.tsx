import type { Metadata, Viewport } from 'next'
import { Inter, Outfit } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { PersistQueryProvider } from '@/components/providers/PersistQueryProvider'
import ReduxProvider from '@/components/providers/ReduxProvider'
import { PWAClientBootstrap } from '@/components/pwa/PWAClientBootstrap'
import { auth } from '@/lib/auth/auth.config'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const outfit = Outfit({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal'],
  subsets: ['latin'],
  display: 'swap',
})

export const viewport: Viewport = {
  interactiveWidget: 'resizes-content',
  themeColor: '#0b64f4',
}

export const metadata: Metadata = {
  title: {
    default: 'B-Fit',
    template: '%s | B-Fit',
  },
  description:
    'Track your workouts, monitor progress, and achieve your fitness goals with B-Fit. Professional workout tracking for personal users, trainers, and organizations.',

  manifest: '/manifest.json',

  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/favicon-64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/icons/favicon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icons/favicon-256x256.png', sizes: '256x256', type: 'image/png' },
    ],
    apple: [{ url: '/icons/favicon-180x180.png', sizes: '180x180', type: 'image/png' }],
  },

  keywords: [
    'workout tracking',
    'fitness',
    'personal trainer',
    'exercise tracking',
    'workout planner',
    'workout builder',
    'plan builder',
    'client management',
  ],

  authors: [{ name: 'B-Fit' }],
  creator: 'B-Fit',

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://b-fit.app',
    title: 'B-Fit',
    description: 'Professional workout tracking for personal users, trainers, and organizations',
    siteName: 'B-Fit',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'B-Fit | Workout Tracking',
    description: 'Track your workouts, monitor progress, and achieve your fitness goals',
  },

  robots: {
    index: true,
    follow: true,
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} ${inter.variable} antialiased`}>
        <SessionProvider session={session}>
          <ReduxProvider>
            <PersistQueryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <TooltipProvider>{children}</TooltipProvider>
                <PWAClientBootstrap />
                <Toaster />
              </ThemeProvider>
            </PersistQueryProvider>
          </ReduxProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

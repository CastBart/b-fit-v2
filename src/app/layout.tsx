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
}

export const metadata: Metadata = {
  title: {
    default: 'B-Fit | Workout Tracking & Fitness Management',
    template: '%s | B-Fit',
  },
  description:
    'Track your workouts, monitor progress, and achieve your fitness goals with B-Fit. Professional workout tracking for personal users, trainers, and organizations.',
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
    title: 'B-Fit | Workout Tracking & Fitness Management',
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

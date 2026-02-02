import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import ReduxProvider from '@/components/providers/ReduxProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          <ReduxProvider>
            <QueryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                {children}
                <Toaster />
              </ThemeProvider>
            </QueryProvider>
          </ReduxProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

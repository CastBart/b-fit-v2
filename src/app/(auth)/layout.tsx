import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - B-Fit',
  description: 'Sign in or create an account to access B-Fit',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      {children}
    </div>
  )
}

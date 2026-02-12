'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BillingInfo } from '@/components/features/billing/BillingInfo'

export default function BillingPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and payment details</p>
      </div>

      <div className="max-w-2xl">
        <BillingInfo />
      </div>
    </div>
  )
}

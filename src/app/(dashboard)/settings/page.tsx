'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { Settings, User, Shield, ArrowUpCircle, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserProfile } from '@/hooks/queries/useUserProfile'
import { useUpdateProfile } from '@/hooks/mutations/useUserMutations'
import { SignInMethodsCard } from '@/components/features/settings/SignInMethodsCard'

export default function SettingsPage() {
  const { data: profile, isLoading } = useUserProfile()
  const updateProfileMutation = useUpdateProfile()

  const [name, setName] = useState('')
  const [nameInitialized, setNameInitialized] = useState(false)

  // Initialize name from profile on first load
  if (profile && !nameInitialized) {
    setName(profile.name ?? '')
    setNameInitialized(true)
  }

  const handleUpdateProfile = async () => {
    await updateProfileMutation.mutateAsync({ name: name.trim() || undefined })
  }

  const roleLabel = {
    PERSONAL: 'Personal User',
    PT: 'Personal Trainer',
    CLIENT: 'Client',
    ORG: 'Organization',
  }

  const roleBadgeVariant = {
    PERSONAL: 'secondary' as const,
    PT: 'default' as const,
    CLIENT: 'outline' as const,
    ORG: 'default' as const,
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="mt-1 h-5 w-64" />
        </div>
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Failed to load profile.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    // flex items-center flex-col
    <div className="container mx-auto p-6 ">
      {/* Header */}
      {/* <div> */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Settings className="h-7 w-7" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Member since</span>
              <span>
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={updateProfileMutation.isPending || name.trim() === (profile.name ?? '')}
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Role Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Role
            </CardTitle>
            <CardDescription>Your current role and capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Current Role:</span>
              <Badge variant={roleBadgeVariant[profile.role as keyof typeof roleBadgeVariant]}>
                {roleLabel[profile.role as keyof typeof roleLabel] ?? profile.role}
              </Badge>
            </div>

            {profile.role === 'PERSONAL' && (
              <div className="rounded-lg border border-dashed p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">Become a Personal Trainer</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Subscribe to a PT plan to invite clients, assign workouts and plans, and track
                  their progress. You keep all your current features.
                </p>
                <Button asChild>
                  <Link href="/pricing">View Plans</Link>
                </Button>
              </div>
            )}

            {profile.role === 'PT' && (
              <p className="text-sm text-muted-foreground">
                You have full Personal Trainer access. You can manage clients, assign workouts and
                plans, and track your own progress.
              </p>
            )}

            {profile.role === 'CLIENT' && (
              <p className="text-sm text-muted-foreground">
                You are connected with a Personal Trainer. They can assign workouts and plans for
                you. If your trainer relationship ends, your account will revert to a Personal
                account.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sign-in methods Card */}
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <SignInMethodsCard />
        </Suspense>

        {/* Billing Card */}
        {(profile.role === 'PT' || profile.role === 'PERSONAL') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing
              </CardTitle>
              <CardDescription>Manage your subscription and payment details</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/settings/billing">View Billing</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      {/* </div> */}
    </div>
  )
}

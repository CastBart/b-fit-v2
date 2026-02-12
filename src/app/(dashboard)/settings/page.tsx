'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Settings, User, Shield, ArrowUpCircle, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useUserProfile } from '@/hooks/queries/useUserProfile'
import { useUpdateProfile, useUpgradeToPT } from '@/hooks/mutations/useUserMutations'

export default function SettingsPage() {
  const { update: updateSession } = useSession()
  const { data: profile, isLoading } = useUserProfile()
  const updateProfileMutation = useUpdateProfile()
  const upgradeMutation = useUpgradeToPT()

  const [name, setName] = useState('')
  const [nameInitialized, setNameInitialized] = useState(false)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)

  // Initialize name from profile on first load
  if (profile && !nameInitialized) {
    setName(profile.name ?? '')
    setNameInitialized(true)
  }

  const handleUpdateProfile = async () => {
    await updateProfileMutation.mutateAsync({ name: name.trim() || undefined })
  }

  const handleUpgrade = async () => {
    await upgradeMutation.mutateAsync()
    // Update the NextAuth session so the role change takes effect immediately
    await updateSession({ role: 'PT' })
    setUpgradeDialogOpen(false)
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
    <div className="container mx-auto p-6">
      {/* Header */}
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
                  <h4 className="font-medium">Upgrade to Personal Trainer</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  As a Personal Trainer, you can invite clients, assign workouts and plans, and
                  track their progress. You keep all your current features.
                </p>
                <Button onClick={() => setUpgradeDialogOpen(true)}>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Upgrade to PT
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

      {/* Upgrade Confirmation Dialog */}
      <AlertDialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upgrade to Personal Trainer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will upgrade your account to a Personal Trainer role. You will gain the ability
              to invite clients, assign workouts and plans, and view client progress. All your
              existing data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpgrade} disabled={upgradeMutation.isPending}>
              {upgradeMutation.isPending ? 'Upgrading...' : 'Confirm Upgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

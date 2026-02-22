'use client'

import { useState } from 'react'
import { Copy, Check, Link } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
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
import { useInviteClient } from '@/hooks/mutations/useClientMutations'

interface InviteClientDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteClientDrawer({ open, onOpenChange }: InviteClientDrawerProps) {
  const [email, setEmail] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [upgradeDialog, setUpgradeDialog] = useState<{ current: number; max: number } | null>(null)

  const inviteMutation = useInviteClient()

  const handleGenerate = async (confirmUpgrade = false) => {
    const input = {
      ...(email.trim() ? { clientEmail: email.trim() } : {}),
      ...(confirmUpgrade ? { confirmUpgrade: true } : {}),
    }

    try {
      const result = await inviteMutation.mutateAsync(
        Object.keys(input).length > 0 ? input : undefined
      )
      const link = `${window.location.origin}/invite/${result.inviteCode}`
      setInviteLink(link)
      if (confirmUpgrade) {
        toast.info('Plan upgraded successfully! Invite created.')
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('CAPACITY_REACHED:')) {
        const parts = error.message.split(':')
        setUpgradeDialog({ current: parseInt(parts[1] ?? '0'), max: parseInt(parts[2] ?? '0') })
      }
    }
  }

  const handleConfirmUpgrade = () => {
    setUpgradeDialog(null)
    handleGenerate(true)
  }

  const handleCopy = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEmail('')
      setInviteLink(null)
      setCopied(false)
      setUpgradeDialog(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <>
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="custom-drawer-no-height justify-self-center">
          <DrawerHeader>
            <DrawerTitle>Invite Client</DrawerTitle>
            <DrawerDescription>
              Generate an invite link to send to your client. They can use it to connect with you.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            {!inviteLink ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Client Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="client@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, the invite will be linked to this email address.
                  </p>
                </div>

                <Button
                  onClick={() => handleGenerate()}
                  disabled={inviteMutation.isPending}
                  className="w-full"
                >
                  <Link className="mr-2 h-4 w-4" />
                  {inviteMutation.isPending ? 'Generating...' : 'Generate Invite Link'}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <Label>Invite Link</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with your client. They will need to log in to accept the
                  invitation.
                </p>
              </div>
            )}
          </div>

          <DrawerFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              {inviteLink ? 'Done' : 'Cancel'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={!!upgradeDialog} onOpenChange={() => setUpgradeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Client capacity reached</AlertDialogTitle>
            <AlertDialogDescription>
              You have {upgradeDialog?.current}/{upgradeDialog?.max} clients. To invite more, your
              plan will be automatically upgraded to the next tier with prorated billing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpgrade} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Upgrading...' : 'Upgrade & Invite'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

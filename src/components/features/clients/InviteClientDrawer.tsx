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
import { useInviteClient } from '@/hooks/mutations/useClientMutations'

interface InviteClientDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteClientDrawer({ open, onOpenChange }: InviteClientDrawerProps) {
  const [email, setEmail] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const inviteMutation = useInviteClient()

  const handleGenerate = async () => {
    const input = email.trim() ? { clientEmail: email.trim() } : undefined
    const result = await inviteMutation.mutateAsync(input)
    const link = `${window.location.origin}/invite/${result.inviteCode}`
    setInviteLink(link)
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
    }
    onOpenChange(nextOpen)
  }

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
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
                onClick={handleGenerate}
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
                Share this link with your client. They will need to log in to accept the invitation.
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
  )
}

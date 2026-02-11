'use client'

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
import { useEndRelationship } from '@/hooks/mutations/useClientMutations'

interface EndRelationshipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  relationshipId: string
  clientName: string
}

export function EndRelationshipDialog({
  open,
  onOpenChange,
  relationshipId,
  clientName,
}: EndRelationshipDialogProps) {
  const endMutation = useEndRelationship()

  const handleConfirm = async () => {
    await endMutation.mutateAsync(relationshipId)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End Relationship with {clientName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will end your trainer-client relationship. {clientName} will keep their assigned
            workouts and plans, but you will no longer be able to view their sessions or assign new
            content. Their account will revert to a personal account if they have no other active
            trainer relationships.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={endMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {endMutation.isPending ? 'Ending...' : 'End Relationship'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

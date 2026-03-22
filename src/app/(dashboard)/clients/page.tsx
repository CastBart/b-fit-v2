'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Users, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients } from '@/hooks/queries/useClients'
import { ClientCard } from '@/components/features/clients/ClientCard'
import { InviteClientDrawer } from '@/components/features/clients/InviteClientDrawer'
import type { RelationshipStatus } from '@prisma/client'

type StatusFilter = 'ALL' | RelationshipStatus

export default function ClientsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  // Role guard: only PT and ORG can access /clients
  useEffect(() => {
    if (
      status === 'authenticated' &&
      session?.user?.role !== 'PT' &&
      session?.user?.role !== 'ORG'
    ) {
      router.replace('/dashboard')
    }
  }, [status, session, router])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data, isLoading, error } = useClients({
    search: search || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    page,
    limit: 12,
  })

  return (
    <div className="container mx-auto flex h-[calc(100dvh-4.5rem)] flex-col px-4 pt-4 sm:px-6 sm:pt-6 md:h-[calc(100dvh-1rem)]">
      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Clients</h1>
          <p className="hidden sm:block mt-1 text-muted-foreground">
            Manage your client relationships
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Invite Client</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-md"
        />
        <Select
          value={statusFilter}
          onValueChange={(value: StatusFilter) => {
            setStatusFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Clients</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ENDED">Ended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-8 text-center text-destructive">
            <p>{error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="mt-1 h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && data?.clients.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No clients found</h3>
            <p className="text-center text-sm text-muted-foreground">
              {search || statusFilter !== 'ALL'
                ? 'No clients match your filters. Try adjusting your search.'
                : 'Invite your first client to get started.'}
            </p>
            {!search && statusFilter === 'ALL' && (
              <Button className="mt-4" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Client
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Clients Grid */}
      {!isLoading && data && data.clients.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.clients.map((client) => (
              <ClientCard
                key={client.relationshipId}
                client={client}
                onClick={() => router.push(`/clients/${client.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Invite Drawer */}
      <InviteClientDrawer open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}

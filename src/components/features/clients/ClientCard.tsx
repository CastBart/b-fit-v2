'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, User } from 'lucide-react'
import type { ClientListItem } from '@/types/client'

interface ClientCardProps {
  client: ClientListItem
  onClick: () => void
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const statusVariant =
    client.status === 'ACTIVE'
      ? 'default'
      : client.status === 'PENDING'
        ? 'secondary'
        : 'destructive'

  const initials = client.name
    ? client.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (client.email[0] ?? '?').toUpperCase()

  return (
    <Card className="group cursor-pointer transition-all hover:shadow-lg" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {client.image ? (
            <img
              src={client.image}
              alt={client.name ?? client.email}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {initials}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{client.name ?? 'Pending User'}</h3>
              <Badge variant={statusVariant} className="text-xs capitalize shrink-0">
                {client.status.toLowerCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{client.email}</p>
          </div>

          {/* Arrow */}
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 shrink-0" />
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>
            {client.status === 'PENDING' ? 'Invited' : 'Joined'}{' '}
            {new Date(client.joinedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

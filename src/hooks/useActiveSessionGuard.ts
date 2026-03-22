import { useContext } from 'react'
import { ActiveSessionGuardContext } from '@/components/providers/ActiveSessionGuardProvider'

export function useActiveSessionGuard() {
  return useContext(ActiveSessionGuardContext)
}

/**
 * MetricEditorProvider — single global metric editor for a session page.
 *
 * Holds the active "editor session" (the ordered fields of one set row + the
 * field index that was tapped) and renders exactly one <MetricEditorDrawer>.
 * MetricInput components call useMetricEditor().open(...) to edit a value; the
 * drawer commits each field back via its `commit` callback.
 */

'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { MetricConfig, MetricField } from '@/lib/metrics/metric-config'
import { MetricEditorDrawer } from './MetricEditorDrawer'

export interface EditorField {
  field: MetricField
  config: MetricConfig
  /** Current canonical value (kg / count / rir / meters / seconds). */
  canonicalValue: number | null | undefined
  /** Persist the new canonical value (undefined clears the metric). */
  commit: (value: number | undefined) => void
}

export interface EditorSession {
  fields: EditorField[]
  index: number
}

interface MetricEditorContextValue {
  open: (session: EditorSession) => void
  close: () => void
}

const MetricEditorContext = createContext<MetricEditorContextValue | null>(null)

export function MetricEditorProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<EditorSession | null>(null)
  const [open, setOpen] = useState(false)

  const openEditor = useCallback((next: EditorSession) => {
    setSession(next)
    setOpen(true)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  const value = useMemo<MetricEditorContextValue>(
    () => ({ open: openEditor, close }),
    [openEditor, close]
  )

  return (
    <MetricEditorContext.Provider value={value}>
      {children}
      <MetricEditorDrawer open={open} session={session} onOpenChange={setOpen} />
    </MetricEditorContext.Provider>
  )
}

export function useMetricEditor(): MetricEditorContextValue {
  const ctx = useContext(MetricEditorContext)
  if (!ctx) {
    throw new Error('useMetricEditor must be used within a MetricEditorProvider')
  }
  return ctx
}

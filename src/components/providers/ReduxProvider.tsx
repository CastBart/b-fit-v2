'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from '@/store/store';

// ============================================================================
// REDUX PROVIDER
// ============================================================================

/**
 * Redux Provider component for Next.js App Router
 * Creates a new store instance per request (SSR-safe)
 */
export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create store instance once per component lifecycle
  // useRef ensures store persists across re-renders but is created fresh per request
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}

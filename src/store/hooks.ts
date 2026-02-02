import { useDispatch, useSelector, useStore } from 'react-redux';
import type { AppDispatch, AppStore, RootState } from './store';

// ============================================================================
// TYPED REDUX HOOKS
// ============================================================================

/**
 * Typed version of useDispatch hook
 * Use throughout your app instead of plain `useDispatch`
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * Typed version of useSelector hook
 * Use throughout your app instead of plain `useSelector`
 */
export const useAppSelector = useSelector.withTypes<RootState>();

/**
 * Typed version of useStore hook
 * Use throughout your app instead of plain `useStore`
 */
export const useAppStore = useStore.withTypes<AppStore>();

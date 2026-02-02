import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from './slices/sessionSlice';
import { localStoragePersistenceMiddleware } from './middleware/persistence';

// ============================================================================
// STORE CONFIGURATION
// ============================================================================

export const makeStore = () => {
  return configureStore({
    reducer: {
      session: sessionReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // Session state is fully serializable (no Date objects, just primitives)
        serializableCheck: false,
      }).concat(localStoragePersistenceMiddleware),
  });
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

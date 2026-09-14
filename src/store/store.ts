import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";

// NOTE: Redux holds ONLY session + UI state. Business data (patients,
// providers, consents, records, emergency, audit, profiles) lives in the
// database behind the Next.js API routes (`src/lib/api.ts`) and is fetched with
// react-query. On-chain truth (registrations, consents, record anchors,
// emergency) is written via the wagmi seam in `src/lib/chain.ts`.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
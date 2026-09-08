import { configureStore } from "@reduxjs/toolkit";
import patientsReducer from "./slices/patientsSlice";
import providersReducer from "./slices/providersSlice";
import consentsReducer from "./slices/consentsSlice";
import recordsReducer from "./slices/recordsSlice";
import emergencyReducer from "./slices/emergencySlice";
import authReducer from "./slices/authSlice";

export const store = configureStore({
  reducer: {
    patients: patientsReducer,
    providers: providersReducer,
    consents: consentsReducer,
    records: recordsReducer,
    emergency: emergencyReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

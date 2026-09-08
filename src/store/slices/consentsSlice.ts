import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { initialConsents, type Consent } from "@/lib/dummy-data";

interface ConsentsState {
  list: Consent[];
}

const initialState: ConsentsState = {
  list: initialConsents,
};

const consentsSlice = createSlice({
  name: "consents",
  initialState,
  reducers: {
    grantConsent: (
      state,
      action: PayloadAction<{
        patientAddress: string;
        providerAddress: string;
        providerName: string;
        purpose: string;
        expiresAt: number;
        grantedAt?: string;
      }>,
    ) => {
      const { patientAddress, providerAddress, providerName, purpose, expiresAt } =
        action.payload;
      const existing = state.list.find(
        (c) =>
          c.patientAddress === patientAddress &&
          c.providerAddress === providerAddress,
      );
      if (existing) {
        existing.active = true;
        existing.expiresAt = expiresAt;
        existing.purpose = purpose;
        existing.grantedAt = action.payload.grantedAt ?? existing.grantedAt;
      } else {
        state.list.push({
          patientAddress,
          providerAddress,
          providerName,
          active: true,
          expiresAt,
          purpose,
          grantedAt: action.payload.grantedAt ?? new Date().toISOString(),
        });
      }
    },
    revokeConsent: (
      state,
      action: PayloadAction<{ patientAddress: string; providerAddress: string }>,
    ) => {
      const { patientAddress, providerAddress } = action.payload;
      const c = state.list.find(
        (x) =>
          x.patientAddress === patientAddress &&
          x.providerAddress === providerAddress,
      );
      if (c) c.active = false;
    },
  },
});

export const { grantConsent, revokeConsent } = consentsSlice.actions;
export default consentsSlice.reducer;

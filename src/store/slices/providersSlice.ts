import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { initialProviders, type Provider } from "@/lib/dummy-data";

interface ProvidersState {
  list: Provider[];
}

const initialState: ProvidersState = {
  list: initialProviders,
};

const providersSlice = createSlice({
  name: "providers",
  initialState,
  reducers: {
    verifyProvider: (
      state,
      action: PayloadAction<{
        address: string;
        isVerified: boolean;
        erQualified: boolean;
      }>,
    ) => {
      const { address, isVerified, erQualified } = action.payload;
      const p = state.list.find((x) => x.address === address);
      if (p) {
        p.verified = isVerified;
        p.erQualified = isVerified ? erQualified : false;
      }
    },
    registerProvider: (
      state,
      action: PayloadAction<{ address: string; name: string; didURI: string }>,
    ) => {
      const { address, name, didURI } = action.payload;
      const exists = state.list.some((x) => x.address === address);
      if (!exists) {
        state.list.push({
          address,
          name,
          didURI,
          registered: true,
          verified: false,
          erQualified: false,
        });
      }
    },
  },
});

export const { verifyProvider, registerProvider } = providersSlice.actions;
export default providersSlice.reducer;

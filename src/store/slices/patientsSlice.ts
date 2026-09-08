import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { initialPatients, type Patient } from "@/lib/dummy-data";

interface PatientsState {
  list: Patient[];
  registering: boolean;
}

const initialState: PatientsState = {
  list: initialPatients,
  registering: false,
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const registerPatientAsync = createAsyncThunk(
  "patients/registerPatient",
  async ({ address, didURI }: { address: string; didURI: string }) => {
    await delay(600);
    return { address, didURI };
  },
);

const patientsSlice = createSlice({
  name: "patients",
  initialState,
  reducers: {
    registerPatient: (
      state,
      action: PayloadAction<{ address: string; didURI: string }>,
    ) => {
      const { address, didURI } = action.payload;
      const exists = state.list.some((p) => p.address === address);
      if (!exists) {
        state.list.push({ address, didURI, registered: true });
      }
    },
    unregisterPatient: (state, action: PayloadAction<string>) => {
      const p = state.list.find((x) => x.address === action.payload);
      if (p) p.registered = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerPatientAsync.pending, (state) => {
        state.registering = true;
      })
      .addCase(registerPatientAsync.fulfilled, (state, action) => {
        state.registering = false;
        const { address, didURI } = action.payload;
        const exists = state.list.some((p) => p.address === address);
        if (!exists) {
          state.list.push({ address, didURI, registered: true });
        }
      });
  },
});

export const { registerPatient, unregisterPatient } = patientsSlice.actions;
export default patientsSlice.reducer;

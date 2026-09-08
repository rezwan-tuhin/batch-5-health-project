import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { initialEmergencyAccess, type EmergencyAccess } from "@/lib/dummy-data";

interface EmergencyState {
  list: EmergencyAccess[];
}

const initialState: EmergencyState = {
  list: initialEmergencyAccess,
};

const emergencySlice = createSlice({
  name: "emergency",
  initialState,
  reducers: {
    triggerEmergencyAccess: (
      state,
      action: PayloadAction<{
        patientAddress: string;
        doctorAddress: string;
        doctorName: string;
        justification: string;
        validUntil: string;
      }>,
    ) => {
      const { patientAddress, doctorAddress, doctorName, justification, validUntil } =
        action.payload;
      state.list.unshift({
        patientAddress,
        doctorAddress,
        doctorName,
        justification,
        validUntil,
        active: true,
      });
    },
    expireSession: (state, action: PayloadAction<string>) => {
      const s = state.list.find((x) => x.patientAddress === action.payload);
      if (s) s.active = false;
    },
  },
});

export const { triggerEmergencyAccess, expireSession } = emergencySlice.actions;
export default emergencySlice.reducer;

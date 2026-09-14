import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  pendingTx: boolean;
  lastError: string | null;
}

const initialState: UiState = {
  pendingTx: false,
  lastError: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setPendingTx: (state, action: PayloadAction<boolean>) => {
      state.pendingTx = action.payload;
    },
    setLastError: (state, action: PayloadAction<string | null>) => {
      state.lastError = action.payload;
    },
  },
});

export const { setPendingTx, setLastError } = uiSlice.actions;
export default uiSlice.reducer;
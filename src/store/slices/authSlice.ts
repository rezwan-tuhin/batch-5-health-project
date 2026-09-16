import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { api, ApiError } from "@/lib/api";
import type { Role, User } from "@/lib/dummy-data";

export type AuthStatus =
  | "idle"
  | "connecting"
  | "resolving"
  | "authenticated"
  | "error";

interface AuthState {
  user: User | null;
  role: Role | null;
  address: string | null;
  isAuthenticated: boolean;
  isWalletConnected: boolean;
  status: AuthStatus;
  error: string | null;
  /** True when /api/auth returned 404 for the connected wallet (needs register). */
  unknownWallet: boolean;
}

const initialState: AuthState = {
  user: null,
  role: null,
  address: null,
  isAuthenticated: false,
  isWalletConnected: false,
  status: "idle",
  error: null,
  unknownWallet: false,
};

export const resolveAuth = createAsyncThunk<
  { user: User; role: Role },
  string,
  { rejectValue: { status?: number; message: string } }
>(
  "auth/resolve",
  async (address, { rejectWithValue }) => {
    try {
      const result = await api.auth.resolve(address);
      return result;
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      return rejectWithValue({
        status,
        message:
          err instanceof Error && err.message
            ? err.message
            : "Could not resolve identity",
      });
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    connectWallet: (
      state,
      action: PayloadAction<{ address: string; provider: string }>,
    ) => {
      state.address = action.payload.address;
      state.isWalletConnected = true;
      state.status = "connecting";
      state.error = null;
      state.unknownWallet = false;
    },
    setSession: (
      state,
      action: PayloadAction<{ user: User; role?: Role }>,
    ) => {
      state.user = action.payload.user;
      state.role = action.payload.role ?? action.payload.user.role;
      state.isAuthenticated = true;
      state.status = "authenticated";
      state.error = null;
      state.unknownWallet = false;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setAuthError: (state, action: PayloadAction<string>) => {
      state.status = "error";
      state.error = action.payload;
    },
    disconnectWallet: (state) => {
      state.user = null;
      state.role = null;
      state.address = null;
      state.isAuthenticated = false;
      state.isWalletConnected = false;
      state.status = "idle";
      state.error = null;
      state.unknownWallet = false;
    },
    logout: (state) => {
      state.user = null;
      state.role = null;
      state.isAuthenticated = false;
      state.status = "idle";
      state.error = null;
      state.unknownWallet = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(resolveAuth.pending, (state) => {
        state.status = "resolving";
        state.error = null;
        state.unknownWallet = false;
      })
      .addCase(resolveAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.role = action.payload.role;
        state.isAuthenticated = true;
        state.status = "authenticated";
        state.error = null;
        state.unknownWallet = false;
      })
      .addCase(resolveAuth.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload?.message ?? "Identity resolution failed";
        state.unknownWallet = action.payload?.status === 404;
      });
  },
});

export const {
  connectWallet,
  setSession,
  updateUser,
  setAuthError,
  disconnectWallet,
  logout,
} = authSlice.actions;
export default authSlice.reducer;
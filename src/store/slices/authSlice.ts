import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { users, type Role, type User } from "@/lib/dummy-data";

export type WalletProvider = "metamask" | "walletconnect" | "coinbase";

export interface Wallet {
  address: string;
  provider: WalletProvider;
  connectedAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  wallet: Wallet | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  wallet: null,
};

const MOCK_ADDRESSES: Record<WalletProvider, string> = {
  metamask: "0x9fF2a6B0c4D8e1f3A7b5C9d0E2f4A6b8C0d1E2f3",
  walletconnect: "0x3aB7c9D1eF2a4B6c8D0e1F2a3B4c5D6e7F8a9B0c1",
  coinbase: "0x5c8D0e2F4a6B8c0D1e3F5a7b9C1d3E5f7A9b1C3d5",
};

const shortMockAddress = (addr: string) =>
  `${addr.slice(0, 6)}…${addr.slice(-4)}`;

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    connectWallet: (state, action: PayloadAction<WalletProvider>) => {
      const provider = action.payload;
      const full = MOCK_ADDRESSES[provider];
      state.wallet = {
        address: shortMockAddress(full),
        provider,
        connectedAt: new Date().toISOString(),
      };
    },
    loginAs: (state, action: PayloadAction<Role>) => {
      const user = users.find((u) => u.role === action.payload);
      if (user) {
        state.user = user;
        state.isAuthenticated = true;
        state.wallet = {
          address: user.address,
          provider: state.wallet?.provider ?? "metamask",
          connectedAt: new Date().toISOString(),
        };
      }
    },
    disconnectWallet: (state) => {
      state.wallet = null;
      state.user = null;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.wallet = null;
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { connectWallet, loginAs, disconnectWallet, logout } =
  authSlice.actions;
export default authSlice.reducer;
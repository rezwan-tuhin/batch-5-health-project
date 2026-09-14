# wagmi + RainbowKit Setup Tutorial (Phase 1 — Real Wallet Auth)

This is the step-by-step guide to wiring **RainbowKit + wagmi + viem** into the
HealthRecord app, replacing the simulated wallet seam in `src/lib/wallet.ts`.
After this phase the connected wallet is real: MetaMask/Coinbase/WalletConnect
via RainbowKit, persisted reconnection, and identity resolved through
`GET /api/auth` exactly as before.

> Current state: implemented and verified — `npm run lint`, `npm run build`, and
> `npm run dev` / `http://localhost:3000/login` all pass.

---

## 0. Why RainbowKit? (the assessment)

- **Not strictly required** — `wagmi + viem` alone can drive a wallet UI via
  `useConnect` / `useAccount` / `useWriteContract`. Your custom connect modal
  would still work.
- **Strongly advisable here** because your own roadmap already commits to it
  (`tutorial.md` Phase 1, `.env.local.example`, the `TODO(wagmi)` comments), and
  RainbowKit gives you the messy, hard-to-get-right parts for free:
  - EIP-6963 injected-wallet discovery
  - WalletConnect QR linking + mobile wallets
  - ENS names, balance, chain switcher, disconnect menu
  - Session persistence and automatic reconnection
- **Keep the custom login screen**; only the simulated connect modal is replaced
  with RainbowKit's `<ConnectButton />`. Role cards + register flow stay.

Design decision: `wagmi` stays the single source of truth for the wallet; Redux
keeps only the resolved session identity.

---

## 1. Prerequisites

1. Copy the env template and open `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Get a **free WalletConnect Project ID**: <https://cloud.walletconnect.com> →
   *New Project* → copy the `projectId`, set:
   ```bash
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_real_id_here
   ```
   - **Demo default:** if the var is empty, the app falls back to RainbowKit's
     public demo id (see `src/lib/wagmi.ts`), so you can build and test with
     MetaMask immediately. Always replace it before going "live".
3. Optional: `NEXT_PUBLIC_RPC_URL` (Alchemy/Infura). If empty, the app uses the
   public Sepolia RPC `https://ethereum-sepolia-rpc.publicnode.com`.

---

## 2. Install dependencies

```bash
npm install @rainbow-me/rainbowkit@^2 wagmi@^2 viem@^2
```

`@tanstack/react-query` is already a dependency (`^5.102.8`) — wagmi v2 needs it,
so no extra install.

**Gotcha (required):** npm does not auto-install the peer dependencies of
`@coinbase/cdp-sdk`, which RainbowKit pulls in transitively. Without them the
build fails with `Module not found: Can't resolve '@x402/core/client'` (both in
Turbopack and webpack). Install them explicitly:

```bash
npm install @x402/core@^2 @x402/evm@^2 @x402/extensions@^2 @x402/svm@^2
```

---

## 3. Create the wagmi config — `src/lib/wagmi.ts`

```ts
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
const appName = "HealthRecord";

// RainbowKit swaps the literal "YOUR_PROJECT_ID" for its own public demo id,
// so the app builds and connects immediately. Replace it with your real id
// from https://cloud.walletconnect.com for production.
const resolvedProjectId = projectId || "YOUR_PROJECT_ID";

const transports = {
  [sepolia.id]: http(
    process.env.NEXT_PUBLIC_RPC_URL ??
      "https://ethereum-sepolia-rpc.publicnode.com",
  ),
};

export const wagmiConfig = getDefaultConfig({
  appName,
  projectId: resolvedProjectId,
  chains: [sepolia],
  ssr: true, // Next.js App Router
  transports,
});
```

Notes:
- `getDefaultConfig` wires the default wallet list (Rainbow, MetaMask, Coinbase,
  WalletConnect) — the modern replacement for the old `getDefaultWallets` +
  `configureChains`.
- `ssr: true` is required for server-rendered Next.js.
- A transport per chain is explicit — avoids relying on rate-limited chain defaults.

---

## 4. Wrap the app in providers — `src/store/Providers.tsx`

Order matters: `WagmiProvider` → `QueryClientProvider` → `RainbowKitProvider` →
Redux `Provider` (the wallet bridge needs both wagmi and redux). Also import
RainbowKit's CSS and apply the dark emerald theme to match the app.

```tsx
"use client";

import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { store } from "./store";
import { wagmiConfig } from "@/lib/wagmi";
import { WalletBridge } from "@/components/WalletBridge";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#10b981",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
        >
          <Provider store={store}>
            <WalletBridge />
            {children}
          </Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

`src/app/layout.tsx` already renders `<Providers>` and needs no change.

---

## 5. Bridge wallet → Redux session — `src/components/WalletBridge.tsx`

wagmi is now the single wallet source of truth. This small component watches
`useAccount()` and syncs the Redux `auth` slice:

- address appears → `connectWallet` + `resolveAuth(address)` (calls `/api/auth`)
- address disappears → `disconnectWallet`
- handles **auto-reconnect** after a page reload, because wagmi restores the last
  connection before the effect runs.

```tsx
"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  connectWallet,
  disconnectWallet,
  resolveAuth,
} from "@/store/slices/authSlice";

export function WalletBridge() {
  const dispatch = useAppDispatch();
  const { address, connector } = useAccount();
  const authAddress = useAppSelector((s) => s.auth.address);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!address) {
      if (authAddress || isAuthenticated) dispatch(disconnectWallet());
      return;
    }
    if (authAddress === address) return;

    dispatch(disconnectWallet());
    dispatch(connectWallet({ address, provider: connector?.name ?? "unknown" }));
    dispatch(resolveAuth(address));
  }, [address, connector, authAddress, isAuthenticated, dispatch]);

  return null;
}
```

---

## 6. Hydration-safe connect button — `src/components/WalletConnectButton.tsx`

Renders a static placeholder until hydrated (prevents SSR mismatch), then shows
the real RainbowKit `ConnectButton`.

```tsx
"use client";

import { useSyncExternalStore } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const subscribe = () => () => {};
const getServerSnapshot = () => false;

export function WalletConnectButton() {
  const mounted = useSyncExternalStore(subscribe, () => true, getServerSnapshot);

  if (!mounted) {
    return (
      <button className="cursor-default rounded-2xl border border-zinc-700 bg-zinc-900/60 px-6 py-3.5 text-sm font-medium text-zinc-400">
        Connect Wallet
      </button>
    );
  }

  return <ConnectButton chainStatus="icon" showBalance={false} />;
}
```

(Use `useSyncExternalStore` — lint's `react-hooks/set-state-in-effect` rule
rejects the old `useEffect(() => setMounted(true), [])` pattern.)

---

## 7. Login screen — `src/components/Login.tsx`

- Delete the mock modal: `showConnect`, `connecting`, `handleConnect`,
  `handleDisconnect`, the `walletProviders` array, and the `@/lib/wallet`
  imports.
- The `WalletBridge` (mounted app-wide) now drives `resolveAuth`, so Login only
  keeps its `setSession` role buttons.
- Swap the connect button + modal for the component above:

```tsx
<div className="mt-8 flex justify-center">
  <WalletConnectButton />
</div>
```

- Update the footer hint:
  `Wallet connected via RainbowKit · Backend, contract writes and IPFS are still simulated`

Role cards, the "unknown wallet → register" banner, and the redirect effect are
unchanged.

---

## 8. Register screen — `src/components/register/Register.tsx`

- Remove the mock seam imports and `handleConnect` / `handleDisconnect`.
- Connect button area → `<WalletConnectButton />` in the "Connect a wallet to
  begin" card.
- The DID input now derives from the connected address at render time (avoids
  the `set-state-in-effect` lint rule):

```ts
const effectiveDidURI =
  didURI ||
  (auth.isWalletConnected && auth.address ? `did:ethr:${auth.address}` : "");
```

...and `submit` sends `didURI: effectiveDidURI`.

---

## 9. Navbar sign-out — `src/components/Navbar.tsx`

"Disconnect & sign out" must drop the **wagmi** connection too (otherwise the
next page load would silently re-authenticate):

```tsx
import { useDisconnect } from "wagmi";
// in component:
const { disconnect } = useDisconnect();

const handleLogout = () => {
  disconnect();
  dispatch(logout());
  router.push("/login");
};
```

The wallet chip keeps using `shortWalletAddress(wallet)` — now the real address.

---

## 10. Cleanup the simulation — delete `src/lib/wallet.ts`

- Move `shortWalletAddress` to `src/lib/format.ts` (new shared util).
- Update the two importers to `@/lib/format`: `Navbar.tsx`, `Register.tsx`
  (`Login.tsx` no longer uses it).
- Delete `src/lib/wallet.ts` (mock addresses + `connectWallet`/`disconnectWallet`
  seams). Nothing references it anymore.

---

## 11. Verify

```bash
npm run lint   # eslint src  → clean
npm run build  # next build  (Turbopack) → 11 static pages
npm run dev    # http://localhost:3000/login
```

Expected at `/login`: click **Connect Wallet** → RainbowKit modal with
MetaMask / WalletConnect / Coinbase etc. → accept in MetaMask → the address is
resolved through `/api/auth` → either the dashboard opens (registered wallet) or
the "Register now" banner appears (404 / unknown wallet). Reloading the page
reconnects and restores the session automatically.

---

## 12. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Can't resolve '@x402/core/client'` (build) | Install `@x402/core @x402/evm @x402/extensions @x402/svm` (peer deps of `@coinbase/cdp-sdk`). |
| `No projectId found. Every dApp must now provide a WalletConnect Cloud projectId` (prerender) | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is empty → the config falls back to `"YOUR_PROJECT_ID"`, which RainbowKit maps to its public demo id. Set the real id for production. |
| `@react-native-async-storage/async-storage` warning during build | Known harmless warning from `@metamask/sdk` (React Native module ignored on web). |
| Hydration mismatch on the button | Handled by `WalletConnectButton`'s `useSyncExternalStore` mounted guard. |

---

## 13. Next steps (Phase 2 — on-chain, not in this tutorial)

Wire the throwing stubs in `src/lib/chain.ts` to wagmi:

- Replace each `notWired(...)` call with the matching contract write using
  `useReadContract` / `useWriteContract` against the deployed
  `HealthRecordSystem` (ABI from `src/lib/contract.sol`).
- Read role checks (e.g. `hasRole`, `patients`, `providers`) with
  `useReadContracts`.
- Set `NEXT_PUBLIC_CONTRACT_ADDRESS` after deploysing to Sepolia
  (`npx hardhat run scripts/deploy.ts --network sepolia`), per `tutorial.md`.
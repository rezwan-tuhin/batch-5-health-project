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
  ssr: true,
  transports,
});
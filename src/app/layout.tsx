import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/store/Providers";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "HealthRecord System",
  description:
    "Decentralized health record consent, integrity and emergency access management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AuthGuard>
            <AppShell>{children}</AppShell>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}

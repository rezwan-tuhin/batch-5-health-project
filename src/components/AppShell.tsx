"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="flex flex-1 flex-col overflow-x-hidden">{children}</main>
    </div>
  );
}
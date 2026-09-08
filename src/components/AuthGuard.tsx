"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/login" && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, pathname, router]);

  if (pathname === "/login") return <>{children}</>;

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
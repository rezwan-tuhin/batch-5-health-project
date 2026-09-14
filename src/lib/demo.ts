import { users } from "@/lib/dummy-data";
import type { Role, User } from "@/lib/dummy-data";

/**
 * Demo-only identity resolver.
 *
 * TODO(backend): once `GET /api/auth?address=` is implemented this fallback is
 * removed — the role is resolved server-side from the users collection / on-chain
 * roles instead of picked by the user.
 */
export function demoUserForRole(role: Role): User | null {
  return users.find((u) => u.role === role) ?? null;
}
"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { verifyProvider, registerProvider } from "@/store/slices/providersSlice";
import { canViewProviders, visibleProviders } from "@/lib/access";
import { providerProfiles } from "@/lib/dummy-data";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import AccessDenied from "@/components/AccessDenied";

export default function Providers() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const providers = useAppSelector((s) => s.providers.list);
  const consents = useAppSelector((s) => s.consents.list);

  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [didURI, setDidURI] = useState("");

  if (!user) return null;
  if (!canViewProviders(user.role) && user.role !== "patient") {
    return <AccessDenied description="Only regulators and administrators can manage providers." />;
  }

  const canManage = user.role === "regulator" || user.role === "admin";
  const list = visibleProviders(user.role, user, providers, consents);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !name || !didURI) return;
    dispatch(registerProvider({ address, name, didURI }));
    setAddress("");
    setName("");
    setDidURI("");
  };

  const toggleVerify = (addr: string, currentlyVerified: boolean, erQualified: boolean) => {
    if (!canManage) return;
    dispatch(
      verifyProvider({
        address: addr,
        isVerified: !currentlyVerified,
        erQualified,
      }),
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Providers"
        description="Healthcare providers and regulator verification"
      />

      <div className="flex-1 space-y-6 p-8">
        {canManage && (
          <Card
            title="Register Provider"
            subtitle="Self-registration with name and DID"
          >
            <form
              onSubmit={submit}
              className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Wallet address (0x…)"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <input
                value={didURI}
                onChange={(e) => setDidURI(e.target.value)}
                placeholder="did:ethr:…"
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
              >
                Register
              </button>
            </form>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((p) => {
            const profile = providerProfiles.find((x) => x.address === p.address);
            return (
              <div
                key={p.address}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{p.name}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {profile?.specialty} · {profile?.licenseNumber}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">{p.hospital}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {p.verified ? (
                      <Badge tone="emerald">Verified</Badge>
                    ) : (
                      <Badge tone="zinc">Unverified</Badge>
                    )}
                    {p.erQualified && <Badge tone="violet">ER</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <code className="truncate font-mono text-xs text-zinc-500">
                    {p.address}
                  </code>
                  {canManage && (
                    <button
                      onClick={() =>
                        toggleVerify(p.address, p.verified, p.erQualified)
                      }
                      className="shrink-0 rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-emerald-500 hover:text-emerald-400"
                    >
                      {p.verified ? "Unverify" : "Verify"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {list.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-600">
            No providers visible to you.
          </div>
        )}
      </div>
    </div>
  );
}
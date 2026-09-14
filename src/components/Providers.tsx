"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";
import { queryKeys, useProviders } from "@/hooks";
import { canViewProviders } from "@/lib/access";
import {
  chainRegisterProvider,
  chainVerifyProvider,
  ChainNotWiredError,
} from "@/lib/chain";
import type { ProviderListItem } from "@/lib/api";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageHeader from "@/components/PageHeader";
import AccessDenied from "@/components/AccessDenied";
import { QueryError, CardGridSkeleton, InlineNotice } from "@/components/QueryState";

export default function Providers() {
  const queryClient = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);
  const canView = !!user && canViewProviders(user.role);

  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [didURI, setDidURI] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const {
    data: providers,
    isLoading,
    isError,
    error,
  } = useProviders({ enabled: canView });

  if (!user) return null;
  if (!canViewProviders(user.role) && user.role !== "patient") {
    return (
      <AccessDenied description="Only regulators and administrators can manage providers." />
    );
  }

  const canManage = user.role === "regulator" || user.role === "admin";
  const list = providers ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !name || !didURI) return;
    setSubmitting(true);
    setNotice(null);
    setFormError(null);
    try {
      await api.providers.register({ address, name, didURI });
      try {
        await chainRegisterProvider({ address, name, didURI });
      } catch (err) {
        if (err instanceof ChainNotWiredError) {
          setNotice(
            "Chain write not wired (wagmi) — DB updated, on-chain registration pending.",
          );
        } else {
          throw err;
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.providers });
      setAddress("");
      setName("");
      setDidURI("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVerify = async (
    p: ProviderListItem,
    currentlyVerified: boolean,
  ) => {
    if (!canManage || !p) return;
    setVerifying(p.address);
    setNotice(null);
    try {
      await api.providers.verify({
        address: p.address,
        isVerified: !currentlyVerified,
        erQualified: currentlyVerified ? p.erQualified : false,
      });
      try {
        await chainVerifyProvider({
          address: p.address,
          isVerified: !currentlyVerified,
          erQualified: currentlyVerified ? p.erQualified : false,
        });
      } catch (err) {
        if (err instanceof ChainNotWiredError) {
          setNotice(
            "Chain write not wired (wagmi) — DB updated, on-chain verification pending.",
          );
        } else {
          throw err;
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.providers });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(null);
    }
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
                disabled={submitting}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {submitting ? "Registering…" : "Register"}
              </button>
            </form>
            {formError && <QueryError error={new Error(formError)} />}
            {notice && <InlineNotice>{notice}</InlineNotice>}
          </Card>
        )}

        {isLoading && <CardGridSkeleton count={4} />}
        {isError && <QueryError error={error} />}
        {!isLoading && !isError && (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((p) => (
              <div
                key={p.address}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{p.name}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {p.specialty} · {p.licenseNumber}
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
                      onClick={() => toggleVerify(p, p.verified)}
                      disabled={verifying === p.address}
                      className="shrink-0 rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50"
                    >
                      {verifying === p.address
                        ? "Saving…"
                        : p.verified
                          ? "Unverify"
                          : "Verify"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-600">
            No providers visible to you.
          </div>
        )}
      </div>
    </div>
  );
}
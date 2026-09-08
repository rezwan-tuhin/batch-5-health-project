"use client";

import Link from "next/link";

export default function AccessDenied({
  title = "Access Restricted",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-2xl text-zinc-600">
        🔒
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        {description ??
          "Your role does not have permission to view this section. Access is controlled on-chain via role-based permissions."}
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
"use client";

export function ContractStatus({ status }: { status: string }) {
  const normalized = status?.toLowerCase?.() ?? "";
  const cls =
    normalized === "signed"
      ? "bg-emerald-500/20 text-emerald-700"
      : normalized === "sent"
        ? "bg-yellow-500/20 text-yellow-700"
        : normalized === "canceled" || normalized === "expired"
          ? "bg-red-500/20 text-red-700"
          : "bg-muted text-foreground";

  return <span className={`inline-flex rounded px-2 py-0.5 text-xs ${cls}`}>{status}</span>;
}


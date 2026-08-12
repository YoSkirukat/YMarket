"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  label: string;
  endpoint: string;
  method?: string;
  body?: unknown;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string;
  onDone?: (data: unknown) => void;
};

export function ActionButton({
  label,
  endpoint,
  method = "POST",
  body,
  variant = "secondary",
  confirm,
  onDone,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = {
    primary:
      "bg-[var(--brand)] text-[#1a1a1a] hover:brightness-95 border-transparent",
    secondary:
      "bg-white text-[var(--text)] hover:bg-[var(--surface)] border-[var(--border)]",
    danger:
      "bg-white text-[#c62828] hover:bg-[#fdeceb] border-[var(--border)]",
  };

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Ошибка ${res.status}`);
      }
      onDone?.(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition disabled:opacity-60 ${styles[variant]}`}
      >
        {loading ? "Подождите…" : label}
      </button>
      {error ? (
        <span className="max-w-xs text-right text-xs text-[#c62828]">
          {error}
        </span>
      ) : null}
    </div>
  );
}

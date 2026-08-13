"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DuplicateCodesModal,
  type DuplicateCode,
} from "@/components/DuplicateCodesModal";

function parseCodes(text: string) {
  return text
    .split(/[\n,;]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function successMessage(data: {
  added?: number;
  reactivated?: number;
  skipped?: number;
  stock?: number;
  market?: { ok: boolean; error?: string } | null;
}) {
  const parts = [
    `Добавлено: ${data.added ?? 0}`,
    `Остаток: ${data.stock ?? "—"}`,
  ];
  if (data.reactivated) parts.push(`Восстановлено: ${data.reactivated}`);
  if (data.skipped) parts.push(`Пропущено: ${data.skipped}`);
  if (data.market && !data.market.ok) {
    parts.push(`Маркет: ${data.market.error}`);
  } else if (data.added) {
    parts.push("Остаток отправлен в Маркет");
  }
  return parts.join(". ");
}

export function AddCodesForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCode[] | null>(null);

  async function send(codes: string[], force = false) {
    const res = await fetch(`/api/digital/${productId}/codes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codes, force }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 409 && data.needsConfirmation) {
      setDuplicates(data.duplicates ?? []);
      return null;
    }

    if (!res.ok) throw new Error(data.error || "Ошибка добавления");
    return data;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    setDuplicates(null);
    try {
      const codes = parseCodes(text);
      if (!codes.length) throw new Error("Введите хотя бы один код");

      const data = await send(codes);
      if (!data) return;

      setText("");
      setMessage(successMessage(data));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function confirmForce() {
    setLoading(true);
    setError(null);
    try {
      const codes = parseCodes(text);
      const data = await send(codes, true);
      if (!data) return;

      setDuplicates(null);
      setText("");
      setMessage(successMessage(data));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            Коды активации (по одному на строку)
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="field min-h-36 font-mono text-sm"
            placeholder={"XXXX-YYYY-ZZZZ\nAAAA-BBBB-CCCC"}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[#1a1a1a] hover:brightness-95 disabled:opacity-60"
        >
          {loading ? "Добавление…" : "Добавить на остатки"}
        </button>
        {message ? <p className="text-sm text-[#1a7f37]">{message}</p> : null}
        {error ? <p className="text-sm text-[#c62828]">{error}</p> : null}
      </form>

      {duplicates ? (
        <DuplicateCodesModal
          duplicates={duplicates}
          loading={loading}
          onCancel={() => setDuplicates(null)}
          onConfirm={confirmForce}
        />
      ) : null}
    </>
  );
}

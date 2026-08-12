"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddCodesForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const codes = text
        .split(/[\n,;]+/)
        .map((c) => c.trim())
        .filter(Boolean);

      if (!codes.length) throw new Error("Введите хотя бы один код");

      const res = await fetch(`/api/digital/${productId}/codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка добавления");

      setText("");
      setMessage(
        `Добавлено: ${data.added}. Остаток: ${data.stock ?? "—"}. Пропущено: ${data.skipped}`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
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
  );
}

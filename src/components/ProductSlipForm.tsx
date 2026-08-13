"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProductSlipForm({
  productId,
  initial,
}: {
  productId: string;
  initial: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipText: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");
      setMessage("Инструкция сохранена");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Инструкция для покупателя (slip)
        </span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setMessage(null);
          }}
          className="field min-h-28 text-sm"
          placeholder="Как активировать код, куда вводить ключ, ограничения…"
        />
        <span className="mt-1 block text-xs text-[var(--muted)]">
          Этот текст Маркет покажет покупателю вместе с кодом. Для каждого
          товара своя инструкция.
        </span>
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-sm font-medium hover:bg-[var(--surface)] disabled:opacity-60"
      >
        {saving ? "Сохранение…" : "Сохранить инструкцию"}
      </button>
      {message ? <p className="text-sm text-[#1a7f37]">{message}</p> : null}
      {error ? <p className="text-sm text-[#c62828]">{error}</p> : null}
    </form>
  );
}

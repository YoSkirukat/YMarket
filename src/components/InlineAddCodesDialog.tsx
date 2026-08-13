"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  const parts = [`Добавлено: ${data.added ?? 0}`, `Остаток: ${data.stock ?? "—"}`];
  if (data.reactivated) parts.push(`Восстановлено: ${data.reactivated}`);
  if (data.skipped) parts.push(`Пропущено: ${data.skipped}`);
  if (data.market && !data.market.ok) {
    parts.push(`Маркет: ${data.market.error}`);
  } else if (data.added) {
    parts.push("Остаток отправлен в Маркет");
  }
  return parts.join(". ");
}

export function InlineAddCodesDialog({
  productId,
  initialOpen = false,
}: {
  productId: string;
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCode[] | null>(null);

  const submitDisabled = useMemo(() => {
    return loading || !parseCodes(text).length;
  }, [loading, text]);

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

  async function submit() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setDuplicates(null);

    try {
      const codes = parseCodes(text);
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

  function close() {
    if (loading) return;
    setOpen(false);
    setDuplicates(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface)]"
      >
        Добавить коды
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-full max-w-xl rounded-xl border border-[var(--border)] bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Добавить коды</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  Вставьте коды (по одному на строку). При дублях спросим
                  подтверждение.
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-xs text-[var(--muted)] hover:underline"
              >
                Закрыть
              </button>
            </div>

            <div className="mt-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="field min-h-36 font-mono text-sm"
                placeholder={"XXXX-YYYY-ZZZZ\nAAAA-BBBB-CCCC"}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-h-[18px] text-xs">
                {message ? <span className="text-[#1a7f37]">{message}</span> : null}
                {error ? <span className="text-[#c62828]">{error}</span> : null}
              </div>
              <button
                type="button"
                disabled={submitDisabled}
                onClick={submit}
                className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[#1a1a1a] hover:brightness-95 disabled:opacity-60"
              >
                {loading ? "Добавление…" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

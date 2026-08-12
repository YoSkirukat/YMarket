"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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

  const submitDisabled = useMemo(() => {
    const codes = text
      .split(/[\n,;]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    return loading || !codes.length;
  }, [loading, text]);

  async function submit() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const codes = text
        .split(/[\n,;]+/)
        .map((c) => c.trim())
        .filter(Boolean);

      const res = await fetch(`/api/digital/${productId}/codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Ошибка добавления");
      }

      setText("");
      setMessage(
        `Добавлено: ${data.added}. Остаток: ${data.stock ?? "—"}${
          data.market && !data.market.ok
            ? `. Маркет: ${data.market.error}`
            : data.added
              ? ". Остаток отправлен в Маркет"
              : ""
        }`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
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
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-xl rounded-xl border border-[var(--border)] bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Добавить коды</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  Вставьте коды (по одному на строку). Дубликаты пропускаются.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
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
    </>
  );
}


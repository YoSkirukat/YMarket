"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type DuplicateCode = {
  code: string;
  status: string;
  statusLabel: string;
};

export function DuplicateCodesModal({
  duplicates,
  loading,
  onConfirm,
  onCancel,
}: {
  duplicates: DuplicateCode[];
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-codes-title"
    >
      <div className="absolute inset-0 bg-black/45" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl border border-[var(--border)] bg-white p-5 shadow-lg">
        <h2 id="duplicate-codes-title" className="text-base font-semibold">
          Код уже был в системе
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {duplicates.length === 1
            ? "Этот код уже есть. Всё равно добавить?"
            : `Найдено дублей: ${duplicates.length}. Всё равно добавить?`}
        </p>

        <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          {duplicates.map((item) => (
            <li
              key={item.code}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <code className="break-all font-mono text-[13px]">{item.code}</code>
              <span className="shrink-0 text-xs text-[var(--muted)]">
                {item.statusLabel}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-[var(--muted)]">
          При подтверждении проданные и другие занятые коды снова станут
          доступными на остатках. Коды, которые уже в наличии, будут пропущены.
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-sm hover:bg-[var(--surface)] disabled:opacity-60"
          >
            Отменить
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-lg bg-[var(--brand)] px-3.5 py-2 text-sm font-medium text-[#1a1a1a] hover:brightness-95 disabled:opacity-60"
          >
            {loading ? "Добавление…" : "Всё равно добавить"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

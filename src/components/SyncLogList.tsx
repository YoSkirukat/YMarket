"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";

type LogEntry = {
  id: string;
  type: string;
  message: string;
  level: string;
  createdAt: Date | string;
};

const PREVIEW_LIMIT = 140;

function compactMessage(message: string) {
  const trimmed = message.trim();
  const firstLine = trimmed.split(/\r?\n/)[0] ?? trimmed;
  return firstLine.replace(/\s+/g, " ").trim();
}

function levelClass(level: string) {
  if (level === "error") return "text-[#c62828]";
  if (level === "warn") return "text-[#b35c00]";
  return "text-[var(--muted)]";
}

export function SyncLogList({ logs }: { logs: LogEntry[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (logs.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Записей пока нет</p>;
  }

  return (
    <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
      {logs.map((log) => {
        const preview = compactMessage(log.message);
        const isLong = log.message.length > PREVIEW_LIMIT || log.message.includes("\n");
        const expanded = expandedIds.has(log.id);

        return (
          <li
            key={log.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${levelClass(log.level)}`}>
                {log.type}
              </span>
              <span className="shrink-0 text-[11px] text-[var(--muted)]">
                {formatDateTime(log.createdAt)}
              </span>
            </div>
            <div
              className={`mt-1 text-sm leading-snug text-[var(--text)] ${
                expanded
                  ? "max-h-28 overflow-y-auto whitespace-pre-wrap break-words"
                  : "line-clamp-2 break-words"
              }`}
            >
              {expanded ? log.message : preview}
            </div>
            {isLong ? (
              <button
                type="button"
                onClick={() => toggle(log.id)}
                className="mt-1 text-xs text-[var(--link)] hover:underline"
              >
                {expanded ? "Свернуть" : "Подробнее"}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

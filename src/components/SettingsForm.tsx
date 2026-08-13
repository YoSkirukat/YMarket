"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettingsForm({
  initial,
}: {
  initial: {
    apiKey: string;
    campaignId: string;
    businessId: string;
    warehouseId: string;
    shopName: string;
    activateTill: string;
    slipText: string;
    autoDeliver: boolean;
    webhookSecret: string;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");
      setMessage("Настройки сохранены");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function detectIds() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/detect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось определить ID");
      setForm((prev) => ({
        ...prev,
        campaignId: data.campaignId || prev.campaignId,
        businessId: data.businessId || prev.businessId,
        warehouseId: data.warehouseId || prev.warehouseId,
        shopName: data.shopName || prev.shopName,
      }));
      setMessage("ID кампании / кабинета / склада подставлены из API");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">API-Key токен</span>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => update("apiKey", e.target.value)}
            className="field"
            placeholder="ACMA:..."
            required
          />
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Кабинет продавца → Настройки → API и модули → Создать токен
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Campaign ID</span>
          <input
            value={form.campaignId}
            onChange={(e) => update("campaignId", e.target.value)}
            className="field"
            placeholder="12345678"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Business ID</span>
          <input
            value={form.businessId}
            onChange={(e) => update("businessId", e.target.value)}
            className="field"
            placeholder="1234567"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Warehouse ID</span>
          <input
            value={form.warehouseId}
            onChange={(e) => update("warehouseId", e.target.value)}
            className="field"
            placeholder="подставится автоматически"
          />
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Нужен для передачи остатков, если в кабинете нет групп складов
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Название магазина</span>
          <input
            value={form.shopName}
            onChange={(e) => update("shopName", e.target.value)}
            className="field"
            placeholder="Мой магазин"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            Срок активации ключей (activate_till)
          </span>
          <input
            type="date"
            value={form.activateTill}
            onChange={(e) => update("activateTill", e.target.value)}
            className="field"
          />
        </label>

        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={form.autoDeliver}
            onChange={(e) => update("autoDeliver", e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">
            Автоматически передавать коды при синхронизации заказов
          </span>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">
            Инструкция для покупателя (slip)
          </span>
          <textarea
            value={form.slipText}
            onChange={(e) => update("slipText", e.target.value)}
            className="field min-h-24"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">
            Секрет вебхука (опционально)
          </span>
          <input
            value={form.webhookSecret}
            onChange={(e) => update("webhookSecret", e.target.value)}
            className="field"
            placeholder="произвольная строка"
          />
          <span className="mt-1 block text-xs text-[var(--muted)]">
            В ЛК Маркета: /api/webhooks/yandex/ВАШ_СЕКРЕТ (без ?secret= —
            Маркет сам добавит /notification в конец)
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[#1a1a1a] hover:brightness-95 disabled:opacity-60"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={detectIds}
          disabled={saving || !form.apiKey}
          className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--surface)] disabled:opacity-60"
        >
          Подставить ID из API
        </button>
      </div>

      {message ? (
        <p className="text-sm text-[#1a7f37]">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-[#c62828]">{error}</p> : null}
    </form>
  );
}

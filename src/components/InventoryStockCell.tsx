"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { InlineAddCodesDialog } from "@/components/InlineAddCodesDialog";

export function InventoryStockCell({
  productId,
  isDigital,
  stock,
}: {
  productId: string;
  isDigital: boolean;
  stock: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(stock));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setValue(String(stock));
  }, [stock]);

  async function save() {
    const parsed = Math.max(0, Math.floor(Number(value)) || 0);
    if (parsed === stock) return;

    setSaving(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: parsed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");
      setValue(String(parsed));
      if (data.market && !data.market.ok) {
        setHint(
          `Сохранено локально, но Маркет: ${data.market.error || "ошибка"}`,
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setValue(String(stock));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min={0}
        value={value}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="field w-[72px] text-center font-semibold"
        title="Остаток на складе. Сохраняется и отправляется в Яндекс Маркет"
      />
      {isDigital ? <InlineAddCodesDialog productId={productId} /> : null}
      {error ? (
        <div className="w-full text-[11px] text-[#c62828]">{error}</div>
      ) : null}
      {hint ? (
        <div className="w-full text-[11px] text-[#b35c00]">{hint}</div>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkDigitalButton({
  productId,
  isDigital,
}: {
  productId: string;
  isDigital: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDigital: !isDigital }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Ошибка");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="text-xs text-[var(--link)] hover:underline disabled:opacity-50"
    >
      {isDigital ? "Убрать из цифровых" : "Пометить как цифровой"}
    </button>
  );
}

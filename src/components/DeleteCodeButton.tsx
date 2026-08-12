"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteCodeButton({
  productId,
  codeId,
}: {
  productId: string;
  codeId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!window.confirm("Удалить код с остатков?")) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/digital/${productId}/codes?codeId=${codeId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Ошибка удаления");
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
      onClick={remove}
      disabled={loading}
      className="text-xs text-[#c62828] hover:underline disabled:opacity-50"
    >
      Удалить
    </button>
  );
}

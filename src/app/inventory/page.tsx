import Link from "next/link";
import {
  AppHeader,
  EmptyState,
  PageShell,
  Panel,
  StatusBadge,
} from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";
import { InventoryStockCell } from "@/components/InventoryStockCell";
import { getSettings, prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

type Tab = "all" | "in_stock" | "out_of_stock";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const currentTab = (tab as Tab) || "all";
  const query = (q ?? "").trim().toLowerCase();
  const settings = await getSettings();

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      codes: {
        select: { status: true },
      },
    },
  });

  // Если у цифрового товара уже есть коды, а stock=0 — подтянуть остаток по кодам
  for (const product of products) {
    if (!product.isDigital) continue;
    const available = product.codes.filter((c) => c.status === "available").length;
    if (available > 0 && product.stock === 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: available },
      });
      product.stock = available;
    }
  }

  const enriched = products.map((product) => {
    const available = product.codes.filter((c) => c.status === "available").length;
    const reserved = product.codes.filter((c) => c.status === "reserved").length;
    const onHand = product.stock;

    return { product, available, reserved, onHand };
  });

  const filtered = enriched.filter(({ product, onHand }) => {
    if (query) {
      const haystack =
        `${product.name} ${product.offerId} ${product.vendor ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (currentTab === "in_stock") return onHand > 0;
    if (currentTab === "out_of_stock") return onHand === 0;
    return true;
  });

  const counts = {
    all: enriched.length,
    in_stock: enriched.filter((p) => p.onHand > 0).length,
    out_of_stock: enriched.filter((p) => p.onHand === 0).length,
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "Все", count: counts.all },
    { id: "in_stock", label: "В наличии", count: counts.in_stock },
    { id: "out_of_stock", label: "Нет на складе", count: counts.out_of_stock },
  ];

  return (
    <div>
      <AppHeader active="/inventory" />
      <PageShell
        title="Остатки на складах"
        description={
          settings.lastStocksSync
            ? `Остатки из Маркета: ${formatDateTime(settings.lastStocksSync)}. Редактирование сразу отправляется в Яндекс Маркет.`
            : "Загрузите остатки из Маркета или отредактируйте вручную — изменения уйдут в ЛК ЯМ."
        }
        actions={
          <>
            <ActionButton
              label="Загрузить из Маркета"
              endpoint="/api/sync/stocks?direction=pull"
              variant="secondary"
            />
            <ActionButton
              label="Отправить в Маркет"
              endpoint="/api/sync/stocks?direction=push"
              variant="primary"
              confirm="Отправить все локальные остатки в Яндекс Маркет?"
            />
          </>
        }
        tabs={
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div className="flex flex-wrap gap-1">
              {tabs.map((t) => {
                const active = currentTab === t.id;
                const href =
                  t.id === "all"
                    ? query
                      ? `/inventory?q=${encodeURIComponent(query)}`
                      : "/inventory"
                    : `/inventory?tab=${t.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
                return (
                  <Link
                    key={t.id}
                    href={href}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                      active
                        ? "border-[var(--text)] font-medium text-[var(--text)]"
                        : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {t.label}
                    <span className="ml-1.5 text-xs text-[var(--muted)]">
                      {t.count}
                    </span>
                  </Link>
                );
              })}
            </div>
            <form action="/inventory" method="get" className="flex gap-2">
              {currentTab !== "all" ? (
                <input type="hidden" name="tab" value={currentTab} />
              ) : null}
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="SKU или название"
                className="field w-56"
              />
            </form>
          </div>
        }
      >
        <Panel className="fade-in">
          {filtered.length === 0 ? (
            <EmptyState
              title="Товаров не найдено"
              description="Синхронизируйте каталог или измените фильтр."
            />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th className="w-[150px]">Статус товара</th>
                    <th className="w-[220px]">На вашем складе</th>
                    <th className="w-[90px]">Кодов</th>
                    <th className="w-[110px]">Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ product, available, onHand }) => (
                    <tr key={product.id}>
                      <td>
                        <div className="flex gap-3">
                          {product.pictureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.pictureUrl}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-md bg-[var(--surface)] object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 shrink-0 rounded-md bg-[var(--surface)]" />
                          )}
                          <div className="min-w-0">
                            <div className="max-w-xl font-medium leading-snug">
                              {product.name}
                            </div>
                            <div className="mt-1 font-mono text-xs text-[var(--muted)]">
                              {product.offerId}
                            </div>
                            {product.isDigital ? (
                              <div className="mt-1">
                                <StatusBadge tone="info">Цифровой</StatusBadge>{" "}
                                <Link
                                  href={`/inventory/${product.id}`}
                                  className="text-xs text-[var(--link)] hover:underline"
                                >
                                  Коды
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge tone={onHand > 0 ? "ok" : "danger"}>
                          {onHand > 0 ? "В наличии" : "Нет на складе"}
                        </StatusBadge>
                      </td>
                      <td>
                        <InventoryStockCell
                          productId={product.id}
                          isDigital={product.isDigital}
                          stock={product.stock}
                        />
                      </td>
                      <td className="font-semibold">
                        {product.isDigital ? available : "—"}
                      </td>
                      <td>{formatMoney(product.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </PageShell>
    </div>
  );
}

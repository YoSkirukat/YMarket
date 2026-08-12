import Link from "next/link";
import { AppHeader, EmptyState, PageShell, Panel, StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DigitalPage() {
  const products = await prisma.product.findMany({
    where: { isDigital: true },
    orderBy: { name: "asc" },
    include: {
      codes: {
        select: { status: true },
      },
    },
  });

  return (
    <div>
      <AppHeader active="/digital" />
      <PageShell
        title="Электронные товары"
        description="Цифровые товары магазина и остатки кодов активации"
        actions={
          <ActionButton
            label="Синхронизировать товары"
            endpoint="/api/sync/products"
            variant="secondary"
          />
        }
      >
        <Panel className="fade-in">
          {products.length === 0 ? (
            <EmptyState
              title="Цифровых товаров нет"
              description="Синхронизируйте каталог или пометьте товар как электронный на странице «Товары»."
            />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>SKU</th>
                    <th>Цена</th>
                    <th>В наличии</th>
                    <th>Продано</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const available = product.codes.filter(
                      (c) => c.status === "available",
                    ).length;
                    const sold = product.codes.filter(
                      (c) => c.status === "sold",
                    ).length;
                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="max-w-lg font-medium leading-snug">
                            {product.name}
                          </div>
                          <div className="mt-1">
                            <StatusBadge
                              tone={available > 0 ? "ok" : "danger"}
                            >
                              {available > 0 ? "Есть коды" : "Нет кодов"}
                            </StatusBadge>
                          </div>
                        </td>
                        <td className="font-mono text-xs">{product.offerId}</td>
                        <td>{formatMoney(product.price)}</td>
                        <td className="font-semibold">{available}</td>
                        <td>{sold}</td>
                        <td className="text-right">
                          <Link
                            href={`/digital/${product.id}`}
                            className="text-sm text-[var(--link)] hover:underline"
                          >
                            Открыть
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </PageShell>
    </div>
  );
}

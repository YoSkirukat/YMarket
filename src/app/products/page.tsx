import Link from "next/link";
import { AppHeader, EmptyState, PageShell, Panel, StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";
import { MarkDigitalButton } from "@/components/MarkDigitalButton";
import { getSettings, prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const settings = await getSettings();
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          codes: { where: { status: "available" } },
        },
      },
    },
  });

  return (
    <div>
      <AppHeader active="/products" />
      <PageShell
        title="Товары"
        description={
          settings.lastProductsSync
            ? `Последняя синхронизация: ${formatDateTime(settings.lastProductsSync)}`
            : "Синхронизируйте каталог из Яндекс Маркета"
        }
        actions={
          <ActionButton
            label="Синхронизировать"
            endpoint="/api/sync/products"
            variant="primary"
          />
        }
      >
        <Panel className="fade-in">
          {products.length === 0 ? (
            <EmptyState
              title="Товаров пока нет"
              description="Укажите API-ключ в настройках и нажмите «Синхронизировать»."
            />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>SKU / offerId</th>
                    <th>Цена</th>
                    <th>Тип</th>
                    <th>Кодов</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="flex gap-3">
                          {product.pictureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.pictureUrl}
                              alt=""
                              className="h-12 w-12 rounded-md object-cover bg-[var(--surface)]"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-[var(--surface)]" />
                          )}
                          <div>
                            <div className="max-w-md font-medium leading-snug">
                              {product.name}
                            </div>
                            {product.vendor ? (
                              <div className="mt-0.5 text-xs text-[var(--muted)]">
                                {product.vendor}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs">{product.offerId}</td>
                      <td>{formatMoney(product.price)}</td>
                      <td>
                        {product.isDigital ? (
                          <StatusBadge tone="info">Электронный</StatusBadge>
                        ) : (
                          <StatusBadge>Обычный</StatusBadge>
                        )}
                      </td>
                      <td>
                        {product.isDigital ? product._count.codes : "—"}
                      </td>
                      <td className="space-y-1 text-right">
                        {product.isDigital ? (
                          <div>
                            <Link
                              href={`/digital/${product.id}`}
                              className="text-xs text-[var(--link)] hover:underline"
                            >
                              Коды
                            </Link>
                          </div>
                        ) : null}
                        <MarkDigitalButton
                          productId={product.id}
                          isDigital={product.isDigital}
                        />
                      </td>
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

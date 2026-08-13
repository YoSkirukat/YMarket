import Link from "next/link";
import { notFound } from "next/navigation";
import { AddCodesForm } from "@/components/AddCodesForm";
import { ProductSlipForm } from "@/components/ProductSlipForm";
import { DeleteCodeButton } from "@/components/DeleteCodeButton";
import { AppHeader, PageShell, Panel, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { codeStatusLabel, formatDateTime, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DigitalProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      codes: {
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: { order: true },
      },
    },
  });

  if (!product) notFound();

  const available = product.codes.filter((c) => c.status === "available").length;

  return (
    <div>
      <AppHeader active="/digital" />
      <PageShell
        title={product.name}
        description={`SKU: ${product.offerId} · ${formatMoney(product.price)}`}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <StatusBadge tone="info">Электронный товар</StatusBadge>
          <StatusBadge tone={available > 0 ? "ok" : "danger"}>
            Доступно кодов: {available}
          </StatusBadge>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Panel className="fade-in px-4 py-4">
            <div className="mb-3 text-sm font-medium">Добавить коды на остатки</div>
            <AddCodesForm productId={product.id} />
            <div className="my-5 border-t border-[var(--border)]" />
            <ProductSlipForm productId={product.id} initial={product.slipText} />
            <p className="mt-4 text-xs text-[var(--muted)]">
              При заказе сервис автоматически возьмёт нужное число кодов и
              передаст их методом{" "}
              <code className="rounded bg-[var(--surface)] px-1">
                deliverDigitalGoods
              </code>{" "}
              в течение 30 минут после статуса PROCESSING.
            </p>
            <Link
              href="/digital"
              className="mt-4 inline-block text-sm text-[var(--link)] hover:underline"
            >
              ← К списку электронных товаров
            </Link>
          </Panel>

          <Panel className="fade-in">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-medium">
              Остатки кодов ({product.codes.length})
            </div>
            {product.codes.length === 0 ? (
              <div className="px-4 py-10 text-sm text-[var(--muted)]">
                Кодов пока нет — добавьте первую партию слева.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Код</th>
                      <th>Статус</th>
                      <th>Заказ</th>
                      <th>Добавлен</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.codes.map((code) => (
                      <tr key={code.id}>
                        <td className="font-mono text-xs">{code.code}</td>
                        <td>
                          <StatusBadge
                            tone={
                              code.status === "available"
                                ? "ok"
                                : code.status === "sold"
                                  ? "info"
                                  : "default"
                            }
                          >
                            {codeStatusLabel(code.status)}
                          </StatusBadge>
                        </td>
                        <td>
                          {code.order ? (
                            <Link
                              href={`/orders/${code.order.id}`}
                              className="text-[var(--link)] hover:underline"
                            >
                              № {code.order.marketOrderId}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{formatDateTime(code.createdAt)}</td>
                        <td className="text-right">
                          {code.status !== "sold" ? (
                            <DeleteCodeButton
                              productId={product.id}
                              codeId={code.id}
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </PageShell>
    </div>
  );
}

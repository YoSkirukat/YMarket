import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader, PageShell, Panel, StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";
import { prisma } from "@/lib/prisma";
import {
  deadlineInfo,
  formatDateTime,
  formatMoney,
  orderStatusLabel,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      codes: true,
    },
  });

  if (!order) notFound();

  const deadline = deadlineInfo(order.processingDeadline, order.digitalDelivered);

  return (
    <div>
      <AppHeader active="/orders" />
      <PageShell
        title={`Заказ № ${order.marketOrderId}`}
        description={`${orderStatusLabel(order.status)}${
          order.substatus ? ` · ${order.substatus}` : ""
        }`}
        actions={
          order.isDigital && !order.digitalDelivered ? (
            <ActionButton
              label="Передать коды сейчас"
              endpoint={`/api/orders/${order.id}/deliver`}
              variant="primary"
              confirm="Отправить коды активации в Яндекс Маркет?"
            />
          ) : undefined
        }
      >
        <div className="mb-4 flex flex-wrap gap-2 fade-in">
          <StatusBadge
            tone={
              order.status === "DELIVERED"
                ? "ok"
                : order.status === "PROCESSING"
                  ? "warn"
                  : "default"
            }
          >
            {orderStatusLabel(order.status)}
          </StatusBadge>
          {order.isDigital ? <StatusBadge tone="info">Цифровой</StatusBadge> : null}
          {order.isDigital ? (
            <StatusBadge
              tone={
                deadline.tone === "ok"
                  ? "ok"
                  : deadline.tone === "danger"
                    ? "danger"
                    : deadline.tone === "warn"
                      ? "warn"
                      : "default"
              }
            >
              {deadline.label}
            </StatusBadge>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Panel className="fade-in">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-medium">
              Состав заказа
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>SKU</th>
                    <th>Кол-во</th>
                    <th>Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium">{item.name}</div>
                        {item.product?.isDigital ? (
                          <Link
                            href={`/digital/${item.product.id}`}
                            className="mt-1 inline-block text-xs text-[var(--link)] hover:underline"
                          >
                            Остатки кодов
                          </Link>
                        ) : null}
                      </td>
                      <td className="font-mono text-xs">{item.offerId || "—"}</td>
                      <td>{item.count}</td>
                      <td>{formatMoney(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-6 border-t border-[var(--border)] px-4 py-3 text-sm">
              <div>
                Итого:{" "}
                <span className="font-semibold">
                  {formatMoney(order.totalPrice)}
                </span>
              </div>
            </div>
          </Panel>

          <div className="space-y-4 fade-in">
            <Panel className="px-4 py-4">
              <div className="text-sm font-medium">Информация о заказе</div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Дата заказа</dt>
                  <dd>{formatDateTime(order.creationDate)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Тип доставки</dt>
                  <dd>{order.deliveryType || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Покупатель</dt>
                  <dd>{order.buyerName || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Дедлайн кодов</dt>
                  <dd>{formatDateTime(order.processingDeadline)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Коды переданы</dt>
                  <dd>
                    {order.digitalDelivered
                      ? formatDateTime(order.digitalDeliveredAt)
                      : "Нет"}
                  </dd>
                </div>
              </dl>
              {order.deliveryError ? (
                <div className="mt-3 rounded-lg bg-[#fdeceb] px-3 py-2 text-xs text-[#c62828]">
                  {order.deliveryError}
                </div>
              ) : null}
            </Panel>

            {order.codes.length > 0 ? (
              <Panel className="px-4 py-4">
                <div className="text-sm font-medium">Выданные коды</div>
                <ul className="mt-3 space-y-1 font-mono text-sm">
                  {order.codes.map((code) => (
                    <li key={code.id}>{code.code}</li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            <Link
              href="/orders"
              className="inline-block text-sm text-[var(--link)] hover:underline"
            >
              ← К списку заказов
            </Link>
          </div>
        </div>
      </PageShell>
    </div>
  );
}

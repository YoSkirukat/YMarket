import Link from "next/link";
import { AppHeader, EmptyState, PageShell, Panel, StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";
import { getSettings, prisma } from "@/lib/prisma";
import {
  deadlineInfo,
  formatDateTime,
  formatMoney,
  orderStatusLabel,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const settings = await getSettings();
  const current = tab || "all";

  const where =
    current === "digital"
      ? { isDigital: true }
      : current === "processing"
        ? { status: "PROCESSING" }
        : current === "pending-codes"
          ? {
              isDigital: true,
              digitalDelivered: false,
              status: "PROCESSING",
            }
          : {};

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { creationDate: "desc" },
      include: { items: true },
      take: 100,
    }),
    Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PROCESSING" } }),
      prisma.order.count({ where: { isDigital: true } }),
      prisma.order.count({
        where: {
          isDigital: true,
          digitalDelivered: false,
          status: "PROCESSING",
        },
      }),
    ]),
  ]);

  const tabs = [
    { id: "all", label: "Все", count: counts[0] },
    { id: "processing", label: "В обработке", count: counts[1] },
    { id: "digital", label: "Цифровые", count: counts[2] },
    { id: "pending-codes", label: "Ждут кодов", count: counts[3] },
  ];

  return (
    <div>
      <AppHeader active="/orders" />
      <PageShell
        title="Заказы"
        description={
          settings.lastOrdersSync
            ? `Последняя синхронизация: ${formatDateTime(settings.lastOrdersSync)}`
            : "Заказы подтягиваются из API и сохраняются в базе"
        }
        actions={
          <>
            <ActionButton
              label="Выдать ожидающие коды"
              endpoint="/api/sync/deliver"
              variant="secondary"
            />
            <ActionButton
              label="Синхронизировать"
              endpoint="/api/sync/orders"
              variant="primary"
            />
          </>
        }
        tabs={
          <div className="flex flex-wrap gap-1 border-b border-[var(--border)]">
            {tabs.map((t) => {
              const active = current === t.id;
              return (
                <Link
                  key={t.id}
                  href={t.id === "all" ? "/orders" : `/orders?tab=${t.id}`}
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
        }
      >
        <Panel className="fade-in">
          {orders.length === 0 ? (
            <EmptyState
              title="Заказов нет"
              description="Синхронизируйте заказы из Яндекс Маркета."
            />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Заказ</th>
                    <th>Покупатель</th>
                    <th>Состав</th>
                    <th>Статус</th>
                    <th>Коды</th>
                    <th>Сумма</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const deadline = deadlineInfo(
                      order.processingDeadline,
                      order.digitalDelivered,
                    );
                    return (
                      <tr key={order.id}>
                        <td>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium text-[var(--link)] hover:underline"
                          >
                            № {order.marketOrderId}
                          </Link>
                          {order.isDigital ? (
                            <div className="mt-1">
                              <StatusBadge tone="info">DIGITAL</StatusBadge>
                            </div>
                          ) : null}
                        </td>
                        <td>{order.buyerName || "—"}</td>
                        <td>
                          <div className="max-w-xs space-y-1">
                            {order.items.slice(0, 2).map((item) => (
                              <div key={item.id} className="leading-snug">
                                {item.name}
                                <span className="text-[var(--muted)]">
                                  {" "}
                                  × {item.count}
                                </span>
                              </div>
                            ))}
                            {order.items.length > 2 ? (
                              <div className="text-xs text-[var(--muted)]">
                                ещё {order.items.length - 2}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <StatusBadge
                            tone={
                              order.status === "DELIVERED"
                                ? "ok"
                                : order.status === "PROCESSING"
                                  ? "warn"
                                  : order.status === "CANCELLED"
                                    ? "danger"
                                    : "default"
                            }
                          >
                            {orderStatusLabel(order.status)}
                          </StatusBadge>
                        </td>
                        <td>
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
                          ) : (
                            "—"
                          )}
                          {order.deliveryError ? (
                            <div className="mt-1 max-w-[180px] text-xs text-[#c62828]">
                              {order.deliveryError}
                            </div>
                          ) : null}
                        </td>
                        <td>{formatMoney(order.totalPrice)}</td>
                        <td>{formatDateTime(order.creationDate)}</td>
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

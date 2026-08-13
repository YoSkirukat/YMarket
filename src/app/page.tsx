import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader, PageShell, Panel, StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";
import { getSettings, prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney, orderStatusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();
  if (!settings.apiKey) {
    redirect("/settings");
  }

  const [products, digital, codesAvailable, orders, pending, recentOrders] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isDigital: true } }),
      prisma.activationCode.count({ where: { status: "available" } }),
      prisma.order.count(),
      prisma.order.count({
        where: {
          isDigital: true,
          digitalDelivered: false,
          status: "PROCESSING",
        },
      }),
      prisma.order.findMany({
        orderBy: { creationDate: "desc" },
        take: 5,
        include: { items: true },
      }),
    ]);

  return (
    <div>
      <AppHeader active="/" />
      <PageShell
        title="Обзор"
        description="Управление цифровыми товарами и выдача ключей активации через API Яндекс Маркета"
        actions={
          <>
            <ActionButton
              label="Синхронизировать товары"
              endpoint="/api/sync/products"
              variant="secondary"
            />
            <ActionButton
              label="Синхронизировать заказы"
              endpoint="/api/sync/orders"
              variant="primary"
            />
          </>
        }
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 fade-in">
          {[
            { label: "Товары", value: products, href: "/products" },
            { label: "Электронные", value: digital, href: "/digital" },
            { label: "Кодов в наличии", value: codesAvailable, href: "/digital" },
            { label: "Ждут выдачи", value: pending, href: "/orders" },
          ].map((card) => (
            <Link key={card.label} href={card.href}>
              <Panel className="px-4 py-4 transition hover:border-[#d5d9e0]">
                <div className="text-xs text-[var(--muted)]">{card.label}</div>
                <div className="mt-1 text-2xl font-semibold">{card.value}</div>
              </Panel>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Panel className="fade-in">
            <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-medium">
              Последние заказы
            </div>
            {recentOrders.length === 0 ? (
              <div className="px-4 py-10 text-sm text-[var(--muted)]">
                Заказов пока нет. Нажмите «Синхронизировать заказы».
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Заказ</th>
                      <th>Статус</th>
                      <th>Сумма</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
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
                              <StatusBadge tone="info">Цифровой</StatusBadge>
                            </div>
                          ) : null}
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
                        <td>{formatMoney(order.totalPrice)}</td>
                        <td>{formatDateTime(order.creationDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel className="fade-in px-4 py-4">
            <div className="text-sm font-medium">Быстрый старт</div>
            <ol className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>1. Сохраните API-Key в настройках</li>
              <li>2. Подставьте Campaign / Business ID</li>
              <li>3. Синхронизируйте товары</li>
              <li>4. Добавьте коды в «Электронные товары»</li>
              <li>5. Синхронизируйте заказы — коды уйдут за 30 минут</li>
            </ol>
            <div className="mt-4 text-xs text-[var(--muted)]">
              Всего заказов в базе: {orders}
              {settings.lastOrdersSync
                ? ` · синхронизация ${formatDateTime(settings.lastOrdersSync)}`
                : ""}
            </div>
          </Panel>
        </div>
      </PageShell>
    </div>
  );
}

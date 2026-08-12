import { AppHeader, PageShell, Panel } from "@/components/ui";
import { SettingsForm } from "@/components/SettingsForm";
import { SyncLogList } from "@/components/SyncLogList";
import { getSettings, prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, logs] = await Promise.all([
    getSettings(),
    prisma.syncLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div>
      <AppHeader active="/settings" />
      <PageShell
        title="Настройки"
        description="API-ключ Яндекс Маркета и параметры выдачи цифровых товаров"
      >
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Panel className="fade-in px-4 py-4">
            <SettingsForm
              initial={{
                apiKey: settings.apiKey,
                campaignId: settings.campaignId,
                businessId: settings.businessId,
                warehouseId: settings.warehouseId,
                shopName: settings.shopName,
                activateTill: settings.activateTill,
                slipText: settings.slipText,
                autoDeliver: settings.autoDeliver,
                webhookSecret: settings.webhookSecret,
              }}
            />
          </Panel>

          <Panel className="fade-in flex max-h-[520px] flex-col px-4 py-4">
            <div className="text-sm font-medium">Журнал синхронизации</div>
            <div className="mt-1 text-xs text-[var(--muted)]">
              Товары: {formatDateTime(settings.lastProductsSync)} · Заказы:{" "}
              {formatDateTime(settings.lastOrdersSync)} · Остатки:{" "}
              {formatDateTime(settings.lastStocksSync)}
            </div>
            <div className="mt-4 min-h-0 flex-1 overflow-hidden">
              <SyncLogList logs={logs} />
            </div>
          </Panel>
        </div>
      </PageShell>
    </div>
  );
}

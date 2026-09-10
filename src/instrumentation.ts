/**
 * Next.js вызывает register() один раз при старте серверного процесса.
 *
 * Раньше заказы обрабатывались только по вебхуку от Маркета: если вебхук не
 * настроен (или уведомление не дошло), коды не отправлялись, а статус заказа
 * «зависал» — например «В доставке» вместо «Доставлен» — до ручного нажатия
 * «Синхронизировать». Держим фоновую автосинхронизацию, чтобы выдача кодов и
 * обновление статуса работали без участия человека.
 *
 * Интервал задаётся переменной окружения AUTO_SYNC_INTERVAL_MS (0 — выключить).
 */
const STARTED_FLAG = "__ymarket_auto_sync_started__";

export async function register() {
  // Только серверный Node-рантайм и не на этапе сборки.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const store = globalThis as unknown as Record<string, boolean | undefined>;
  if (store[STARTED_FLAG]) return;
  store[STARTED_FLAG] = true;

  const raw = process.env.AUTO_SYNC_INTERVAL_MS;
  const intervalMs = raw === undefined ? 60_000 : Number(raw);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    console.log(
      "[auto-sync] Автосинхронизация заказов отключена (AUTO_SYNC_INTERVAL_MS=0)",
    );
    return;
  }

  const { syncOrders } = await import("./lib/sync");

  let running = false;
  const tick = async () => {
    // Пропускаем тик, если предыдущая синхронизация ещё не завершилась.
    if (running) return;
    running = true;
    try {
      await syncOrders({ quiet: true });
    } catch {
      // Нет API-ключа или временная ошибка сети — ждём следующего тика.
    } finally {
      running = false;
    }
  };

  const first = setTimeout(tick, 5_000);
  const timer = setInterval(tick, intervalMs);
  // Таймеры не должны удерживать процесс живым сами по себе.
  (first as unknown as { unref?: () => void }).unref?.();
  (timer as unknown as { unref?: () => void }).unref?.();

  console.log(
    `[auto-sync] Автосинхронизация заказов включена: каждые ${Math.round(
      intervalMs / 1000,
    )} с`,
  );
}

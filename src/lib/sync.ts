import { addMinutes, parseISO } from "date-fns";
import { prisma, getSettings } from "@/lib/prisma";
import {
  deliverDigitalGoods,
  getBusinessOrders,
  getCampaignOffers,
  getCampaignOrders,
  getCampaigns,
  getOfferMappings,
  getCampaignStocks,
  getBusinessWarehouseStocks,
  getPartnerWarehouses,
  updateCampaignStocks,
  updateBusinessWarehouseStocks,
  pickStockCount,
  isDigitalOffer,
  isDigitalOrder,
  buyerDisplayName,
  marketOrderId,
  orderTotal,
  itemPrice,
  type YMOrder,
  type YMOfferMappingOffer,
} from "@/lib/yandex-market";

async function log(
  type: string,
  message: string,
  level: "info" | "warn" | "error" = "info",
  meta?: unknown,
) {
  const compact = message
    .trim()
    .split(/\r?\n/)[0]
    ?.replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

  await prisma.syncLog.create({
    data: {
      type,
      message: compact || message.slice(0, 300),
      level,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}

function parseOrderDate(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.includes("T")
    ? value
    : value.replace(
        /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/,
        "$3-$2-$1T$4:$5:$6",
      );
  try {
    const d = parseISO(normalized);
    return Number.isNaN(d.getTime()) ? new Date(value) : d;
  } catch {
    return null;
  }
}

function offerPrice(offer: YMOfferMappingOffer): number | null {
  return offer.basicPrice?.value ?? null;
}

export async function syncProducts() {
  const settings = await getSettings();
  if (!settings.apiKey) {
    throw new Error("Укажите API-ключ в настройках");
  }

  let synced = 0;
  let digital = 0;

  if (settings.businessId) {
    let pageToken: string | undefined;
    do {
      const res = await getOfferMappings(
        settings.apiKey,
        settings.businessId,
        pageToken,
      );

      for (const row of res.offerMappings ?? []) {
        const offer = row.offer;
        if (!offer?.offerId) continue;

        const digitalFlag = isDigitalOffer(offer);
        if (digitalFlag) digital += 1;

        await prisma.product.upsert({
          where: { offerId: offer.offerId },
          create: {
            offerId: offer.offerId,
            name: offer.name || row.mapping?.marketSkuName || offer.offerId,
            vendor: offer.vendor ?? null,
            category:
              offer.category || row.mapping?.marketCategoryName || null,
            barcode: offer.barcodes?.[0] ?? null,
            price: offerPrice(offer),
            currency: offer.basicPrice?.currencyId ?? "RUR",
            pictureUrl: offer.pictures?.[0] ?? null,
            description: offer.description ?? null,
            isDigital: digitalFlag,
            marketStatus: null,
            rawJson: JSON.stringify(row),
          },
          update: {
            name: offer.name || row.mapping?.marketSkuName || offer.offerId,
            vendor: offer.vendor ?? null,
            category:
              offer.category || row.mapping?.marketCategoryName || null,
            barcode: offer.barcodes?.[0] ?? null,
            price: offerPrice(offer),
            currency: offer.basicPrice?.currencyId ?? "RUR",
            pictureUrl: offer.pictures?.[0] ?? null,
            description: offer.description ?? null,
            isDigital: digitalFlag,
            rawJson: JSON.stringify(row),
          },
        });
        synced += 1;
      }

      pageToken = res.paging?.nextPageToken;
    } while (pageToken);
  } else if (settings.campaignId) {
    let pageToken: string | undefined;
    do {
      const res = await getCampaignOffers(
        settings.apiKey,
        settings.campaignId,
        pageToken,
      );

      for (const offer of res.offers ?? []) {
        if (!offer.offerId) continue;
        await prisma.product.upsert({
          where: { offerId: offer.offerId },
          create: {
            offerId: offer.offerId,
            name: offer.offerId,
            price: offer.campaignPrice?.value ?? offer.basicPrice?.value ?? null,
            currency:
              offer.campaignPrice?.currencyId ??
              offer.basicPrice?.currencyId ??
              "RUR",
            isDigital: false,
            marketStatus: offer.status ?? null,
            rawJson: JSON.stringify(offer),
          },
          update: {
            price: offer.campaignPrice?.value ?? offer.basicPrice?.value ?? null,
            currency:
              offer.campaignPrice?.currencyId ??
              offer.basicPrice?.currencyId ??
              "RUR",
            marketStatus: offer.status ?? null,
            rawJson: JSON.stringify(offer),
          },
        });
        synced += 1;
      }

      pageToken = res.paging?.nextPageToken;
    } while (pageToken);
  } else {
    throw new Error("Укажите Business ID или Campaign ID в настройках");
  }

  await prisma.settings.update({
    where: { id: 1 },
    data: { lastProductsSync: new Date() },
  });

  await log(
    "products_sync",
    `Синхронизировано товаров: ${synced} (цифровых: ${digital})`,
  );

  let stocks = { updated: 0 };
  try {
    stocks = await syncStocksFromMarket();
  } catch (err) {
    await log(
      "stocks_sync",
      `Товары синхронизированы, но остатки не загружены: ${
        err instanceof Error ? err.message : String(err)
      }`,
      "warn",
    );
  }

  return { synced, digital, stocks };
}

async function upsertOrderFromYm(order: YMOrder, campaignId?: string | null) {
  const id = marketOrderId(order);
  if (!id) return null;

  const creationDate = parseOrderDate(order.creationDate);
  const digital = isDigitalOrder(order);
  const existing = await prisma.order.findUnique({
    where: { marketOrderId: id },
  });

  // Дедлайн 30 минут отсчитываем с момента первого появления статуса PROCESSING
  let processingDeadline = existing?.processingDeadline ?? null;
  if (digital && order.status === "PROCESSING" && !processingDeadline) {
    processingDeadline = addMinutes(new Date(), 30);
  }

  const dbOrder = await prisma.order.upsert({
    where: { marketOrderId: id },
    create: {
      marketOrderId: id,
      campaignId:
        campaignId ||
        (order.campaignId ? String(order.campaignId) : null),
      status: order.status,
      substatus: order.substatus ?? null,
      deliveryType: order.delivery?.type ?? null,
      isDigital: digital,
      buyerName: buyerDisplayName(order),
      totalPrice: orderTotal(order),
      currency: order.prices?.payment?.currencyId ?? order.currency ?? "RUR",
      creationDate,
      processingDeadline:
        digital && order.status === "PROCESSING"
          ? addMinutes(new Date(), 30)
          : null,
      rawJson: JSON.stringify(order),
    },
    update: {
      campaignId:
        campaignId ||
        (order.campaignId ? String(order.campaignId) : undefined),
      status: order.status,
      substatus: order.substatus ?? null,
      deliveryType: order.delivery?.type ?? null,
      isDigital: digital,
      buyerName: buyerDisplayName(order),
      totalPrice: orderTotal(order),
      currency: order.prices?.payment?.currencyId ?? order.currency ?? "RUR",
      creationDate: creationDate ?? undefined,
      processingDeadline: processingDeadline ?? undefined,
      rawJson: JSON.stringify(order),
    },
  });

  if (order.items?.length) {
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: dbOrder.id } });

      for (const item of order.items ?? []) {
        const product = item.offerId
          ? await tx.product.findUnique({ where: { offerId: item.offerId } })
          : null;

        await tx.orderItem.create({
          data: {
            orderId: dbOrder.id,
            productId: product?.id ?? null,
            marketItemId: item.id,
            offerId: item.offerId ?? item.shopSku ?? null,
            name: item.offerName || item.offerId || `Товар #${item.id}`,
            count: item.count,
            price: itemPrice(item),
            subsidy: item.prices?.subsidy?.value ?? item.subsidy ?? null,
            vat: item.vat ?? null,
          },
        });

        if (product && !product.isDigital && digital) {
          await tx.product.update({
            where: { id: product.id },
            data: { isDigital: true },
          });
        }
      }
    });
  }

  return dbOrder;
}

/**
 * Не даём двум одновременным синхронизациям (вебхук + вебхук, вебхук + кнопка
 * «Синхронизировать», вебхук + внешний крон) гонять upsertOrderFromYm по одному
 * и тому же заказу параллельно: там сначала удаляются все OrderItem, а потом
 * создаются заново, и без сериализации второй вызов успевает вставить свои
 * строки поверх уже вставленных первым — заказ задваивается в составе.
 */
let pendingOrderSyncQueue: Promise<unknown> = Promise.resolve();

export async function syncOrders() {
  const run = () => syncOrdersUnlocked();
  const next = pendingOrderSyncQueue.then(run, run);
  pendingOrderSyncQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function syncOrdersUnlocked() {
  const settings = await getSettings();
  if (!settings.apiKey) {
    throw new Error("Укажите API-ключ в настройках");
  }

  let synced = 0;

  if (settings.businessId) {
    let pageToken: string | undefined;
    do {
      const res = await getBusinessOrders(
        settings.apiKey,
        settings.businessId,
        pageToken,
      );
      for (const order of res.orders ?? []) {
        await upsertOrderFromYm(order, settings.campaignId || null);
        synced += 1;
      }
      pageToken = res.paging?.nextPageToken;
    } while (pageToken);
  } else if (settings.campaignId) {
    let pageToken: string | undefined;
    do {
      const res = await getCampaignOrders(
        settings.apiKey,
        settings.campaignId,
        pageToken,
      );
      for (const order of res.orders ?? []) {
        await upsertOrderFromYm(order, settings.campaignId);
        synced += 1;
      }
      pageToken = res.paging?.nextPageToken;
    } while (pageToken);
  } else {
    throw new Error("Укажите Business ID или Campaign ID в настройках");
  }

  await prisma.settings.update({
    where: { id: 1 },
    data: { lastOrdersSync: new Date() },
  });

  await log("orders_sync", `Синхронизировано заказов: ${synced}`);

  const delivered = settings.autoDeliver
    ? await processPendingDigitalOrders()
    : { processed: 0, failed: 0, skipped: 0 };

  return { synced, delivered };
}

export async function verifyAndFillCampaignIds() {
  const settings = await getSettings();
  if (!settings.apiKey) throw new Error("API-ключ не задан");

  const res = await getCampaigns(settings.apiKey);
  const campaign = res.campaigns?.[0];
  if (!campaign) throw new Error("Кампании не найдены для этого API-ключа");

  const data = {
    campaignId: settings.campaignId || String(campaign.id),
    businessId:
      settings.businessId ||
      (campaign.business?.id ? String(campaign.business.id) : ""),
    shopName:
      settings.shopName ||
      campaign.business?.name ||
      campaign.domain ||
      "",
  };

  let warehouseId = settings.warehouseId;
  const businessId = data.businessId;
  if (businessId && !warehouseId) {
    try {
      const wh = await getPartnerWarehouses(settings.apiKey, businessId);
      const first = wh.warehouses?.[0];
      if (first?.id) warehouseId = String(first.id);
    } catch {
      // группы складов — warehouse через campaign stocks
    }
  }

  await prisma.settings.update({
    where: { id: 1 },
    data: { ...data, warehouseId: warehouseId || "" },
  });
  return { ...data, warehouseId };
}

/** Не даём двум вебхукам одновременно выдать коды по одним и тем же заказам. */
let pendingDeliveryQueue: Promise<unknown> = Promise.resolve();

export async function processPendingDigitalOrders() {
  const run = () => processPendingDigitalOrdersUnlocked();
  const next = pendingDeliveryQueue.then(run, run);
  pendingDeliveryQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/**
 * Освобождает коды, которые остались в статусе "reserved" на заказе, который
 * так и не был доставлен (digitalDelivered=false), и не менялись дольше
 * STALE_RESERVATION_MS. Такие коды — следствие прерванной/раздублированной
 * попытки резервирования (см. deliverSingleOrder) и иначе зависают навсегда.
 */
const STALE_RESERVATION_MS = 10 * 60 * 1000;

async function releaseStaleReservedCodes() {
  const staleBefore = new Date(Date.now() - STALE_RESERVATION_MS);

  const stale = await prisma.activationCode.findMany({
    where: {
      status: "reserved",
      updatedAt: { lt: staleBefore },
      order: { digitalDelivered: false },
    },
    select: { id: true, productId: true },
  });

  if (!stale.length) return;

  await prisma.activationCode.updateMany({
    where: { id: { in: stale.map((c) => c.id) } },
    data: { status: "available", orderId: null },
  });

  await log(
    "digital_deliver",
    `Освобождены зависшие в резерве коды: ${stale.length}`,
    "warn",
  );

  const productIds = new Set(stale.map((c) => c.productId));
  for (const productId of productIds) {
    await syncDigitalProductStock(productId);
  }
}

async function processPendingDigitalOrdersUnlocked() {
  const settings = await getSettings();
  if (!settings.apiKey || !settings.campaignId) {
    return { processed: 0, failed: 0, skipped: 0 };
  }

  await releaseStaleReservedCodes();

  const pending = await prisma.order.findMany({
    where: {
      isDigital: true,
      digitalDelivered: false,
      status: { in: ["PROCESSING", "PENDING", "UNPAID", "PLACING"] },
    },
    include: { items: true },
    orderBy: { creationDate: "asc" },
  });

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const order of pending) {
    if (order.status !== "PROCESSING") {
      skipped += 1;
      continue;
    }

    try {
      await deliverSingleOrder(order.id);
      processed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message === "Коды уже переданы" ||
        message === "Коды уже выдаются по этому заказу"
      ) {
        processed += 1;
        continue;
      }
      failed += 1;
      await prisma.order.update({
        where: { id: order.id },
        data: { deliveryError: message },
      });
      await log(
        "digital_deliver",
        `Ошибка по заказу №${order.marketOrderId}: ${message}`,
        "error",
      );
    }
  }

  return { processed, failed, skipped };
}

/** Для цифрового товара остаток = число доступных кодов. */
export async function syncDigitalProductStock(
  productId: string,
  options?: { push?: boolean },
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return null;

  const available = await prisma.activationCode.count({
    where: { productId, status: "available" },
  });

  const changed = product.stock !== available;
  if (changed) {
    await prisma.product.update({
      where: { id: productId },
      data: { stock: available, isDigital: true },
    });
  }

  if (changed && options?.push !== false) {
    try {
      await pushStockToMarket(product.offerId, available);
    } catch (err) {
      await log(
        "stocks_push",
        `Не удалось обновить остаток ${product.offerId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        "warn",
      );
    }
  }

  return { stock: available, offerId: product.offerId };
}

async function deliverSingleOrder(orderId: string) {
  const settings = await getSettings();
  if (!settings.apiKey || !settings.campaignId) {
    throw new Error("Укажите API-ключ и Campaign ID");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Заказ не найден");
  if (order.digitalDelivered) throw new Error("Коды уже переданы");
  if (!order.isDigital) throw new Error("Заказ не является цифровым");

  const payloadItems: Array<{
    id: number;
    codes: string[];
    slip?: string;
    activate_till: string;
  }> = [];
  const allocatedCodeIds: string[] = [];

  for (const item of order.items) {
    if (!item.marketItemId) {
      throw new Error(
        `У позиции «${item.name}» нет marketItemId — синхронизируйте заказы`,
      );
    }

    const product = item.offerId
      ? await prisma.product.findUnique({ where: { offerId: item.offerId } })
      : item.productId
        ? await prisma.product.findUnique({ where: { id: item.productId } })
        : null;

    if (!product) {
      throw new Error(
        `Товар ${item.offerId ?? item.name} не найден в базе. Добавьте его и коды.`,
      );
    }

    const codes = await prisma.activationCode.findMany({
      where: { productId: product.id, status: "available" },
      take: item.count,
      orderBy: { createdAt: "asc" },
    });

    if (codes.length < item.count) {
      throw new Error(
        `Недостаточно кодов для «${product.name}»: нужно ${item.count}, доступно ${codes.length}`,
      );
    }

    allocatedCodeIds.push(...codes.map((c) => c.id));
    payloadItems.push({
      id: item.marketItemId,
      codes: codes.map((c) => c.code),
      slip: product.slipText.trim() || settings.slipText.trim() || undefined,
      activate_till: settings.activateTill || "2099-12-31",
    });
  }

  if (!payloadItems.length) {
    throw new Error("В заказе нет позиций для выдачи");
  }

  const reserved = await prisma.activationCode.updateMany({
    where: { id: { in: allocatedCodeIds }, status: "available" },
    data: { status: "reserved", orderId: order.id },
  });

  if (reserved.count !== allocatedCodeIds.length) {
    // Часть кодов успела зарезервировать параллельная попытка (вебхук/крон/ручная
    // кнопка) — откатываем то, что зарезервировали именно этим вызовом, чтобы
    // коды не зависали в резерве без доставки.
    await prisma.activationCode.updateMany({
      where: {
        id: { in: allocatedCodeIds },
        status: "reserved",
        orderId: order.id,
      },
      data: { status: "available", orderId: null },
    });
    throw new Error("Коды уже выдаются по этому заказу");
  }

  try {
    await deliverDigitalGoods(
      settings.apiKey,
      order.campaignId || settings.campaignId,
      order.marketOrderId,
      payloadItems,
    );
  } catch (err) {
    await prisma.activationCode.updateMany({
      where: { id: { in: allocatedCodeIds }, status: "reserved" },
      data: { status: "available", orderId: null },
    });
    throw err;
  }

  const claimed = await prisma.order.updateMany({
    where: { id: order.id, digitalDelivered: false },
    data: {
      digitalDelivered: true,
      digitalDeliveredAt: new Date(),
      deliveryError: null,
    },
  });

  await prisma.activationCode.updateMany({
    where: { id: { in: allocatedCodeIds } },
    data: {
      status: "sold",
      orderId: order.id,
      soldAt: new Date(),
    },
  });

  const productIds = new Set<string>();
  for (const item of order.items) {
    const product = item.offerId
      ? await prisma.product.findUnique({ where: { offerId: item.offerId } })
      : item.productId
        ? await prisma.product.findUnique({ where: { id: item.productId } })
        : null;
    if (product) productIds.add(product.id);
  }

  for (const productId of productIds) {
    await syncDigitalProductStock(productId);
  }

  if (claimed.count > 0) {
    await log(
      "digital_deliver",
      `Переданы коды по заказу №${order.marketOrderId}`,
      "info",
      { orderId: order.marketOrderId, codes: allocatedCodeIds.length },
    );
  }

  return prisma.order.findUnique({ where: { id: orderId } });
}

export async function deliverOrderById(orderId: string) {
  try {
    // Идём через ту же очередь, что и автоматическая обработка (вебхук/крон),
    // чтобы ручная кнопка не резервировала коды параллельно с фоновым запуском
    // по этому же заказу.
    const run = () => deliverSingleOrder(orderId);
    const next = pendingDeliveryQueue.then(run, run);
    pendingDeliveryQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return await next;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message === "Коды уже переданы" ||
      message === "Коды уже выдаются по этому заказу"
    ) {
      return prisma.order.findUnique({ where: { id: orderId } });
    }
    await prisma.order.update({
      where: { id: orderId },
      data: { deliveryError: message },
    });
    await log("digital_deliver", `Ошибка по заказу: ${message}`, "error");
    throw err;
  }
}

/** Загрузить остатки из Яндекс Маркета в локальную БД */
export async function syncStocksFromMarket() {
  const settings = await getSettings();
  if (!settings.apiKey) throw new Error("Укажите API-ключ в настройках");

  const stockMap = new Map<string, number>();

  // 1) Остатки через campaign API (группы складов / DBS+FBS)
  if (settings.campaignId) {
    try {
      let pageToken: string | undefined;
      do {
        const res = await getCampaignStocks(
          settings.apiKey,
          settings.campaignId,
          pageToken,
        );
        for (const wh of res.warehouses ?? []) {
          if (!settings.warehouseId && wh.warehouseId) {
            try {
              await prisma.settings.update({
                where: { id: 1 },
                data: { warehouseId: String(wh.warehouseId) },
              });
              settings.warehouseId = String(wh.warehouseId);
            } catch {
              // поле может быть недоступно до перезапуска — не валим всю синхронизацию
            }
          }
          for (const offer of wh.offers ?? []) {
            if (!offer.offerId) continue;
            const count = pickStockCount(offer.stocks);
            stockMap.set(
              offer.offerId,
              Math.max(stockMap.get(offer.offerId) ?? 0, count),
            );
          }
        }
        pageToken = res.paging?.nextPageToken;
      } while (pageToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Не пишем stack Prisma в журнал — только краткую причину
      const short =
        msg.includes("Unknown argument")
          ? "Нужен перезапуск сервера (устарел Prisma Client). Выполните: остановите npm run dev и запустите снова."
          : msg.split("\n")[0].slice(0, 240);
      await log("stocks_sync", `Campaign stocks: ${short}`, "warn");
    }
  }

  // 2) Остатки через business + partner warehouse (если campaign пуст)
  if (stockMap.size === 0 && settings.businessId) {
    let warehouseId = settings.warehouseId
      ? Number(settings.warehouseId)
      : 0;

    if (!warehouseId) {
      const wh = await getPartnerWarehouses(settings.apiKey, settings.businessId);
      const first = wh.warehouses?.[0];
      if (!first?.id) {
        throw new Error(
          "Не найден склад партнёра. Укажите Warehouse ID в настройках.",
        );
      }
      warehouseId = first.id;
      await prisma.settings.update({
        where: { id: 1 },
        data: { warehouseId: String(warehouseId) },
      });
    }

    let pageToken: string | undefined;
    do {
      const res = await getBusinessWarehouseStocks(
        settings.apiKey,
        settings.businessId,
        warehouseId,
        pageToken,
      );
      for (const offer of res.offers ?? []) {
        if (!offer.offerId) continue;
        stockMap.set(offer.offerId, pickStockCount(offer.stocks));
      }
      pageToken = res.paging?.nextPageToken;
    } while (pageToken);
  }

  let updated = 0;
  for (const [offerId, count] of stockMap) {
    const product = await prisma.product.findUnique({
      where: { offerId },
      include: { _count: { select: { codes: true } } },
    });
    if (!product) continue;

    // Цифровые товары: источник остатка — доступные коды, а не Маркет.
    // Иначе заказ на Маркете уменьшает склад, а локальная выдача списывает ещё раз.
    if (product.isDigital || product._count.codes > 0) {
      await syncDigitalProductStock(product.id, { push: false });
      updated += 1;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { stock: count },
    });
    updated += 1;
  }

  await prisma.settings.update({
    where: { id: 1 },
    data: { lastStocksSync: new Date() },
  });

  await log("stocks_sync", `Загружено остатков из Маркета: ${updated}`);
  return { updated };
}

/** Отправить один остаток в Яндекс Маркет */
export async function pushStockToMarket(offerId: string, count: number) {
  const settings = await getSettings();
  if (!settings.apiKey) throw new Error("API-ключ не задан");

  const qty = Math.max(0, Math.floor(count) || 0);

  // Сначала пробуем campaign API (группы складов)
  if (settings.campaignId) {
    try {
      await updateCampaignStocks(settings.apiKey, settings.campaignId, [
        { sku: offerId, count: qty },
      ]);
      return { ok: true, mode: "campaign" as const };
    } catch (err) {
      // fallback ниже
      if (!settings.businessId) throw err;
    }
  }

  if (!settings.businessId) {
    throw new Error("Нужен Campaign ID или Business ID для передачи остатков");
  }

  let warehouseId = settings.warehouseId ? Number(settings.warehouseId) : 0;
  if (!warehouseId) {
    const wh = await getPartnerWarehouses(settings.apiKey, settings.businessId);
    const first = wh.warehouses?.[0];
    if (!first?.id) {
      throw new Error("Не найден склад. Укажите Warehouse ID в настройках.");
    }
    warehouseId = first.id;
    await prisma.settings.update({
      where: { id: 1 },
      data: { warehouseId: String(warehouseId) },
    });
  }

  await updateBusinessWarehouseStocks(
    settings.apiKey,
    settings.businessId,
    warehouseId,
    [{ sku: offerId, count: qty }],
  );

  return { ok: true, mode: "business" as const };
}

/** Отправить все локальные остатки в Яндекс Маркет */
export async function pushAllStocksToMarket() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      offerId: true,
      stock: true,
      isDigital: true,
      _count: { select: { codes: true } },
    },
  });

  for (const p of products) {
    if (p.isDigital || p._count.codes > 0) {
      await syncDigitalProductStock(p.id, { push: false });
    }
  }

  const toPush = await prisma.product.findMany({
    select: { offerId: true, stock: true },
  });

  let pushed = 0;
  let failed = 0;
  const errors: string[] = [];

  // Батчами по 100
  const chunkSize = 100;
  for (let i = 0; i < toPush.length; i += chunkSize) {
    const chunk = toPush.slice(i, i + chunkSize);
    try {
      const settings = await getSettings();
      if (!settings.apiKey) throw new Error("API-ключ не задан");

      if (settings.campaignId) {
        try {
          await updateCampaignStocks(
            settings.apiKey,
            settings.campaignId,
            chunk.map((p) => ({ sku: p.offerId, count: p.stock })),
          );
          pushed += chunk.length;
          continue;
        } catch {
          // fallback
        }
      }

      for (const p of chunk) {
        try {
          await pushStockToMarket(p.offerId, p.stock);
          pushed += 1;
        } catch (err) {
          failed += 1;
          errors.push(
            `${p.offerId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err) {
      failed += chunk.length;
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  await log(
    "stocks_push",
    `Отправлено остатков в Маркет: ${pushed}, ошибок: ${failed}`,
    failed ? "warn" : "info",
  );

  return { pushed, failed, errors: errors.slice(0, 10) };
}

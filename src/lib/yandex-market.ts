const API_BASE = "https://api.partner.market.yandex.ru";

export class YandexMarketError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "YandexMarketError";
  }
}

export type YMCampaign = {
  id: number;
  business?: { id: number; name?: string };
  domain?: string;
  placementType?: string;
};

export type YMOfferMappingOffer = {
  offerId: string;
  name?: string;
  vendor?: string;
  description?: string;
  barcodes?: string[];
  pictures?: string[];
  downloadable?: boolean;
  basicPrice?: { value?: number; currencyId?: string };
  category?: string;
  params?: Array<{ name?: string; value?: string }>;
};

export type YMOfferMapping = {
  offer?: YMOfferMappingOffer;
  mapping?: {
    marketSkuName?: string;
    marketCategoryName?: string;
  };
};

export type YMCampaignOffer = {
  offerId: string;
  available?: boolean;
  basicPrice?: { value?: number; currencyId?: string; updatedAt?: string };
  campaignPrice?: { value?: number; currencyId?: string };
  status?: string;
};

export type YMOrderItem = {
  id: number;
  offerId?: string;
  offerName?: string;
  count: number;
  price?: number;
  subsidy?: number;
  vat?: string;
  shopSku?: string;
  prices?: {
    payment?: { value?: number; currencyId?: string };
    subsidy?: { value?: number; currencyId?: string };
  };
};

export type YMOrder = {
  id?: number;
  orderId?: number;
  campaignId?: number;
  status: string;
  substatus?: string;
  creationDate?: string;
  updatedAt?: string;
  updateDate?: string;
  itemsTotal?: number;
  subsidyTotal?: number;
  totalWithDelivery?: number;
  currency?: string;
  delivery?: {
    type?: string;
    dates?: { fromDate?: string; toDate?: string };
    digitalGoods?: { type?: string };
  };
  buyer?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
  };
  prices?: {
    payment?: { value?: number; currencyId?: string };
  };
  items?: YMOrderItem[];
};

type Paging = {
  nextPageToken?: string;
};

type ApiEnvelope<T> = {
  status?: string;
  result?: T;
} & T;

function unwrapResult<T>(body: ApiEnvelope<T>): T {
  if (body && typeof body === "object" && "result" in body && body.result) {
    return body.result;
  }
  return body as T;
}

async function ymFetch<T>(
  path: string,
  apiKey: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof body === "object" &&
      body &&
      "errors" in body &&
      Array.isArray((body as { errors: { message?: string }[] }).errors)
        ? (body as { errors: { message?: string }[] }).errors
            .map((e) => e.message)
            .filter(Boolean)
            .join("; ") || `HTTP ${res.status}`
        : `Yandex Market API error: HTTP ${res.status}`;
    throw new YandexMarketError(msg, res.status, body);
  }

  return body as T;
}

export async function getCampaigns(apiKey: string) {
  const body = await ymFetch<ApiEnvelope<{ campaigns: YMCampaign[] }>>(
    "/v2/campaigns",
    apiKey,
  );
  return unwrapResult(body);
}

export async function getOfferMappings(
  apiKey: string,
  businessId: string,
  pageToken?: string,
) {
  const qs = new URLSearchParams({ limit: "100" });
  if (pageToken) qs.set("page_token", pageToken);

  const body = await ymFetch<
    ApiEnvelope<{ offerMappings?: YMOfferMapping[]; paging?: Paging }>
  >(`/v2/businesses/${businessId}/offer-mappings?${qs}`, apiKey, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return unwrapResult(body);
}

export async function getCampaignOffers(
  apiKey: string,
  campaignId: string,
  pageToken?: string,
) {
  const qs = new URLSearchParams({ limit: "100" });
  if (pageToken) qs.set("page_token", pageToken);

  const body = await ymFetch<
    ApiEnvelope<{ offers?: YMCampaignOffer[]; paging?: Paging }>
  >(`/v2/campaigns/${campaignId}/offers?${qs}`, apiKey, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return unwrapResult(body);
}

export async function getBusinessOrders(
  apiKey: string,
  businessId: string,
  pageToken?: string,
) {
  const qs = new URLSearchParams({ limit: "50" });
  if (pageToken) qs.set("page_token", pageToken);

  const body = await ymFetch<
    ApiEnvelope<{ orders?: YMOrder[]; paging?: Paging }>
  >(`/v1/businesses/${businessId}/orders?${qs}`, apiKey, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return unwrapResult(body);
}

export async function getCampaignOrders(
  apiKey: string,
  campaignId: string,
  pageToken?: string,
) {
  const qs = new URLSearchParams({ limit: "50" });
  if (pageToken) qs.set("page_token", pageToken);

  const body = await ymFetch<
    ApiEnvelope<{ orders?: YMOrder[]; paging?: Paging }>
  >(`/v2/campaigns/${campaignId}/orders?${qs}`, apiKey);
  return unwrapResult(body);
}

export async function deliverDigitalGoods(
  apiKey: string,
  campaignId: string,
  orderId: string | number,
  items: Array<{
    id: number;
    codes: string[];
    slip?: string;
    activate_till: string;
  }>,
) {
  return ymFetch<{ status?: string }>(
    `/v2/campaigns/${campaignId}/orders/${orderId}/deliverDigitalGoods`,
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({ items }),
    },
  );
}

export type YMWarehouse = {
  id: number;
  name?: string;
};

export type YMStockOffer = {
  offerId: string;
  stocks?: Array<{ type?: string; count?: number }>;
};

function pickStockCount(stocks?: Array<{ type?: string; count?: number }>) {
  if (!stocks?.length) return 0;
  const available = stocks.find((s) => s.type === "AVAILABLE");
  if (available?.count != null) return available.count;
  const fit = stocks.find((s) => s.type === "FIT");
  if (fit?.count != null) return fit.count;
  return stocks[0]?.count ?? 0;
}

export async function getPartnerWarehouses(apiKey: string, businessId: string) {
  const body = await ymFetch<
    ApiEnvelope<{ warehouses?: YMWarehouse[]; paging?: Paging }>
  >(`/v3/businesses/${businessId}/warehouses`, apiKey, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return unwrapResult(body);
}

/** Остатки для кабинетов с группами складов */
export async function getCampaignStocks(
  apiKey: string,
  campaignId: string,
  pageToken?: string,
) {
  const qs = new URLSearchParams({ limit: "200" });
  if (pageToken) qs.set("page_token", pageToken);

  const body = await ymFetch<
    ApiEnvelope<{
      warehouses?: Array<{
        warehouseId?: number;
        offers?: YMStockOffer[];
      }>;
      paging?: Paging;
    }>
  >(`/v2/campaigns/${campaignId}/offers/stocks?${qs}`, apiKey, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return unwrapResult(body);
}

/** Остатки на складе партнёра (без групп складов) */
export async function getBusinessWarehouseStocks(
  apiKey: string,
  businessId: string,
  partnerWarehouseId: number,
  pageToken?: string,
) {
  const qs = new URLSearchParams({ limit: "100" });
  if (pageToken) qs.set("page_token", pageToken);

  const body = await ymFetch<
    ApiEnvelope<{
      partnerWarehouseId?: number;
      offers?: YMStockOffer[];
      paging?: Paging;
    }>
  >(`/v3/businesses/${businessId}/offers/stocks?${qs}`, apiKey, {
    method: "POST",
    body: JSON.stringify({ partnerWarehouseId }),
  });
  return unwrapResult(body);
}

export async function updateCampaignStocks(
  apiKey: string,
  campaignId: string,
  skus: Array<{ sku: string; count: number }>,
) {
  const now = new Date().toISOString();
  return ymFetch<{ status?: string }>(
    `/v2/campaigns/${campaignId}/offers/stocks`,
    apiKey,
    {
      method: "PUT",
      body: JSON.stringify({
        skus: skus.map((s) => ({
          sku: s.sku,
          items: [{ count: s.count, updatedAt: now }],
        })),
      }),
    },
  );
}

export async function updateBusinessWarehouseStocks(
  apiKey: string,
  businessId: string,
  partnerWarehouseId: number,
  items: Array<{ sku: string; count: number }>,
) {
  const now = new Date().toISOString();
  return ymFetch<{ status?: string }>(
    `/v3/businesses/${businessId}/offers/stocks/update`,
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        skuItems: items.map((s) => ({
          sku: s.sku,
          partnerWarehouseId,
          count: s.count,
          updatedAt: now,
        })),
      }),
    },
  );
}

export { pickStockCount };

export function marketOrderId(order: YMOrder): string {
  return String(order.orderId ?? order.id ?? "");
}

/** Цифровой товар на Маркете — только флаг downloadable из API. */
export function isDigitalOffer(offer: YMOfferMappingOffer): boolean {
  return offer.downloadable === true;
}

export function isDigitalOrder(order: YMOrder): boolean {
  return String(order.delivery?.type ?? "").toUpperCase() === "DIGITAL";
}

export function buyerDisplayName(order: YMOrder): string | null {
  const parts = [
    order.buyer?.lastName,
    order.buyer?.firstName,
    order.buyer?.middleName,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

export function orderTotal(order: YMOrder): number | null {
  return (
    order.prices?.payment?.value ??
    order.totalWithDelivery ??
    order.itemsTotal ??
    null
  );
}

export function itemPrice(item: YMOrderItem): number | null {
  return item.prices?.payment?.value ?? item.price ?? null;
}

import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import { ru } from "date-fns/locale";

export function formatMoney(value?: number | null, currency = "₽") {
  if (value == null || Number.isNaN(value)) return "—";
  return `${new Intl.NumberFormat("ru-RU").format(value)} ${currency === "RUR" || currency === "RUB" ? "₽" : currency}`;
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd.MM.yyyy, HH:mm", { locale: ru });
}

export function formatRelative(value?: Date | string | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: ru });
}

export function orderStatusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "Ожидает оплаты",
    UNPAID: "Не оплачен",
    PLACING: "Оформляется",
    RESERVED: "Зарезервирован",
    PROCESSING: "В обработке",
    DELIVERY: "В доставке",
    PICKUP: "В пункте выдачи",
    DELIVERED: "Доставлен",
    CANCELLED: "Отменён",
    RETURNED: "Возвращён",
  };
  return map[status] ?? status;
}

export function codeStatusLabel(status: string) {
  const map: Record<string, string> = {
    available: "В наличии",
    reserved: "Зарезервирован",
    sold: "Продан",
    invalid: "Недействителен",
  };
  return map[status] ?? status;
}

export function deadlineInfo(deadline?: Date | null, delivered?: boolean) {
  if (delivered) {
    return { label: "Коды переданы", tone: "ok" as const };
  }
  if (!deadline) {
    return { label: "Нет дедлайна", tone: "muted" as const };
  }
  if (isPast(deadline)) {
    return { label: "Просрочено", tone: "danger" as const };
  }
  return {
    label: `Осталось ${formatDistanceToNowStrict(deadline, { locale: ru })}`,
    tone: "warn" as const,
  };
}

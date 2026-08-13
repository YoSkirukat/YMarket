# Digital Seller — Яндекс Маркет

MVP-сервис для продажи **электронных товаров** (ключей активации) на Яндекс Маркете через Partner API.

## Возможности

- Сохранение API-Key, Campaign ID и Business ID
- Синхронизация товаров и заказов в локальную SQLite БД
- Страница электронных товаров с остатками кодов активации
- Автоматическая передача кодов покупателю методом [`deliverDigitalGoods`](https://yandex.ru/dev/market/partner-api/doc/ru/reference/orders/provideOrderDigitalCodes) в течение 30 минут после статуса `PROCESSING`
- Webhook-эндпоинт для push-уведомлений Маркета

## Стек

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite

## Быстрый старт

```bash
npm install
npm run db:push
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) → **Настройки**.

### 1. API-ключ

В кабинете продавца: иконка аккаунта → **Настройки** → **API и модули** → создать токен.

Нужные доступы:

- `offers-and-cards-management` (или read-only) — товары
- `inventory-and-order-processing` — заказы и передача кодов

Заголовок запросов: `Api-Key: <token>`

### 2. ID магазина

Нажмите **Подставить ID из API** или укажите вручную:

- **Campaign ID** — идентификатор кампании (магазина)
- **Business ID** — идентификатор кабинета

### 3. Рабочий процесс

1. **Товары** → Синхронизировать
2. **Электронные товары** → открыть товар → добавить коды
3. **Заказы** → Синхронизировать (или настроить webhook)

При заказе со статусом `PROCESSING` и `delivery.type = DIGITAL` сервис:

1. Берёт нужное число кодов со статуса `available`
2. Вызывает `POST /v2/campaigns/{campaignId}/orders/{orderId}/deliverDigitalGoods`
3. Помечает коды как `sold`

## Webhook

В настройках Маркета укажите URL:

```text
https://your-domain/api/webhooks/yandex?secret=ВАШ_СЕКРЕТ

Маркет отправит запросы на `{этот URL}/notification`.
```

Секрет задаётся на странице **Настройки**.

Для локальной разработки можно периодически нажимать «Синхронизировать заказы» или дергать cron:

```bash
curl -X POST http://localhost:3000/api/sync/orders
```

## Важно

- Цифровые товары на Маркете работают по модели **DBS**
- Ключ нужно передать **в течение 30 минут** после перехода заказа в `PROCESSING`
- Цифровой товар в каталоге Маркета помечается флагом `downloadable: true`

## Структура

```text
src/app          — страницы и API routes
src/components   — UI
src/lib          — Prisma, клиент YM API, синхронизация
prisma           — схема БД
```

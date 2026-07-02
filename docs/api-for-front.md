# Публичное API — для сайта hytale.botcalendary.ru

Base URL: `https://adminpanel.botcalendary.ru`  
Все эндпоинты публичные (CORS открыт), аутентификация не нужна.

---

## Флоу оплаты лут-пака

```
1. Лендинг вызывает POST /api/hytale/market/packs/payment
   → adminpanel создаёт платёж в YooKassa
   ← { paymentId, confirmationUrl }

2. Лендинг сохраняет paymentId в sessionStorage
   и делает window.location.href = confirmationUrl

3. Пользователь оплачивает на странице YooKassa

4. YooKassa редиректит на returnUrl (страница лендинга)
   Лендинг читает paymentId из sessionStorage

5. Лендинг вызывает POST /api/hytale/market/packs/voucher
   → adminpanel верифицирует платёж через YooKassa API (status = succeeded)
   → фиксирует покупку в БД (hytale_loot_pack_purchases)
   ← { ok: true, code: "FVSB-PR7N-W53W" }

6. Показываем юзеру код ваучера — он вводит его в игре

7. Java-сервер вызывает POST /api/hytale/market/packs/claim (X-Market-Key)
   → проверяет код, выдаёт предметы игроку
   → помечает ваучер использованным (activated_at = NOW())
```

> **Идемпотентность**: повторный вызов `/voucher` с тем же `paymentId` всегда вернёт тот же код — безопасно вызывать несколько раз (например, при перезагрузке страницы).

> **Одноразовость**: каждый ваучер можно активировать в игре только один раз. Повторная попытка вернёт ошибку `409 Ваучер уже был активирован`.

---

## 1. Создать платёж

Вызывается при клике «Купить». Создаёт платёж в YooKassa и возвращает ссылку для редиректа.

```
POST /api/hytale/market/packs/payment
Content-Type: application/json
```

**Тело запроса:**

```json
{
  "packId": "pack_pet_utility",
  "playerUuid": "550e8400-e29b-41d4-a716-446655440000",
  "returnUrl": "https://hytale.botcalendary.ru/payment-result?packId=pack_pet_utility"
}
```

| Поле | Обязательно | Описание |
|---|---|---|
| `packId` | **да** | ID лут-пака (см. таблицу ниже) |
| `returnUrl` | **да** | URL, куда YooKassa вернёт пользователя после оплаты |
| `playerUuid` | нет | UUID игрока. Если передан — ваучер привязывается к нему |

**Ответ:**

```json
{
  "ok": true,
  "paymentId": "2e5cb1c6-000f-5000-8000-1fbde24a03de",
  "confirmationUrl": "https://yoomoney.ru/checkout/payments/v2/contract?orderId=..."
}
```

**Ошибки:**

| HTTP | Причина |
|---|---|
| 404 | Несуществующий `packId` |
| 503 | Не настроены ключи YooKassa на сервере |
| 502 | Ошибка на стороне YooKassa |

**Пример:**

```typescript
// При клике «Купить»
const packId = 'pack_pet_utility'
const playerUuid = '...' // UUID игрока, если известен

const res = await fetch('https://adminpanel.botcalendary.ru/api/hytale/market/packs/payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    packId,
    playerUuid,
    returnUrl: `https://hytale.botcalendary.ru/payment-result?packId=${packId}&playerUuid=${playerUuid}`,
  }),
})
const { paymentId, confirmationUrl } = await res.json()

// Сохраняем перед редиректом
sessionStorage.setItem('pendingPaymentId', paymentId)
window.location.href = confirmationUrl
```

---

## 2. Получить ваучер (после оплаты)

Вызывается на странице `returnUrl` после редиректа с YooKassa. Верифицирует платёж на стороне сервера и выдаёт код.

```
POST /api/hytale/market/packs/voucher
Content-Type: application/json
```

**Тело запроса:**

```json
{
  "paymentId": "2e5cb1c6-000f-5000-8000-1fbde24a03de",
  "packId": "pack_pet_utility",
  "playerUuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Поле | Обязательно | Описание |
|---|---|---|
| `paymentId` | **да** | ID из шага 1 (сохранён в sessionStorage) |
| `packId` | **да** | Тот же `packId` что при создании платежа |
| `playerUuid` | нет | UUID игрока (если передавался при создании) |

**Ответ:**

```json
{ "ok": true, "code": "FVSB-PR7N-W53W" }
```

**Ошибки:**

| HTTP | Причина |
|---|---|
| 402 | Платёж не найден в YooKassa или статус не `succeeded` |
| 403 | `packId` или `playerUuid` не совпадает с данными платежа |
| 404 | Несуществующий `packId` |

**Пример (страница payment-result):**

```typescript
// Читаем параметры из URL и sessionStorage
const params = new URLSearchParams(window.location.search)
const packId = params.get('packId')!
const playerUuid = params.get('playerUuid') ?? undefined
const paymentId = sessionStorage.getItem('pendingPaymentId')!

const res = await fetch('https://adminpanel.botcalendary.ru/api/hytale/market/packs/voucher', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paymentId, packId, playerUuid }),
})
const { ok, code, error } = await res.json()

if (ok) {
  sessionStorage.removeItem('pendingPaymentId')
  // показать код пользователю
}
```

---

## Доступные лут-паки

| `packId` | Название | Цена |
|---|---|---|
| `pack_pet_utility` | Набор питомца | 499 ₽ |
| `pack_iron_adventurer` | Набор авантюриста | 599 ₽ |
| `pack_alchemist_premium` | Набор алхимика | 449 ₽ |
| `pack_builder_premium` | Набор строителя | 499 ₽ |
| `pack_royal_decor` | Набор декора | 899 ₽ |

> Цены хранятся в БД (таблица `hytale_market_loot_pack_prices`) и могут меняться без передеплоя.

---

## 3. Игроки онлайн

```
GET /api/hytale/analytics?server=prod
```

Не кешировать. Рекомендуемый интервал поллинга — 30 с.

**Ответ:**

```json
{
  "ok": true,
  "onlinePlayers": 12,
  "registeredPlayers": 347
}
```

| Поле | Описание |
|---|---|
| `onlinePlayers` | Игроков онлайн прямо сейчас. `null` если сервер недоступен |
| `registeredPlayers` | Всего зарегистрированных игроков |

**React-хук:**

```typescript
function useServerStats(intervalMs = 30_000) {
  const [stats, setStats] = useState<{ online: number | null; registered: number | null }>({
    online: null, registered: null,
  })
  useEffect(() => {
    let active = true
    const tick = async () => {
      try {
        const data = await fetch('https://adminpanel.botcalendary.ru/api/hytale/analytics?server=prod',
          { cache: 'no-store' }).then(r => r.json())
        if (active && data.ok) setStats({ online: data.onlinePlayers, registered: data.registeredPlayers })
      } catch {}
    }
    tick()
    const id = setInterval(tick, intervalMs)
    return () => { active = false; clearInterval(id) }
  }, [intervalMs])
  return stats
}
```

---

## 4. Список постов

```
GET /api/posts?limit=20&offset=0
```

Возвращает только опубликованные посты — без контента, только мета.

| Параметр | Default | Описание |
|---|---|---|
| `limit` | 20 | Кол-во постов (макс 100) |
| `offset` | 0 | Смещение для пагинации |

**Ответ:**

```json
{
  "ok": true,
  "total": 42,
  "limit": 20,
  "offset": 0,
  "rows": [
    {
      "id": 7,
      "title": "Обновление сервера",
      "preview_url": "/api/uploads/posts/abc123.png",
      "created_at": "2026-06-24T21:00:00Z"
    }
  ]
}
```

`preview_url` — относительный путь, добавляй `https://adminpanel.botcalendary.ru` + `preview_url`.

---

## 5. Пост по ID

```
GET /api/posts/{id}
```

**Ответ:**

```json
{
  "ok": true,
  "post": {
    "id": 7,
    "title": "Обновление сервера",
    "content": "<p>Текст поста в <b>HTML</b></p>",
    "preview_url": "/api/uploads/posts/abc123.png",
    "created_by": "admin",
    "created_at": "2026-06-24T21:00:00Z",
    "updated_at": "2026-06-24T21:00:00Z"
  }
}
```

| HTTP | Причина |
|---|---|
| 404 | Пост не найден или не опубликован |

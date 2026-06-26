# Публичное API adminpanel — для сайта

Base URL: `https://adminpanel.botcalendary.ru`

---

## 1. Создать ваучер лут-пака

Вызывается браузером после редиректа с YooKassa. Ключ не нужен — платёж верифицируется через YooKassa API на стороне сервера.

```
POST /api/hytale/market/packs/voucher
Content-Type: application/json
```

```json
{
  "paymentId": "2e5cb1c6-000f-5000-8000-1fbde24a03de",
  "packId": "pack_pet_utility",
  "playerUuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Поле | Обязательно | Описание |
|---|---|---|
| `paymentId` | **да** | ID платежа из YooKassa. Повторный вызов с тем же `paymentId` вернёт тот же код. |
| `packId` | **да** | ID лут-пака (см. таблицу ниже). Сверяется с metadata платежа. |
| `playerUuid` | нет | UUID игрока. Если передан — ваучер привязывается к нему и другой активировать не сможет. |

**Доступные `packId`:**

| `packId` | Название |
|---|---|
| `pack_pet_utility` | Pet Utility Pack |
| `pack_iron_adventurer` | Iron Adventurer Pack |
| `pack_alchemist_premium` | Alchemist Premium Pack |
| `pack_builder_premium` | Builder Premium Pack |
| `pack_royal_decor` | Royal Decor Pack |

**Ответ — успех:**

```json
{ "ok": true, "code": "FVSB-PR7N-W53W" }
```

**Ошибки:**

| HTTP | Причина |
|---|---|
| 402 | Платёж не найден в YooKassa или не завершён (`succeeded`) |
| 403 | `packId` или `playerUuid` не совпадает с данными платежа |
| 404 | Несуществующий `packId` |

**Пример:**

```typescript
const res = await fetch('https://adminpanel.botcalendary.ru/api/hytale/market/packs/voucher', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paymentId, packId, playerUuid }),
});
const { ok, code, error } = await res.json();
```

---

## 2. Игроки онлайн

```
GET /api/hytale/analytics?server=prod
```

Без аутентификации. Не кешировать.

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
| `onlinePlayers` | Игроков онлайн прямо сейчас. `null` если сервер недоступен. |
| `registeredPlayers` | Всего зарегистрированных игроков. |

**Polling-хук (React):**

```typescript
function useServerStats(intervalMs = 10_000) {
  const [stats, setStats] = useState<{ onlinePlayers: number | null; registeredPlayers: number | null }>({
    onlinePlayers: null, registeredPlayers: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch('/api/hytale/analytics?server=prod', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && data.ok) setStats({ onlinePlayers: data.onlinePlayers, registeredPlayers: data.registeredPlayers });
      } catch {}
    }
    tick();
    const id = setInterval(tick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs]);

  return stats;
}
```

Рекомендуемые интервалы: лендинг — 30 с, страница сервера — 10 с.

---

## 3. Список постов

```
GET /api/posts?limit=20&offset=0
```

Без аутентификации. Возвращает только опубликованные посты — без контента, только мета для списка/превью.

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

---

## 4. Пост по ID

```
GET /api/posts/{id}
```

Возвращает полные данные конкретного поста, включая HTML-контент.

**Ответ — успех:**

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

**Ошибки:**

| HTTP | Причина |
|---|---|
| 400 | Некорректный `id` |
| 404 | Пост не найден или не опубликован |

`preview_url` — относительный путь, подставляй base URL: `https://adminpanel.botcalendary.ru` + `preview_url`.

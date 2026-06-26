# API счётчика игроков — документация для фронтенда

## Endpoint

```
GET /api/hytale/analytics
```

Без аутентификации. Кешировать нельзя — каждый запрос возвращает свежие данные.

---

## Параметры запроса

| Параметр | Тип | По умолчанию | Описание |
|---|---|---|---|
| `server` | `"dev"` \| `"prod"` | `"dev"` | Какой сервер опрашивать |

```
GET /api/hytale/analytics?server=prod
```

---

## Ответ

```json
{
  "ok": true,
  "server": "prod",
  "onlinePlayers": 12,
  "registeredPlayers": 347,
  "mods": ["YooKassaPayments.jar", "BetterMap-1.3.7.jar"],
  "sources": {
    "serverDir": "/servers/prod",
    "online": {
      "ok": true,
      "value": 12,
      "source": "plugin_exporter",
      "error": null
    },
    "registered": {
      "ok": true,
      "value": 347,
      "error": null,
      "note": null
    },
    "modsDir": {
      "ok": true,
      "count": 21,
      "error": null
    }
  }
}
```

| Поле | Тип | Описание |
|---|---|---|
| `onlinePlayers` | `number \| null` | Игроки онлайн прямо сейчас. `null` если источник недоступен. |
| `registeredPlayers` | `number \| null` | Всего зарегистрированных игроков (из permissions.json). |
| `mods` | `string[] \| null` | Список JAR-файлов в папке mods. Для сайта обычно не нужен. |
| `sources` | object | Отладочная информация: откуда взяты данные и что пошло не так. |

### Источники `onlinePlayers`

Endpoint пробует источники по порядку, возвращает первый успешный:

1. **plugin_exporter** — Prometheus-экспортёр плагина `HytaleMetricsExporter` на порту `:9105/metrics` внутри Docker-сети. Самый быстрый и точный.
2. **tsdb** — Запасной вариант: запрос к Prometheus TSDB (`hytale-prometheus:9090`). Чуть медленнее, может отставать на ~15 секунд.

Если оба недоступны — `onlinePlayers: null`, в `sources.online.error` будет текст причины.

---

## Как делать реалтайм-счётчик (polling)

API не поддерживает WebSocket или SSE — просто делай запрос раз в несколько секунд.

### React-компонент (TypeScript)

```tsx
import { useEffect, useState } from 'react';

type ServerStats = {
  onlinePlayers: number | null;
  registeredPlayers: number | null;
};

function useServerStats(server: 'dev' | 'prod' = 'prod', intervalMs = 10_000): ServerStats {
  const [stats, setStats] = useState<ServerStats>({
    onlinePlayers: null,
    registeredPlayers: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetch_() {
      try {
        const res = await fetch(`/api/hytale/analytics?server=${server}`, { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && data.ok) {
          setStats({
            onlinePlayers: data.onlinePlayers,
            registeredPlayers: data.registeredPlayers,
          });
        }
      } catch {
        // сервер временно недоступен — оставляем предыдущее значение
      }
    }

    fetch_();
    const id = setInterval(fetch_, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [server, intervalMs]);

  return stats;
}

// Использование:
export function PlayerCounter() {
  const { onlinePlayers } = useServerStats('prod', 10_000);

  return (
    <div>
      {onlinePlayers === null ? (
        <span>Сервер недоступен</span>
      ) : (
        <span>Онлайн: {onlinePlayers}</span>
      )}
    </div>
  );
}
```

### Рекомендуемые интервалы опроса

| Где показывается | Интервал |
|---|---|
| Главная страница / лендинг | 30 секунд |
| Страница сервера | 10 секунд |
| Крупный экран / TV-режим | 5 секунд |

Меньше 5 секунд не нужно — сервер сам обновляет метрики раз в ~5 секунд.

---

## Отображение `null`

`onlinePlayers` возвращает `null` когда:
- игровой сервер выключен или перезагружается
- плагин метрик не запущен

Рекомендуется показывать нейтральный текст, а не скрывать блок:

```tsx
// Хорошо
{onlinePlayers === null ? 'Сервер на обслуживании' : `${onlinePlayers} онлайн`}

// Плохо — пропадает весь виджет при перезагрузке сервера
{onlinePlayers !== null && <span>{onlinePlayers} онлайн</span>}
```

---

## Прокси через свой Next.js сайт (если нужно)

Если сайт и adminpanel в одной Docker-сети, можно проксировать запрос серверно, чтобы не светить URL adminpanel браузеру:

```typescript
// app/api/server-stats/route.ts  (на стороне сайта)
export async function GET() {
  const res = await fetch('http://hytale-adminpanel:3001/api/hytale/analytics?server=prod', {
    cache: 'no-store',
    next: { revalidate: 0 },
  });
  const data = await res.json();
  // Возвращаем только нужные поля
  return Response.json({
    onlinePlayers: data.onlinePlayers ?? null,
    registeredPlayers: data.registeredPlayers ?? null,
  });
}
```

Тогда фронтенд обращается к `/api/server-stats` своего же сайта, а URL adminpanel остаётся на сервере.

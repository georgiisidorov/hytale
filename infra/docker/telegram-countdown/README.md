# Telegram обратный отсчёт

Редактирует **одно** сообщение в группе каждые 5 минут до заданного времени. Формат: `ОСТАЛОСЬ ~ЧЧ:ММ:СС` (реальный остаток до `COUNTDOWN_TARGET`).

## Подготовка

1. На https://my.telegram.org/apps создайте приложение, возьмите `api_id` и `api_hash`.
2. Скопируйте конфиг:
   ```bash
   cp .env.example .env
   # отредактируйте .env
   ```
3. Аккаунт должен быть участником группы `-5118253176` с правом отправки/редактирования сообщений.

## Первая авторизация (один раз)

```bash
cd infra/docker/telegram-countdown
docker compose build
docker compose run --rm -it telegram-countdown python -u main.py
```

Введите номер телефона и код из Telegram. Сессия сохранится в `./data/session.session`.

## Запуск

```bash
docker compose up -d
docker compose logs -f
```

При первом запуске создаётся новое сообщение; `message_id` пишется в `./data/state.json`. Дальше только **редактирование** этого сообщения.

## SOCKS5-прокси

В `.env` одной строкой (без пробелов):

```
TELEGRAM_PROXY=host:port:login:password
```

Пустая переменная — подключение напрямую. После смены прокси пересоберите образ (`PySocks`) и при проблемах с авторизацией удалите `data/session.session` и войдите заново.

## Переменные

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `COUNTDOWN_TARGET` | 2026-06-05T21:00:00 | Финиш (локальный TZ) |
| `TZ` | Europe/Moscow (Docker) | Пояс; в Termux не задавать — пояс телефона |
| `TICK_INTERVAL_SECONDS` | 300 | Интервал обновления |
| `TELEGRAM_GROUP_ID` | -5118253176 | ID группы |

По окончании отсчёта сообщение меняется на `КОМУ-ТО ПИЗДА 😈😈😈` (переопределение: `COUNTDOWN_FINAL_TEXT` в `.env`). После этого контейнер при рестарте ничего не трогает (`finished` в state).

Чтобы сбросить отсчёт: остановите контейнер, удалите `data/state.json`, запустите снова.

## Termux (Android)

См. [termux/README.md](termux/README.md) — те же настройки `.env`, без Docker.

## Деплой на сервер

```bash
scp -r infra/docker/telegram-countdown root@YOUR_SERVER:/opt/telegram-countdown
ssh root@YOUR_SERVER
cd /opt/telegram-countdown
cp .env.example .env && nano .env
docker compose run --rm -it telegram-countdown python -u main.py   # авторизация
docker compose up -d
```

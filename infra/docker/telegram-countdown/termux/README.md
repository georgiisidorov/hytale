# Telegram countdown — Termux

Тот же скрипт, что и Docker-версия (`../main.py`), без контейнера. Сессия и state — в `./data/`.

Отсчёт до `COUNTDOWN_TARGET=2026-06-05T21:00:00` — **часовой пояс телефона** (в `.env` не задавайте `TZ`).

## Установка на телефон

1. Установите [Termux](https://f-droid.org/packages/com.termux/) (лучше с F-Droid).
2. Скопируйте на телефон всю папку `telegram-countdown` (нужны `main.py` и `termux/`):

   ```bash
   # с ПК (пример)
   scp -r telegram-countdown u0_a123@192.168.1.x:~/telegram-countdown
   ```

   Или в Termux: `git clone ...` / распаковать zip в `$HOME/telegram-countdown`.

3. В Termux:

   ```bash
   cd ~/telegram-countdown/termux
   bash install.sh
   nano .env          # api_id, api_hash, прокси, минуты
   ```

   Зависимости ставятся в `venv/` (так Termux не ругается на `pip install --upgrade pip`).

4. **Первая авторизация** (интерактивно, телефон + код):

   ```bash
   ./run.sh
   ```

   Сессия: `data/session.session`

5. **Фон** (экран может гаснуть — включите wake-lock):

   ```bash
   ./start-bg.sh
   ./status.sh
   tail -f data/countdown.log
   ```

   Остановка: `./stop.sh`

## Файлы

| Файл | Назначение |
|------|------------|
| `data/session.session` | Авторизация Telegram |
| `data/state.json` | message_id, остаток, `finished` |
| `data/countdown.log` | Лог фонового процесса |
| `.env` | Настройки (как в Docker) |

## Автозапуск после перезагрузки (опционально)

```bash
pkg install termux-boot
mkdir -p ~/.termux/boot
ln -sf ~/telegram-countdown/termux/start-bg.sh ~/.termux/boot/telegram-countdown.sh
```

Разрешите Termux: «Draw over other apps», «Battery optimization» — без ограничений (иначе Android убьёт процесс).

## Сброс отсчёта

```bash
./stop.sh
rm -f data/state.json
./start-bg.sh
```

## Отличие от Docker

- Свои `data/` в `termux/data/` (не общие с сервером).
- Для работы 24/7 телефон должен быть включён и Termux не закрыт системой.

# Ротация логов (7 дней)

## Вариант A: logrotate (календарные сутки, 7 архивов)

Подходит для стандартного драйвера логов Docker `json-file`.

1. Скопировать конфиг на сервер:

```bash
sudo cp docs/logrotate-docker-hytale.conf /etc/logrotate.d/docker-hytale
sudo chmod 644 /etc/logrotate.d/docker-hytale
```

2. Проверка без изменений:

```bash
sudo logrotate -d /etc/logrotate.d/docker-hytale
```

3. Cron для `logrotate` обычно уже есть (`/etc/cron.daily/logrotate`). Если нет — добавь в root crontab:

```cron
0 0 * * * /usr/sbin/logrotate /etc/logrotate.d/docker-hytale
```

`daily` + `rotate 7` = хранить 7 суток ротаций.

---

## Вариант B: ограничение в Docker Compose (по размеру, не по дням)

В `docker-compose.yml` у сервиса:

```yaml
services:
  hytale-server-dev:
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "7"
```

Это **7 файлов** заданного размера, а не ровно 7 календарных дней. Для «ровно неделя» удобнее вариант A.

---

## Вариант C: демон Docker глобально

`/etc/docker/daemon.json` (осторожно: JSON без запятой в конце):

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "7"
  }
}
```

Затем `sudo systemctl restart docker` (перезапустит контейнеры).

---

## Важно

- Ротация логов Docker с `copytruncate` — стандартная практика; при проблемах смотри `man logrotate`.
- Если логи пишутся **не** в Docker, а в файл в каталоге сервера — сделай отдельный блок в `/etc/logrotate.d/` с путём к этому файлу и теми же `daily` / `rotate 7`.

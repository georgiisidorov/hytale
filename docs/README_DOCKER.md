# Запуск Hytale сервера в Docker контейнере

## Быстрый старт

### 1. Подготовка файлов
Убедитесь, что структура папок следующая:
```
.
├── Dockerfile
├── docker-compose.yml
└── Server/
    ├── Assets.zip
    ├── HytaleServer.aot
    ├── HytaleServer.jar
    ├── config.json
    ├── bans.json
    ├── permissions.json
    ├── whitelist.json
    ├── logs/
    ├── universe/
    └── mods/
```

### 2. Запуск в фоне
```bash
docker-compose up -d
```

### 3. Просмотр логов
```bash
docker-compose logs -f
```

### 4. Остановка
```bash
docker-compose down
```

### 5. Перезапуск
```bash
docker-compose restart
```

## Полезные команды

### Просмотр статуса
```bash
docker-compoe ps
```

### Вход в контейнер
```bash
docker exec -it hytale-server-dev bash
```

### Остановка без удаления
```bash
docker-compose stop
```

### Запуск после остановки
```bash
docker-compose start
```

### Пересборка образа
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Настройка портов

Если нужно изменить порты, отредактируйте `docker-compose.yml`:
```yaml
ports:
  - "8080:8080"  # формат: "внешний:внутренний"
```

## Открытие портов в UFW

После настройки портов в docker-compose, откройте их в UFW:
```bash
sudo ufw allow 8080/tcp
sudo ufw allow 8081/tcp
# и т.д. для всех используемых портов
```


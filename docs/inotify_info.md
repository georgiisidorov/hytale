# Inotify в Linux - Подробное объяснение

## Что такое inotify?

**inotify** (inode notify) - это подсистема ядра Linux, которая позволяет приложениям отслеживать изменения в файловой системе в реальном времени.

### Основные возможности:
- Отслеживание изменений файлов (создание, удаление, модификация)
- Отслеживание изменений директорий
- Мониторинг метаданных файлов (права доступа, владелец)
- Асинхронные уведомления через файловые дескрипторы

## Как это работает?

1. **Приложение регистрирует интерес** к файлу/директории через системный вызов `inotify_init()` или `inotify_init1()`
2. **Ядро создает inotify instance** - структуру данных для отслеживания
3. **Добавляются watches** - точки наблюдения за конкретными файлами/директориями
4. **События записываются** в очередь событий
5. **Приложение читает события** через `read()` из файлового дескриптора

## Лимиты системы

Linux устанавливает три основных лимита для inotify:

### 1. `max_user_instances`
- Максимальное количество inotify instances на пользователя
- По умолчанию: обычно 128 или 512
- Путь: `/proc/sys/fs/inotify/max_user_instances`

### 2. `max_user_watches`
- Максимальное количество watches (точек наблюдения) на пользователя
- По умолчанию: обычно 8192 или 524288
- Путь: `/proc/sys/fs/inotify/max_user_watches`
- **Важно**: один watch может отслеживать целую директорию со всеми файлами

### 3. `max_queued_events`
- Максимальное количество событий в очереди на instance
- По умолчанию: обычно 16384
- Путь: `/proc/sys/fs/inotify/max_queued_events`

## Проблема в вашем случае

Из краш-лога Minecraft:
```
Caused by: java.io.IOException: User limit of inotify instances reached or too many open files
```

**Причина:**
- Minecraft Forge пытается создать FileWatcher для отслеживания конфигурационных файлов
- Система достигла лимита `max_user_instances`
- Это может быть из-за:
  - Множества запущенных приложений, использующих inotify
  - KDE Plasma (использует inotify для отслеживания файлов)
  - Других Java-приложений
  - IDE (например, Cursor/VSCode отслеживают изменения файлов)

## Решения

### 1. Проверка текущих лимитов

```bash
# Текущие лимиты
cat /proc/sys/fs/inotify/max_user_instances
cat /proc/sys/fs/inotify/max_user_watches
cat /proc/sys/fs/inotify/max_queued_events

# Текущее использование
find /proc/*/fd -lname anon_inode:inotify 2>/dev/null | wc -l
```

### 2. Временное увеличение лимитов (до перезагрузки)

```bash
# Увеличить лимит instances
sudo sysctl fs.inotify.max_user_instances=512

# Увеличить лимит watches (если нужно)
sudo sysctl fs.inotify.max_user_watches=524288

# Проверка
sysctl fs.inotify.max_user_instances
```

### 3. Постоянное увеличение лимитов

Создайте файл `/etc/sysctl.d/99-inotify.conf`:

```bash
# Увеличенные лимиты для inotify
fs.inotify.max_user_instances = 512
fs.inotify.max_user_watches = 524288
fs.inotify.max_queued_events = 16384
```

Затем примените:
```bash
sudo sysctl -p /etc/sysctl.d/99-inotify.conf
```

### 4. Проверка использования

```bash
# Какие процессы используют inotify
for pid in $(find /proc -maxdepth 1 -type d -name '[0-9]*'); do
    count=$(find "$pid/fd" -lname 'anon_inode:inotify' 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        echo "PID $(basename $pid): $count instances - $(ps -p $(basename $pid) -o comm= 2>/dev/null)"
    fi
done
```

## Приложения, использующие inotify

- **KDE Plasma** - отслеживает изменения файлов в файловом менеджере
- **IDE** (VSCode, Cursor, IntelliJ) - отслеживают изменения файлов для автосохранения
- **Minecraft Forge** - отслеживает конфигурационные файлы
- **Docker** - отслеживает изменения в volumes
- **systemd** - отслеживает изменения в unit файлах
- **Dropbox, Google Drive** - синхронизация файлов
- **Webpack, Vite** - hot reload в разработке

## Рекомендации для вашего случая

1. **Увеличьте лимиты** (решение выше)
2. **Закройте ненужные приложения**, использующие inotify
3. **Перезапустите KDE** если он использует слишком много instances
4. **Проверьте IDE** - возможно, они отслеживают слишком много файлов

## Дополнительная информация

- Документация ядра: `man inotify` или `man inotify_init`
- Системные вызовы: `inotify_init()`, `inotify_add_watch()`, `inotify_rm_watch()`
- События: `IN_CREATE`, `IN_DELETE`, `IN_MODIFY`, `IN_MOVED_FROM`, `IN_MOVED_TO` и др.

# Патч BetterMap: VIP+ метки, OP конфиг

## Что сделано

1. **Создание меток (Place new marker)** — только ранг **vip**, **admin** или **op** (либо право `bettermap.marker.create`).
   - В `PermissionsUtil` добавлен метод `canCreateMarkers(Player)`.
   - Ранги: `vip`, `admin`, `op`.
   - В `WorldMapHook.sendMapSettingsToPlayer` опция «создавать метки» включается только если в конфиге разрешено **и** у игрока есть право (VIP+ или право).

2. **Настройка конфига** — только для **OP**.
   - `canAccessConfig(Player)` теперь возвращает `true` только для группы `OP` (без права `bettermap.command.config`).
   - Команда `/bettermap admin` (открытие меню конфига) проверяет `canAccessConfig`, то есть только OP открывает конфиг.

## Как собрать патч

Нужны: **JDK** (например OpenJDK 21), **BetterMap-1.3.3.jar** в папке BetterMap, **Server.jar** (например из `ServerWelcome/libs/Server.jar`).

```bash
cd /home/projects/Hytale/BetterMap
# при необходимости: export JAVAC=/path/to/javac
# при необходимости: export SERVER_JAR=/path/to/Server.jar
./build-patch.sh
```

Скрипт скомпилирует изменённые классы и обновит `BetterMap-1.3.3.jar`. Перед заменой на сервере сделайте копию оригинального JAR.

## Ранги

- Создание меток: группы **vip**, **admin**, **op** (или право `bettermap.marker.create`).
- Конфиг: только группа **op**. Все группы у вас в нижнем регистре.

## Команды конфига

Подкоманды `/bettermap config ...` по-прежнему требуют право `bettermap.command.config`. Чтобы только OP могли менять настройки, выдайте это право только группе OP в настройках прав сервера (PermissionsModule).

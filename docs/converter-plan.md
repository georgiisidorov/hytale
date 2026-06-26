# План разработки конвертера построек Minecraft → Hytale

## 📌 Обзор задачи

Создание инструмента для конвертации структур из Minecraft в формат prefab Hytale. Задача упомянута в плане сервера (Фаза 2, задача 6: «Постройки и фермы»).

---

## 🔍 Анализ форматов

### Входные форматы (Minecraft)

| Формат | Расширение | Описание | Сложность |
|--------|-------------|----------|-----------|
| **Schematic** | `.schematic` | NBT, массивы Blocks + Data, порядок YZX. Используется WorldEdit, MCEdit, Schematica. | Средняя |
| **Structure Block** | `.nbt` | Палитра block states, список blocks с pos + state index. Официальный формат MC 1.13+. | Средняя |
| **Litematica** | `.litematic` | NBT, несколько регионов, metadata. | Высокая |

**Schematic (классический):**
- `Width`, `Height`, `Length` — размеры
- `Blocks` — byte array, индекс: `(Y×Length + Z)×Width + X`
- `Data` — byte array, младшие 4 бита на блок
- `TileEntities` — сундуки, таблички, печи и т.д.
- `Entities` — мобы (опционально)

**Structure Block (современный):**
- `size` — [x, y, z]
- `palette` — массив block states (`Name` + `Properties`)
- `blocks` — `{state: index, pos: [x,y,z], nbt?: ...}`
- `entities` — список сущностей

### Выходной формат (Hytale)

- **Prefab** — `.prefab.json`, управляется через `PrefabStore` и `BlockSelection`
- Блоки: `blockId` (из `BlockType.getAssetMap()`), `rotation`, `filler`, `supportValue`
- Координаты: локальные относительно anchor point
- Поддержка: блоки, жидкости, сущности, вложенные prefab

**Важно:** Точная JSON-схема prefab может быть внутренней. Документация описывает API (`BlockSelection`, `PrefabStore`), а не формат файла. Возможны два подхода:
1. **Плагин Hytale** — парсинг MC → создание `BlockSelection` → сохранение через API
2. **Standalone + плагин** — парсинг MC → промежуточный формат → плагин загружает и сохраняет

---

## 📋 Детальный план работ

### Фаза 0: Исследование (3–5 дней)

| № | Задача | Описание | Результат |
|---|--------|----------|-----------|
| 0.1 | Изучение Hytale prefab | Получить реальный `.prefab.json` через `/prefab save`, изучить структуру | Документ со схемой JSON |
| 0.2 | Изучение BlockType | Список блоков Hytale, их asset names, rotation values | Таблица блоков Hytale |
| 0.3 | Изучение MC блоков | Актуальный список block states (1.20+), data values для schematic | Справочник MC блоков |
| 0.4 | Маппинг блоков | Создать таблицу соответствия MC block → Hytale block (камень→камень, доски→доски и т.д.) | Файл `block-mapping.json` |

---

### Фаза 1: Парсер Minecraft (5–7 дней)

| № | Задача | Описание | Результат |
|---|--------|----------|-----------|
| 1.1 | NBT-парсер | Библиотека для чтения NBT (Java: `net.querz.nbt`, или встроенный парсер) | Модуль `nbt-parser` |
| 1.2 | Парсер Schematic | Чтение `.schematic`: Blocks, Data, TileEntities. Поддержка AddBlocks для ID > 255 | Класс `SchematicReader` |
| 1.3 | Парсер Structure Block | Чтение `.nbt` с palette + blocks. Поддержка block states и palettes | Класс `StructureBlockReader` |
| 1.4 | Нормализация | Единая внутренняя модель: `List<BlockAtPosition>` с blockId, x,y,z, properties, nbt | Интерфейс `MinecraftStructure` |
| 1.5 | Обработка TileEntities | Извлечение NBT сундуков, табличек, печей и т.д. | Расширение модели |

---

### Фаза 2: Маппинг и трансформация (4–5 дней)

| № | Задача | Описание | Результат |
|---|--------|----------|-----------|
| 2.1 | Таблица маппинга | JSON: `minecraft:stone` → `hytale:stone`, с fallback на `hytale:stone` для неизвестных | `block-mapping.json` |
| 2.2 | Конвертер rotation | MC facing/axis → Hytale rotation index (0–3 или по enum) | Функция `convertRotation()` |
| 2.3 | Обработка block states | `facing=north`, `half=top` и т.д. → rotation + filler | Модуль `BlockStateConverter` |
| 2.4 | Fallback для неизвестных | Неизвестный MC блок → замена на `hytale:stone` или `hytale:placeholder` | Логирование + подстановка |
| 2.5 | Конвертер координат | MC (0,0,0) — левый нижний угол. Hytale — уточнить систему координат | Корректный перенос позиций |

---

### Фаза 3: Генерация Hytale prefab (5–7 дней)

| № | Задача | Описание | Результат |
|---|--------|----------|-----------|
| 3.1 | Выбор стратегии | **A)** Генерация JSON напрямую (если схема известна) **B)** Hytale-плагин с BlockSelection | Решение + архитектура |
| 3.2 | Генератор prefab (A) | Построение JSON по схеме из Фазы 0 | Класс `PrefabJsonWriter` |
| 3.2 | Генератор prefab (B) | Плагин: загрузка MC файла → BlockSelection.addBlockAtLocalPos() → saveServerPrefab() | Команда `/convertprefab load <file>` |
| 3.3 | Обработка жидкостей | MC water/lava → Hytale fluids (если есть в MC структурах) | Расширение конвертера |
| 3.4 | Обработка сущностей | MC entities → Hytale entities (опционально, сложнее) | Отложено или упрощённо |

---

### Фаза 4: CLI и интеграция (3–4 дня)

| № | Задача | Описание | Результат |
|---|--------|----------|-----------|
| 4.1 | CLI-интерфейс | `java -jar converter.jar input.schematic output.prefab.json` | Исполняемый JAR |
| 4.2 | Конфигурация | `config.json`: пути к маппингу, fallback-блок, опции | Гибкая настройка |
| 4.3 | Логирование | Прогресс, неизвестные блоки, ошибки | Лог-файл + консоль |
| 4.4 | Валидация | Проверка выходного prefab в Hytale (`/prefab load`) | Инструкция по тестированию |

---

### Фаза 5: Доработки и документация (2–3 дня)

| № | Задача | Описание | Результат |
|---|--------|----------|-----------|
| 5.1 | Поддержка Litematica | Опционально: парсинг `.litematic` | Расширение парсера |
| 5.2 | Batch-конвертация | Конвертация папки схем за раз | Флаг `--batch` |
| 5.3 | README и примеры | Инструкция, примеры маппинга, типичные проблемы | Документация |
| 5.4 | Интеграция в план сервера | Готовый конвертер для задачи 6 (Постройки и фермы) | Обновление plan.md |

---

## 🏗️ Предлагаемая архитектура

```
converter/
├── src/
│   ├── parser/
│   │   ├── NbtParser.java          # Низкоуровневый NBT
│   │   ├── SchematicReader.java    # .schematic
│   │   └── StructureBlockReader.java # .nbt structure
│   ├── model/
│   │   ├── MinecraftStructure.java
│   │   ├── BlockAtPosition.java
│   │   └── BlockState.java
│   ├── mapping/
│   │   ├── BlockMapping.java
│   │   └── RotationConverter.java
│   ├── output/
│   │   ├── PrefabWriter.java      # JSON или API
│   │   └── HytalePluginAdapter.java # если плагин
│   └── Main.java                  # CLI
├── resources/
│   └── block-mapping.json
├── config.json
└── pom.xml / build.gradle
```

---

## ⚠️ Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Формат prefab.json закрыт/меняется | Высокая | Приоритет стратегии B (плагин с API) |
| Нет 1:1 маппинга блоков | Высокая | Fallback на generic блок, расширяемая таблица |
| TileEntities сложно конвертировать | Средняя | Сначала только блоки, NBT — позже |
| Разные системы координат | Средняя | Тесты на простых структурах, документация |
| Hytale API меняется | Высокая | Модульность, фасады, следование plan.md |

---

## 📅 Оценка сроков

| Фаза | Срок | Зависимости |
|------|------|-------------|
| Фаза 0: Исследование | 3–5 дней | — |
| Фаза 1: Парсер MC | 5–7 дней | 0 |
| Фаза 2: Маппинг | 4–5 дней | 0, 1 |
| Фаза 3: Генерация prefab | 5–7 дней | 0, 1, 2 |
| Фаза 4: CLI | 3–4 дня | 1, 2, 3 |
| Фаза 5: Доработки | 2–3 дня | 1–4 |
| **Итого** | **22–31 день** | |

---

## 🎯 MVP (минимальный результат)

Для быстрого прототипа (1–2 недели):

1. Парсер **только .schematic** (самый распространённый)
2. Маппинг **20–30 базовых блоков** (камень, доски, земля, песок, стекло и т.д.)
3. **Hytale-плагин** с командой `/convertprefab` — загружает schematic, создаёт BlockSelection, сохраняет prefab
4. Без TileEntities и entities на первом этапе

Это позволит конвертировать простые постройки (стены, дома, башни) и итерировать над маппингом и качеством.

# Схема Hytale prefab.json (из реального файла)

**Источник:** `creative.prefab.json` из мира "New World 1"  
**Размер:** ~4 MB, ~145k блоков, ~145k fluids, сущности

---

## Корневая структура

```json
{
  "version": 8,
  "blockIdVersion": 11,
  "anchorX": 0,
  "anchorY": 0,
  "anchorZ": 0,
  "blocks": [ ... ],
  "fluids": [ ... ],
  "entities": [ ... ]
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `version` | int | Версия формата prefab |
| `blockIdVersion` | int | Версия маппинга блоков |
| `anchorX`, `anchorY`, `anchorZ` | int | Точка привязки (origin) |
| `blocks` | array | Массив блоков |
| `fluids` | array | Массив жидкостей |
| `entities` | array | Массив сущностей |

---

## Блок (blocks[])

**Минимальный вариант:**
```json
{
  "x": -104,
  "y": 0,
  "z": -43,
  "name": "Soil_Grass"
}
```

**С rotation и filler (для направленных блоков):**
```json
{
  "x": -103,
  "y": 1,
  "z": 40,
  "name": "Furniture_Lumberjack_Sign",
  "rotation": 2,
  "filler": 1024
}
```

| Поле | Тип | Обязательный | Описание |
|------|-----|--------------|----------|
| `x`, `y`, `z` | int | да | Позиция (локальные координаты) |
| `name` | string | да | Имя блока (например `Soil_Grass`, `Rock_Stone`) |
| `rotation` | int | нет | Поворот (0–3, по оси Y) |
| `filler` | int | нет | Вариант/состояние блока (например 1024, 2048) |

**Примеры имён блоков:**
- `Soil_Grass`, `Soil_Dirt`, `Rock_Stone`
- `Furniture_Lumberjack_Sign`, `Furniture_Feran_Bed`
- `Deco_Iron_Bars_Platforms`, `Trap_Ancient_Platform`

---

## Жидкость (fluids[])

```json
{
  "x": -104,
  "y": 0,
  "z": -43,
  "name": "Empty",
  "level": 0
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `x`, `y`, `z` | int | Позиция |
| `name` | string | Тип жидкости (`Empty`, `Water`, `Lava` и т.д.) |
| `level` | int | Уровень заполнения (0–8?) |

---

## Сущность (entities[])

```json
{
  "Components": {
    "Transform": {
      "Position": { "X": -0.5, "Y": 1.0, "Z": 36.5 },
      "Rotation": { "Pitch": 0.0, "Yaw": -3.03, "Roll": 0.0 }
    },
    "Minecart": { "SourceItem": "Rail_Kart" },
    "Model": { "Model": { "Id": "Minecart", "Scale": 2.0, "Static": false } },
    "UUID": { ... }
  }
}
```

Сущности используют ECS-подход с компонентами. Для конвертера MC→Hytale на первом этапе можно опускать.

---

## Выводы для конвертера

1. **Формат открыт** — JSON, читаемый и генерируемый.
2. **Блоки** — `x, y, z, name` обязательны; `rotation`, `filler` — опционально.
3. **Имена блоков** — без namespace (`Soil_Grass`, не `hytale:Soil_Grass`).
4. **Координаты** — целые числа, локальные относительно anchor.
5. **Маппинг MC→Hytale** — нужна таблица `minecraft:stone` → `Rock_Stone` и т.д.

# Руководство по созданию маппинга блоков Minecraft ↔ Hytale

## 🎯 Цель

Создать таблицу соответствий между блоками Minecraft и блоками Hytale на основе сравнения реальных структур.

---

## 📋 Шаги

### 1. Экспорт структуры из Minecraft

Следуйте инструкциям в `EXPORT_INSTRUCTIONS.md`:
- Используйте Structure Block для экспорта структуры
- Сохраните как `minecraft_structure.nbt`
- Файл будет в: `~/.minecraft/saves/Новый мир/generated/structures/minecraft_structure.nbt`

### 2. Создание маппинга

Запустите скрипт для создания маппинга:

```bash
# Быстрый способ (автоматически использует правильные координаты)
./quick_compare.sh

# Или вручную
python3 create_block_mapping.py \
  minecraft.prefab.json \
  ~/.minecraft/saves/Новый\ мир/generated/structures/minecraft_structure.nbt \
  -28 -60 -33
```

### 3. Результаты

Скрипт создаст два файла:

#### `block_mapping.json` - Статистический маппинг
```json
{
  "minecraft:stone": {
    "Rock_Stone": 150,
    "Rock_Stone_Cobble": 25
  },
  "minecraft:dirt": {
    "Soil_Dirt": 200
  }
}
```

**Формат:** `{minecraft_block_name: {hytale_block_name: количество_вхождений}}`

#### `block_mapping_detailed.json` - Детальный маппинг с позициями
```json
[
  {
    "position": [0, 0, 0],
    "minecraft": {
      "name": "minecraft:stone",
      "properties": {}
    },
    "hytale": {
      "name": "Rock_Stone",
      "rotation": 0,
      "filler": 0
    }
  }
]
```

**Формат:** Массив всех совпадающих позиций с полной информацией о блоках.

---

## 📊 Использование маппинга

### Для конвертера

Маппинг можно использовать в конвертере Minecraft → Hytale:

```python
import json

# Загрузка маппинга
with open('block_mapping.json', 'r') as f:
    mapping = json.load(f)

# Конвертация блока Minecraft в Hytale
def convert_block(mc_block_name):
    if mc_block_name in mapping:
        # Берём самый частый вариант
        hytale_blocks = mapping[mc_block_name]
        most_common = max(hytale_blocks.items(), key=lambda x: x[1])
        return most_common[0]
    return None  # или fallback блок
```

### Анализ маппинга

Скрипт выводит статистику:
- **1:1 соответствия** - один блок MC → один блок Hytale (идеально)
- **1:N соответствия** - один блок MC → несколько блоков Hytale (нужен контекст)
- **N:1 соответствия** - несколько блоков MC → один блок Hytale (потеря информации)

---

## 🔍 Примеры использования

### Просмотр маппинга

```bash
# Красивый вывод JSON
cat block_mapping.json | python3 -m json.tool | less

# Поиск конкретного блока
cat block_mapping.json | python3 -m json.tool | grep "minecraft:stone"
```

### Анализ неоднозначностей

```python
import json

with open('block_mapping.json', 'r') as f:
    mapping = json.load(f)

# Найти блоки MC с несколькими вариантами в Hytale
ambiguous = {mc: hytale for mc, hytale in mapping.items() if len(hytale) > 1}

print(f"Блоков MC с неоднозначным маппингом: {len(ambiguous)}")
for mc_block, hytale_blocks in list(ambiguous.items())[:10]:
    print(f"{mc_block}: {list(hytale_blocks.keys())}")
```

---

## ⚠️ Важные замечания

1. **Маппинг основан на одной структуре** - для полноты нужно сравнить несколько разных структур
2. **Контекст важен** - один блок MC может соответствовать разным блокам Hytale в зависимости от окружения
3. **Свойства блоков** - некоторые соответствия могут зависеть от свойств (например, rotation, variant)
4. **Не все блоки могут быть в структуре** - для полного маппинга нужны структуры с разными типами блоков

---

## 🚀 Следующие шаги

1. Экспортируйте несколько разных структур из Minecraft
2. Создайте маппинги для каждой структуры
3. Объедините маппинги, учитывая частоту соответствий
4. Создайте финальный файл `block_mapping_final.json` для использования в конвертере

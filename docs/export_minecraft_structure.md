# Инструкция по экспорту структуры из Minecraft

## Координаты структуры в Minecraft

**Угол 1 (Corner 1):** `10 -60 13`  
**Угол 2 (Corner 2):** `-28 -59 -33`

**Размеры:** 39 × 2 × 47 блоков  
**Origin (минимальный угол):** `-28 -60 -33`

---

## Способ 1: Structure Block (в игре)

1. Откройте Minecraft и зайдите в мир "Новый мир"
2. Найдите структуру по координатам:
   - X: от -28 до 10
   - Y: от -60 до -59
   - Z: от -33 до 13

3. Установите Structure Block (блок структуры):
   ```
   /give @s structure_block
   ```

4. Поставьте Structure Block в точке `-28 -60 -33` (или рядом)

5. Откройте интерфейс Structure Block (ПКМ)

6. Настройки:
   - **Режим:** `Save` (Сохранить)
   - **Structure Name:** `minecraft_structure` (или любое имя)
   - **Relative Position:**
     - X: `0`
     - Y: `0`
     - Z: `0`
   - **Structure Size:**
     - X: `39`
     - Y: `2`
     - Z: `47`
   - **Include Entities:** по желанию
   - **Show Bounding Box:** включите для визуализации

7. Нажмите `SAVE`

8. Файл будет сохранён в:
   ```
   ~/.minecraft/saves/Новый мир/generated/structures/minecraft_structure.nbt
   ```

---

## Способ 2: Команда /structure (если доступна)

```minecraft
/structure save minecraft_structure -28 -60 -33 39 2 47
```

---

## Способ 3: WorldEdit (если установлен)

1. Выделите область:
   ```
   //pos1 -28 -60 -33
   //pos2 10 -59 13
   ```

2. Сохраните схему:
   ```
   //copy
   //schematic save minecraft_structure
   ```

3. Файл будет в:
   ```
   ~/.minecraft/schematics/minecraft_structure.schematic
   ```

---

## После экспорта

Когда получите `.nbt` файл, используйте для сравнения:

```bash
# Установите библиотеку (если ещё не установлена)
pip3 install nbtlib

# Сравните структуры
python3 compare_structures.py minecraft.prefab.json \
  ~/.minecraft/saves/Новый\ мир/generated/structures/minecraft_structure.nbt \
  -28 -60 -33
```

Offset `-28 -60 -33` нужен, чтобы выровнять координаты Minecraft с координатами prefab (которые начинаются с anchor point 0,0,0).

package com.github.hytale.yookassa;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Каталог магазина и рулетки (из админ-API или встроенный fallback).
 */
public final class MarketCatalog {
    public record ShopItem(
            String itemId,
            int quantity,
            String displayName,
            String rarity,
            int price,
            boolean useCrystals,
            String uiCategory,
            String description,
            String stat1,
            String stat2,
            String stat3
    ) {
        String priceLabel() {
            String currency = useCrystals ? "кристаллов" : "монет";
            return String.format("%,d %s", price, currency);
        }

        String rarityLabel() {
            return MarketCatalog.rarityLabel(rarity);
        }

        String cardTitle() {
            return quantity > 1 ? displayName + " x" + quantity : displayName;
        }

        String detailTitle() {
            return cardTitle();
        }

        String detailDescription() {
            return sanitizeUiText(description);
        }

        private static String sanitizeUiText(String raw) {
            if (raw == null || raw.isBlank()) {
                return "";
            }
            return raw
                    .replace("\\n", "\n")
                    .replaceAll("<[^>]+>", "")
                    .replaceAll("[ \\t]+", " ")
                    .replaceAll("\\n{3,}", "\n\n")
                    .trim();
        }
    }

    /** Игровые названия, когда ru-RU server.lang даёт устаревший/декоративный placeholder. */
    private static final java.util.Map<String, String> WHEEL_DISPLAY_OVERRIDES = java.util.Map.ofEntries(
            java.util.Map.entry("Potion_Poison",    "Зелье отравления"),
            java.util.Map.entry("CHEST_COMMON",     "Обычный сундук"),
            java.util.Map.entry("CHEST_RARE",       "Редкий сундук"),
            java.util.Map.entry("CHEST_EPIC",       "Эпический сундук"),
            java.util.Map.entry("CHEST_LEGENDARY",  "Легендарный сундук"),
            java.util.Map.entry("CHEST_MYTHIC",     "Мифический сундук"),
            java.util.Map.entry("CHEST_JACKPOT",    "Сундук Джекпот"),
            java.util.Map.entry("WHEEL_COINS_50",   "50 монет"),
            java.util.Map.entry("WHEEL_COINS_75",   "75 монет"),
            java.util.Map.entry("WHEEL_FREE_SPIN",  "Бесплатный спин"),
            java.util.Map.entry("WHEEL_EMPTY",      "Пусто")
    );

    private static final java.util.Map<String, String> OFFICIAL_RU_ITEM_NAMES = java.util.Map.ofEntries(
            java.util.Map.entry("Potion_Poison",              "Зелье отравления"),
            java.util.Map.entry("Rock_Gem_Diamond",           "Алмаз"),
            java.util.Map.entry("Ingredient_Bar_Gold",        "Золотой слиток"),
            java.util.Map.entry("Rock_Gem_Emerald",           "Изумруд"),
            java.util.Map.entry("Rock_Gem_Ruby",              "Рубин"),
            java.util.Map.entry("Rock_Gem_Sapphire",          "Сапфир"),
            java.util.Map.entry("Rock_Gem_Topaz",             "Топаз"),
            java.util.Map.entry("Rock_Gem_Voidstone",         "Камень пустоты"),
            java.util.Map.entry("Rock_Gem_Zephyr",            "Зефирит"),
            java.util.Map.entry("Plant_Fruit_Azure",          "Лазурный фрукт"),
            java.util.Map.entry("Bandage_Crude",              "Бинт"),
            java.util.Map.entry("Potion_Health",              "Зелье исцеления"),
            java.util.Map.entry("Plant_Fruit_Apple",          "Яблоко"),
            java.util.Map.entry("Ingredient_Fibre",           "Растительное волокно"),
            java.util.Map.entry("Plant_Petals_Red",           "Красные лепестки"),
            java.util.Map.entry("Ingredient_Tree_Sap",        "Древесная смола"),
            java.util.Map.entry("Tool_Fertilizer",            "Удобрение"),
            java.util.Map.entry("Wood_Torch_Wall",            "Деревянный факел"),
            java.util.Map.entry("Rock_Stone_Cobble",          "Булыжник"),
            java.util.Map.entry("Potion_Signature",           "Зелье энергии"),
            java.util.Map.entry("Weapon_Shortbow_Iron",       "Железный короткий лук"),
            java.util.Map.entry("Potion_Health_Greater",      "Великое зелье лечения"),
            java.util.Map.entry("Weapon_Longsword_Iron",      "Железный длинный меч"),
            java.util.Map.entry("Weapon_Shield_Iron",         "Железный щит"),
            java.util.Map.entry("Weapon_Sword_Cobalt",        "Кобальтовый меч"),
            java.util.Map.entry("Armor_Cobalt_Chest",         "Кобальтовая кираса"),
            java.util.Map.entry("Weapon_Sword_Thorium",       "Ториевый меч"),
            java.util.Map.entry("Weapon_Staff_Thorium",       "Ториевый посох"),
            java.util.Map.entry("Egg_Spawner_Lantern",        "Яйцо питомца: Фонарик"),
            java.util.Map.entry("Farming_Collar",             "Ошейник питомца"),
            java.util.Map.entry("Weapon_Longsword_Mithril",   "Мифриловый длинный меч"),
            java.util.Map.entry("Armor_Mithril_Chest",        "Мифриловая кираса"),
            java.util.Map.entry("Weapon_Staff_Onyxium",       "Оникситовый посох"),
            java.util.Map.entry("Recipe_Book_Magic_Void",     "Гримуар Пустоты"),
            java.util.Map.entry("Ingredient_Bar_Adamantite",  "Адамантитовый слиток"),
            java.util.Map.entry("Weapon_Longsword_Void",      "Меч Пустоты"),
            java.util.Map.entry("Weapon_Longsword_Adamantite","Адамантитовый длинный меч"),
            java.util.Map.entry("Armor_Adamantite_Chest",     "Адамантитовая кираса"),
            java.util.Map.entry("Weapon_Staff_Adamantite",    "Адамантитовый посох")
    );

    public record WheelSlot(
            int slotIndex,
            String itemId,
            int weight,
            int qtyMin,
            int qtyMax,
            String rarity,
            String displayName
    ) {
        String resolvedDisplayName() {
            if (displayName != null && !displayName.isBlank() && !displayName.equals(itemId)) {
                String trimmed = displayName.trim();
                if (!isMisleadingDecorativePotionName(itemId, trimmed)) {
                    return trimmed;
                }
            }
            return officialRuItemName(itemId);
        }

        private static boolean isMisleadingDecorativePotionName(String itemId, String name) {
            return "Potion_Poison".equals(itemId)
                    && name.toLowerCase(Locale.ROOT).contains("декоратив");
        }
        int rollQuantity() {
            if (qtyMax <= qtyMin) {
                return Math.max(1, qtyMin);
            }
            return ThreadLocalRandom.current().nextInt(qtyMin, qtyMax + 1);
        }
    }

    /** Тип награды колеса: item, pack, coins, free_spin, empty. */
    public record WheelReward(
            String rewardId,
            String rarity,
            String rewardType,
            String itemId,
            int quantity,
            int weight,
            String displayName
    ) {}

    public record SpinResult(
            String itemId,
            String displayName,
            int quantity,
            int slotIndex,
            String rarity,
            String rewardType,
            String chestSlotId
    ) {
        public SpinResult(String itemId, String displayName, int quantity, int slotIndex, String rarity) {
            this(itemId, displayName, quantity, slotIndex, rarity, "item", null);
        }
        public boolean isChestReward() { return chestSlotId != null; }
    }

    private static final Set<String> LEGACY_UI_CATEGORIES = Set.of(
            "featured", "weapons", "armor", "tools", "cosmetics"
    );

    private static final List<ShopItem> FALLBACK_SHOP = List.of(
            new ShopItem("Soil_Dirt", 1, "Dirt", "Common", 2, false, "Build", "", "", "", ""),
            new ShopItem("Rock_Stone", 1, "Stone", "Common", 4, false, "Build", "", "", "", ""),
            new ShopItem("Fluid_Water", 1, "Water", "Common", 80, false, "Build", "", "", "", ""),
            new ShopItem("Wood_Oak_Trunk", 1, "Oak Log", "Common", 18, false, "Wood", "", "", "", ""),
            new ShopItem("Ingredient_Stick", 1, "Stick", "Common", 2, false, "Wood", "", "", "", ""),
            new ShopItem("Soil_Clay_Brick", 1, "Clay Brick", "Common", 14, false, "Craft", "", "", "", ""),
            new ShopItem("Potion_Empty", 1, "Empty Potion Bottle", "Common", 25, false, "Alchemy", "", "", "", ""),
            new ShopItem("Potion_Health", 1, "Health Potion", "Uncommon", 250, false, "Alchemy", "", "", "", ""),
            new ShopItem("Plant_Seeds_Wheat", 1, "Wheat Seed Bag", "Common", 15, false, "Plant", "", "", "", ""),
            new ShopItem("Plant_Sapling_Oak", 1, "Oak Sapling", "Common", 60, false, "Plant", "", "", "", ""),
            new ShopItem("Weapon_Sword_Iron", 1, "Iron Sword", "Rare", 1500, false, "Weapon", "", "", "", ""),
            new ShopItem("Weapon_Sword_Mithril", 1, "Mithril Sword", "Legendary", 8500, false, "Weapon", "", "", "", ""),
            new ShopItem("Armor_Leather_Light_Chest", 1, "Light Leather Cuirass", "Uncommon", 420, false, "Armor", "", "", "", ""),
            new ShopItem("Armor_Iron_Chest", 1, "Iron Cuirass", "Epic", 2450, false, "Armor", "", "", "", "")
    );

    private static final List<WheelSlot> FALLBACK_WHEEL = List.of(
            new WheelSlot(0, "Potion_Poison", 120, 1, 1, "Common", "Зелье отравления"),
            new WheelSlot(1, "Rock_Gem_Diamond", 40, 1, 1, "Rare", "Алмаз"),
            new WheelSlot(2, "Ingredient_Bar_Gold", 80, 1, 3, "Uncommon", "Золотой слиток"),
            new WheelSlot(3, "Rock_Gem_Emerald", 50, 1, 1, "Rare", "Изумруд"),
            new WheelSlot(4, "Rock_Gem_Ruby", 50, 1, 1, "Rare", "Рубин"),
            new WheelSlot(5, "Rock_Gem_Sapphire", 50, 1, 1, "Rare", "Сапфир"),
            new WheelSlot(6, "Rock_Gem_Topaz", 35, 1, 1, "Epic", "Топаз"),
            new WheelSlot(7, "Rock_Gem_Voidstone", 35, 1, 1, "Epic", "Камень пустоты"),
            new WheelSlot(8, "Rock_Gem_Zephyr", 35, 1, 1, "Epic", "Зефирит"),
            new WheelSlot(9, "Plant_Fruit_Azure", 100, 1, 5, "Common", "Лазурный фрукт"),
            new WheelSlot(10, "Bandage_Crude", 110, 1, 3, "Common", "Бинт"),
            new WheelSlot(11, "Potion_Health", 90, 1, 2, "Common", "Зелье исцеления")
    );

    private final List<ShopItem> shop;
    private final List<WheelSlot> wheel;
    private final List<WheelReward> wheelRewards;
    private final long version;
    private final boolean fromRemote;

    public MarketCatalog(List<ShopItem> shop, List<WheelSlot> wheel, List<WheelReward> wheelRewards, long version, boolean fromRemote) {
        this.shop = shop == null || shop.isEmpty() ? FALLBACK_SHOP : List.copyOf(shop);
        this.wheel = normalizeWheel(wheel);
        this.wheelRewards = wheelRewards == null ? List.of() : List.copyOf(wheelRewards);
        this.version = version;
        this.fromRemote = fromRemote;
    }

    /** Обратная совместимость: без списка наград (fallback). */
    public MarketCatalog(List<ShopItem> shop, List<WheelSlot> wheel, long version, boolean fromRemote) {
        this(shop, wheel, List.of(), version, fromRemote);
    }

    public static MarketCatalog fallback() {
        return new MarketCatalog(FALLBACK_SHOP, FALLBACK_WHEEL, List.of(), 0, false);
    }

    public static String officialRuItemName(String itemId) {
        if (itemId == null || itemId.isBlank()) {
            return "";
        }
        String override = WHEEL_DISPLAY_OVERRIDES.get(itemId);
        if (override != null) {
            return override;
        }
        return OFFICIAL_RU_ITEM_NAMES.getOrDefault(itemId, itemId);
    }

    public String wheelItemDisplayName(String itemId) {
        if (itemId == null || itemId.isBlank()) {
            return "";
        }
        for (WheelSlot slot : wheel) {
            if (itemId.equals(slot.itemId())) {
                return slot.resolvedDisplayName();
            }
        }
        return officialRuItemName(itemId);
    }

    public String wheelDisplayNameAtSector(int sectorIndex) {
        int sector = Math.floorMod(sectorIndex, 12);
        for (WheelSlot slot : wheel) {
            if (Math.floorMod(slot.slotIndex(), 12) == sector) {
                return slot.resolvedDisplayName();
            }
        }
        return wheelItemDisplayName(wheelSectorItemIds()[sector]);
    }

    /** Русская подпись редкости для UI. */
    public static String rarityLabel(String rarity) {
        if (rarity == null || rarity.isBlank()) {
            return "";
        }
        return switch (rarity.trim()) {
            case "Common" -> "Обычное";
            case "Uncommon" -> "Необычное";
            case "Rare" -> "Редкое";
            case "Epic" -> "Эпическое";
            case "Legendary" -> "Легендарное";
            default -> rarity;
        };
    }

    public boolean fromRemote() {
        return fromRemote;
    }

    public long version() {
        return version;
    }

    public List<ShopItem> shopItems() {
        return shop;
    }

    public List<WheelSlot> wheelSlots() {
        return wheel;
    }

    public static final int SHOP_PAGE_SIZE = 6;

    /** До 6 товаров для карточек UI по вкладке и странице (0-based). */
    public ShopItem[] shopForUi(String uiCategory, int page) {
        String tab = uiCategory == null || uiCategory.isBlank() ? "Build" : uiCategory.trim();
        List<ShopItem> filtered = new ArrayList<>();
        for (ShopItem item : shop) {
            if (tab.equalsIgnoreCase(resolveShopTab(item))) {
                filtered.add(item);
            }
        }
        int from = Math.max(0, page) * SHOP_PAGE_SIZE;
        if (from >= filtered.size()) return new ShopItem[0];
        int to = Math.min(from + SHOP_PAGE_SIZE, filtered.size());
        return filtered.subList(from, to).toArray(ShopItem[]::new);
    }

    public ShopItem[] shopForUi(String uiCategory) {
        return shopForUi(uiCategory, 0);
    }

    public int shopPageCount(String uiCategory) {
        String tab = uiCategory == null || uiCategory.isBlank() ? "Build" : uiCategory.trim();
        int count = 0;
        for (ShopItem item : shop) {
            if (tab.equalsIgnoreCase(resolveShopTab(item))) count++;
        }
        return Math.max(1, (count + SHOP_PAGE_SIZE - 1) / SHOP_PAGE_SIZE);
    }

    private static String resolveShopTab(ShopItem item) {
        String stored = item.uiCategory();
        if (stored != null && !stored.isBlank() && !LEGACY_UI_CATEGORIES.contains(stored.toLowerCase(Locale.ROOT))) {
            return stored;
        }
        return normalizeLegacyUiCategory(stored, item.itemId());
    }

    private static String normalizeLegacyUiCategory(String stored, String itemId) {
        if (stored != null && !stored.isBlank()) {
            return switch (stored.toLowerCase(Locale.ROOT)) {
                case "weapons" -> "Weapon";
                case "armor" -> "Armor";
                case "tools" -> "Tool";
                case "cosmetics" -> "Plant";
                default -> stored;
            };
        }
        return deriveItemPrefix(itemId);
    }

    private static String deriveItemPrefix(String itemId) {
        if (itemId == null || itemId.isBlank()) {
            return "";
        }
        int idx = itemId.indexOf('_');
        return idx > 0 ? itemId.substring(0, idx) : itemId;
    }

    public String[] wheelSectorItemIds() {
        String[] ids = new String[12];
        Arrays.fill(ids, "");
        for (WheelSlot slot : wheel) {
            int i = Math.floorMod(slot.slotIndex(), 12);
            ids[i] = slot.itemId();
        }
        for (int i = 0; i < ids.length; i++) {
            if (ids[i] == null || ids[i].isBlank()) {
                ids[i] = FALLBACK_WHEEL.get(i).itemId();
            }
        }
        return ids;
    }

    public int sectorIndexForItem(String itemId) {
        if (itemId == null) {
            return 0;
        }
        for (WheelSlot slot : wheel) {
            if (itemId.equals(slot.itemId())) {
                return Math.floorMod(slot.slotIndex(), 12);
            }
        }
        String[] ids = wheelSectorItemIds();
        for (int i = 0; i < ids.length; i++) {
            if (itemId.equals(ids[i])) {
                return i;
            }
        }
        return 0;
    }

    public String rarityForItem(String itemId) {
        if (itemId == null) {
            return "Common";
        }
        for (WheelSlot slot : wheel) {
            if (itemId.equals(slot.itemId()) && slot.rarity() != null && !slot.rarity().isBlank()) {
                return slot.rarity();
            }
        }
        for (ShopItem item : shop) {
            if (itemId.equals(item.itemId())) {
                return item.rarity();
            }
        }
        return "Common";
    }

    public static boolean isChestSlot(String itemId) {
        return itemId != null && itemId.startsWith("CHEST_");
    }

    private static String detectDirectSlotType(String itemId) {
        if (itemId == null) return "empty";
        if (itemId.startsWith("WHEEL_COINS_")) return "coins";
        if (itemId.startsWith("WHEEL_FREE_SPIN")) return "free_spin";
        if (itemId.startsWith("WHEEL_EMPTY")) return "empty";
        return "item";
    }

    public WheelReward pickChestReward(String rarity) {
        List<WheelReward> pool = new ArrayList<>();
        for (WheelReward r : wheelRewards) {
            if (rarity != null && rarity.equalsIgnoreCase(r.rarity())) {
                pool.add(r);
            }
        }
        if (pool.isEmpty()) return null;
        int total = 0;
        for (WheelReward r : pool) total += Math.max(1, r.weight());
        int roll = ThreadLocalRandom.current().nextInt(total);
        int acc = 0;
        for (WheelReward r : pool) {
            acc += Math.max(1, r.weight());
            if (roll < acc) return r;
        }
        return pool.get(pool.size() - 1);
    }

    public SpinResult pickWheelReward() {
        int total = 0;
        for (WheelSlot slot : wheel) {
            total += Math.max(1, slot.weight());
        }
        WheelSlot picked;
        if (total <= 0) {
            picked = wheel.get(0);
        } else {
            int roll = ThreadLocalRandom.current().nextInt(total);
            int acc = 0;
            picked = wheel.get(wheel.size() - 1);
            for (WheelSlot slot : wheel) {
                acc += Math.max(1, slot.weight());
                if (roll < acc) { picked = slot; break; }
            }
        }
        return buildSpinResult(picked);
    }

    private SpinResult buildSpinResult(WheelSlot slot) {
        int sectorIdx = Math.floorMod(slot.slotIndex(), 12);
        String slotItemId = slot.itemId();

        if (isChestSlot(slotItemId)) {
            WheelReward reward = pickChestReward(slot.rarity());
            if (reward != null) {
                return new SpinResult(
                        reward.itemId(),
                        reward.displayName(),
                        reward.quantity(),
                        sectorIdx,
                        slot.rarity(),
                        reward.rewardType(),
                        slotItemId
                );
            }
            // fallback: no rewards defined for this rarity
            return new SpinResult(null, slot.resolvedDisplayName(), 1, sectorIdx, slot.rarity(), "empty", slotItemId);
        }

        String rewardType = detectDirectSlotType(slotItemId);
        String actualItemId = "item".equals(rewardType) ? slotItemId : null;
        int qty = slot.rollQuantity();
        String displayName = slot.resolvedDisplayName();
        return new SpinResult(actualItemId, displayName, qty, sectorIdx, slot.rarity(), rewardType, null);
    }

    private static List<WheelSlot> normalizeWheel(List<WheelSlot> wheel) {
        if (wheel == null || wheel.isEmpty()) {
            return FALLBACK_WHEEL;
        }
        WheelSlot[] slots = new WheelSlot[12];
        for (WheelSlot s : wheel) {
            int i = Math.floorMod(s.slotIndex(), 12);
            slots[i] = s;
        }
        List<WheelSlot> out = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            if (slots[i] != null) {
                out.add(slots[i]);
            } else {
                out.add(FALLBACK_WHEEL.get(i));
            }
        }
        return List.copyOf(out);
    }
}

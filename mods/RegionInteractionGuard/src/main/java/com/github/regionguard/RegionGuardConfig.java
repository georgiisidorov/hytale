package com.github.regionguard;

import com.hypixel.hytale.logger.HytaleLogger;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

final class RegionGuardConfig {
    private static final String FILE_NAME = "rules.txt";

    /** Set in {@link #init}; used by preview debug logging. */
    private static volatile HytaleLogger pluginLogger;

    static HytaleLogger logger() {
        return pluginLogger;
    }

    static final class Rules {
        final Set<String> protectedRegions;
        final Set<String> blockedBlockIds;
        final boolean blockItemPickup;
        /** Log interaction-chain scan / cancel decisions (rate-limited per player). */
        final boolean debugPreview;
        /** Minimum seconds between debug log lines per player. */
        final int debugPreviewIntervalSec;

        Rules(
            Set<String> protectedRegions,
            Set<String> blockedBlockIds,
            boolean blockItemPickup,
            boolean debugPreview,
            int debugPreviewIntervalSec
        ) {
            this.protectedRegions = protectedRegions;
            this.blockedBlockIds = blockedBlockIds;
            this.blockItemPickup = blockItemPickup;
            this.debugPreview = debugPreview;
            this.debugPreviewIntervalSec = debugPreviewIntervalSec;
        }
    }

    private static volatile Rules currentRules = new Rules(
        defaultRegions(),
        defaultBlockedBlockIds(),
        true,
        false,
        5
    );

    private RegionGuardConfig() {}

    static void init(File dataDir, HytaleLogger logger) {
        pluginLogger = logger;
        if (!dataDir.exists()) {
            dataDir.mkdirs();
        }
        File rulesFile = new File(dataDir, FILE_NAME);
        if (!rulesFile.exists()) {
            try {
                writeDefaultConfig(rulesFile);
            } catch (IOException e) {
                logger.atSevere().withCause(e).log("Failed to create default RegionInteractionGuard config.");
            }
        }
        reload(rulesFile, logger);
    }

    static Rules current() {
        return currentRules;
    }

    private static void reload(File rulesFile, HytaleLogger logger) {
        Set<String> regions = defaultRegions();
        Set<String> blockedIds = defaultBlockedBlockIds();
        boolean blockPickup = true;
        boolean debugPreview = false;
        int debugIntervalSec = 5;

        try {
            List<String> lines = Files.readAllLines(rulesFile.toPath(), StandardCharsets.UTF_8);
            for (String raw : lines) {
                String line = raw.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                int eq = line.indexOf('=');
                if (eq <= 0) continue;
                String key = normalize(line.substring(0, eq));
                String value = line.substring(eq + 1).trim();

                switch (key) {
                    case "regions" -> {
                        Set<String> parsed = parseCsv(value);
                        if (!parsed.isEmpty()) regions = parsed;
                    }
                    case "blocked_block_ids", "blocked_ids", "blocked_blocks" -> {
                        Set<String> parsed = parseCsv(value);
                        if (!parsed.isEmpty()) blockedIds = parsed;
                    }
                    case "block_item_pickup", "disable_item_pickup" -> {
                        blockPickup = parseBoolean(value, true);
                    }
                    case "debug_preview", "debug_interaction_preview" -> {
                        debugPreview = parseBoolean(value, false);
                    }
                    case "debug_preview_interval_sec", "debug_preview_interval" -> {
                        debugIntervalSec = parsePositiveInt(value, debugIntervalSec);
                    }
                    default -> {
                    }
                }
            }
            currentRules = new Rules(regions, blockedIds, blockPickup, debugPreview, debugIntervalSec);
        } catch (Exception e) {
            logger.atSevere().withCause(e).log("Failed to read RegionInteractionGuard config; using defaults.");
            currentRules = new Rules(defaultRegions(), defaultBlockedBlockIds(), true, false, 5);
        }
    }

    private static int parsePositiveInt(String raw, int fallback) {
        try {
            int v = Integer.parseInt(normalize(raw).replace(" ", ""));
            return v >= 1 ? v : fallback;
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static boolean parseBoolean(String raw, boolean fallback) {
        String v = normalize(raw);
        if (v.equals("true") || v.equals("1") || v.equals("yes")) return true;
        if (v.equals("false") || v.equals("0") || v.equals("no")) return false;
        return fallback;
    }

    private static Set<String> parseCsv(String raw) {
        Set<String> out = new HashSet<>();
        for (String item : raw.split(",")) {
            String n = normalize(item);
            if (!n.isEmpty()) out.add(n);
        }
        return out;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static void writeDefaultConfig(File target) throws IOException {
        StringBuilder sb = new StringBuilder();
        sb.append("# RegionInteractionGuard config").append('\n');
        sb.append("# regions: WorldProtect region ids (idLower)").append('\n');
        sb.append("regions=").append(String.join(",", defaultRegions())).append('\n');
        sb.append('\n');
        sb.append("# block item pickup inside configured regions").append('\n');
        sb.append("block_item_pickup=true").append('\n');
        sb.append('\n');
        sb.append("# legacy: раньше использовалось для блоков; сейчас игнорируется (совместимость со старыми rules.txt)").append('\n');
        sb.append("blocked_block_ids=").append(String.join(",", defaultBlockedBlockIds())).append('\n');
        sb.append('\n');
        sb.append("# debug: server log — interaction chains scanned / cancelled (rate-limited per player)").append('\n');
        sb.append("debug_preview=false").append('\n');
        sb.append("debug_preview_interval_sec=5").append('\n');
        Files.writeString(target.toPath(), sb.toString(), StandardCharsets.UTF_8);
    }

    private static Set<String> defaultRegions() {
        return setOf(
            "spawn",
            "countryside"
        );
    }

    private static Set<String> defaultBlockedBlockIds() {
        return setOf(
            "Furniture_Village_Brazier",
            "Deco_Lantern_Ceiling",
            "Furniture_Human_Ruins_Trapdoor",
            "Wood_Torch_Wall",
            "Plant_Flower_Orchid_Cyan",
            "Plant_Flower_Flax_Blue",
            "Rubble_Quartzite",
            "Rubble_Stone",
            "Rubble_Stone_Medium",
            "Plant_Crop_Berry_Block",
            "Plant_Flower_Common_Red2",
            "Bench_Cooking",
            "Plant_Cactus_Flower",
            "Deco_Lantern",
            "Furniture_Crude_Door",
            "Plant_Crop_Wheat_Block",
            "Plant_Crop_Corn_Block",
            "Plant_Crop_Lettuce_Block",
            "Furniture_Temple_Dark_Candle",
            "Furniture_Temple_Light_Brazier",
            "Potion_Mana_Large",
            "Furniture_Tavern_Chandelier",
            "Furniture_Ancient_Trapdoor",
            "Furniture_Ancient_Candle",
            "Furniture_Lumberjack_Lantern",
            "Furniture_Lumberjack_Lantern_Ceiling",
            "Furniture_Human_Ruins_Bed",
            "Furniture_Lumberjack_Chest_Small",
            "Furniture_Crude_Chest_Small",
            "Plant_Crop_Health1",
            "Wood_Sticks",
            "Plant_Flower_Tall_Yellow",
            "Plant_Flower_Common_Yellow",
            "Plant_Flower_Common_Yellow2",
            "Plant_Crop_Carrot_Block",
            "Plant_Flower_Common_Cyan2",
            "Plant_Flower_Common_Violet",
            "Teleporter",
            "Furniture_Human_Ruins_Lantern",
            "Furniture_Temple_Dark_Door",
            "Furniture_Human_Ruins_Brazier",
            "Furniture_Human_Ruins_Lantern_Ceiling",
            "Furniture_Crude_Torch",
            "Furniture_Kweebec_Trapdoor",
            "Ingredient_Spices",
            "Furniture_Ancient_Bed",
            "Furniture_Crude_Candle",
            "Ingredient_Salt",
            "Ingredient_Flour",
            "Furniture_Tavern_Bed",
            "Deco_Tankard",
            "Plant_Crop_Potato_Item",
            "Potion_Health_Lesser",
            "Potion_Poison_Minor",
            "Potion_Regen_Stamina_Small",
            "Deco_Mug",
            "Plant_Flower_Common_White2",
            "Plant_Crop_Mushroom_Cap_Brown",
            "Furniture_Village_Trapdoor",
            "Potion_Empty_Large",
            "Furniture_Tavern_Candle",
            "Rubble_Basalt",
            "Furniture_Royal_Magic_Potion_Glow",
            "Deco_Kweebec_Plush",
            "Deco_Coral_Shell",
            "Furniture_Lumberjack_Trapdoor",
            "Bench_Trough"
        );
    }

    private static Set<String> setOf(String... items) {
        Set<String> set = new HashSet<>();
        Arrays.stream(items)
            .map(RegionGuardConfig::normalize)
            .filter(s -> !s.isEmpty())
            .forEach(set::add);
        return set;
    }
}


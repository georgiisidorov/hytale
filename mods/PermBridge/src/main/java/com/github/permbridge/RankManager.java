package com.github.permbridge;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.hypixel.hytale.logger.HytaleLogger;
import com.hypixel.hytale.server.core.permissions.PermissionsModule;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

class RankManager {

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private final Path ranksFile;
    private final Path playerRanksFile;
    private final HytaleLogger log;

    // rankName → permissions (из ranks.json)
    private final Map<String, RankDef> ranks = new LinkedHashMap<>();
    // uuid → rankName (наше хранилище, НЕ permissions.json)
    private final Map<UUID, String> playerRanks = new ConcurrentHashMap<>();

    private String defaultRank = "Adventurer";

    RankManager(Path dataDirectory, HytaleLogger log) {
        this.ranksFile = dataDirectory.resolve("ranks.json");
        this.playerRanksFile = dataDirectory.resolve("player_ranks.json");
        this.log = log;
    }

    record RankDef(Set<String> permissions) {}

    // -----------------------------------------------------------------------
    // Загрузка конфигов
    // -----------------------------------------------------------------------

    void load() {
        loadRanks();
        loadPlayerRanks();
    }

    private void loadRanks() {
        ranks.clear();

        if (!Files.exists(ranksFile)) {
            createDefaultRanksFile();
        }

        try (BufferedReader reader = Files.newBufferedReader(ranksFile)) {
            JsonObject root = GSON.fromJson(reader, JsonObject.class);
            if (root == null) {
                log.atWarning().log("[PermBridge] ranks.json пустой или повреждён");
                return;
            }
            if (root.has("default_rank")) {
                defaultRank = root.get("default_rank").getAsString();
            }
            JsonObject ranksObj = root.getAsJsonObject("ranks");
            if (ranksObj == null) return;

            for (Map.Entry<String, JsonElement> entry : ranksObj.entrySet()) {
                JsonObject data = entry.getValue().getAsJsonObject();
                Set<String> perms = new LinkedHashSet<>();
                JsonArray arr = data.getAsJsonArray("permissions");
                if (arr != null) for (JsonElement p : arr) perms.add(p.getAsString());
                ranks.put(entry.getKey(), new RankDef(perms));
            }
            log.atInfo().log("[PermBridge] Ранги загружены: " + String.join(", ", ranks.keySet()));

        } catch (IOException e) {
            log.atWarning().log("[PermBridge] Ошибка чтения ranks.json: " + e.getMessage());
        }
    }

    private void loadPlayerRanks() {
        playerRanks.clear();

        if (!Files.exists(playerRanksFile)) {
            log.atInfo().log("[PermBridge] player_ranks.json не найден, будет создан при первом назначении");
            return;
        }

        try (BufferedReader reader = Files.newBufferedReader(playerRanksFile)) {
            JsonObject root = GSON.fromJson(reader, JsonObject.class);
            if (root == null) return;
            for (Map.Entry<String, JsonElement> entry : root.entrySet()) {
                try {
                    playerRanks.put(UUID.fromString(entry.getKey()), entry.getValue().getAsString());
                } catch (Exception ignored) {}
            }
            log.atInfo().log("[PermBridge] Загружено назначений рангов: " + playerRanks.size());
        } catch (IOException e) {
            log.atWarning().log("[PermBridge] Ошибка чтения player_ranks.json: " + e.getMessage());
        }
    }

    private void savePlayerRanks() {
        JsonObject root = new JsonObject();
        for (Map.Entry<UUID, String> entry : playerRanks.entrySet()) {
            root.addProperty(entry.getKey().toString(), entry.getValue());
        }
        try {
            Files.createDirectories(playerRanksFile.getParent());
            try (BufferedWriter writer = Files.newBufferedWriter(playerRanksFile)) {
                GSON.toJson(root, writer);
            }
        } catch (IOException e) {
            log.atWarning().log("[PermBridge] Ошибка записи player_ranks.json: " + e.getMessage());
        }
    }

    // -----------------------------------------------------------------------
    // Инъекция прав
    // -----------------------------------------------------------------------

    void injectPermissions(PermissionsModule module) {
        for (Map.Entry<String, RankDef> entry : ranks.entrySet()) {
            module.addGroupPermission(entry.getKey(), Set.copyOf(entry.getValue().permissions()));
        }
        // Дублируем базовый ранг в hytale:Adventurer — движок кладёт туда новых игроков
        RankDef base = ranks.get(defaultRank);
        if (base != null) {
            module.addGroupPermission("hytale:Adventurer", Set.copyOf(base.permissions()));
        }
        log.atInfo().log("[PermBridge] Права рангов применены");
    }

    // -----------------------------------------------------------------------
    // Назначение рангов
    // -----------------------------------------------------------------------

    /** Устанавливает ранг игрока. Права применяются через providerGroup в PermissionsModule. */
    void setRank(UUID uuid, String rankName, PermissionsModule module) {
        // Удаляем из всех наших кастомных групп в провайдере
        for (String existingRank : ranks.keySet()) {
            if (!existingRank.equals(defaultRank)) {
                try { module.removeUserFromGroup(uuid, existingRank); } catch (Exception ignored) {}
            }
        }

        // Добавляем новую группу (если не базовый ранг — у него hytale:Adventurer уже есть)
        if (!rankName.equals(defaultRank)) {
            module.addUserToGroup(uuid, rankName);
        }

        // Наш собственный реестр ранга
        playerRanks.put(uuid, rankName);
        savePlayerRanks();
    }

    /** Возвращает ранг игрока из нашего реестра (без "hytale:" мусора). */
    String getRank(UUID uuid) {
        return playerRanks.getOrDefault(uuid, defaultRank);
    }

    /** Все uuid → ранг из нашего реестра. */
    Map<UUID, String> getAllPlayerRanks() {
        return Map.copyOf(playerRanks);
    }

    // -----------------------------------------------------------------------
    // Геттеры
    // -----------------------------------------------------------------------

    String getDefaultRank()            { return defaultRank; }
    Set<String> getRankNames()         { return ranks.keySet(); }
    boolean isValidRank(String name)   { return ranks.containsKey(name); }

    // -----------------------------------------------------------------------
    // Создание ranks.json по умолчанию
    // -----------------------------------------------------------------------

    private void createDefaultRanksFile() {
        String[] basePerms = {
            "rank.adventurer",
            "worldprotect.claim", "worldprotect", "worldprotect.addmember",
            "worldprotect.redefine", "worldprotect.removemember", "worldprotect.menu",
            "worldprotect.limit.default", "autoclaim", "worldprotect.select",
            "rg", "worldprotect.remove", "worldprotect.wand", "worldprotect.wand.clear",
            "wp", "claim", "region"
        };

        JsonObject root = new JsonObject();
        root.addProperty("default_rank", "Adventurer");
        JsonObject ranksObj = new JsonObject();

        ranksObj.add("Adventurer", makeRank(basePerms));

        ranksObj.add("VIP", makeRank(concat(basePerms, new String[]{
            "rank.vip", "worldprotect.limit.vip"
        })));

        ranksObj.add("Admin", makeRank(concat(basePerms, new String[]{
            "rank.vip", "rank.admin", "worldprotect.limit.vip",
            "worldprotect.*", "worldprotect.bypass", "worldprotect.menu.others",
            "worldprotect.limit.admin", "worldprotect.reload",
            "worldprotect.define", "worldprotect.setparent", "worldprotect.setpriority",
            "worldprotect.addowner", "worldprotect.removeowner",
            "hytale.command.spawn", "hytale.command.setspawn",
            "hytale.world_map.teleport.marker",
            "bettermap.command.teleport", "bettermap.marker.create", "bettermap.*",
            "Custom.*", "dev.worldprotect.*"
        })));

        ranksObj.add("OP", makeRank(new String[]{
            "rank.adventurer", "rank.vip", "rank.admin", "rank.op",
            "*", "hytale.*", "worldprotect.*", "bettermap.*", "Custom.*", "dev.worldprotect.*",
            "hytale.editor.builderTools", "hytale.world_map.teleport.marker",
            "hytale.npc.command.npc", "hytale.command.spawn", "hytale.command.setspawn",
            "bettermap.command.teleport", "bettermap.marker.create",
            "rg", "region", "wp", "worldprotect", "claim", "autoclaim"
        }));

        root.add("ranks", ranksObj);

        try {
            Files.createDirectories(ranksFile.getParent());
            try (BufferedWriter writer = Files.newBufferedWriter(ranksFile)) {
                GSON.toJson(root, writer);
            }
            log.atInfo().log("[PermBridge] Создан ranks.json: " + ranksFile);
        } catch (IOException e) {
            log.atWarning().log("[PermBridge] Не удалось создать ranks.json: " + e.getMessage());
        }
    }

    private static JsonObject makeRank(String[] perms) {
        JsonObject obj = new JsonObject();
        JsonArray arr = new JsonArray();
        for (String p : perms) arr.add(p);
        obj.add("permissions", arr);
        return obj;
    }

    private static String[] concat(String[] a, String[] b) {
        String[] result = new String[a.length + b.length];
        System.arraycopy(a, 0, result, 0, a.length);
        System.arraycopy(b, 0, result, a.length, b.length);
        return result;
    }
}

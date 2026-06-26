package com.github.permbridge;

import com.hypixel.hytale.server.core.permissions.PermissionsModule;
import com.hypixel.hytale.server.core.permissions.provider.HytalePermissionsProvider;
import com.hypixel.hytale.server.core.permissions.provider.PermissionProvider;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public class PermBridgePlugin extends JavaPlugin {

    // Дополнительные прямые права для OP-пользователей (поверх Admin-ранга)
    private static final Set<String> OP_DIRECT_PERMS = Set.of(
        "worldprotect.*", "worldprotect.bypass", "worldprotect.menu",
        "worldprotect.menu.others", "worldprotect.define", "worldprotect.claim",
        "worldprotect.redefine", "worldprotect.select", "worldprotect.addmember",
        "worldprotect.removemember", "worldprotect.addowner", "worldprotect.removeowner",
        "worldprotect.remove", "worldprotect.setparent", "worldprotect.setpriority",
        "worldprotect.reload", "worldprotect.wand", "worldprotect.wand.clear",
        "worldprotect.limit.admin", "worldprotect.limit.vip", "worldprotect.limit.regular",
        "worldprotect.limit.default", "worldprotect.flag.pvp", "worldprotect.flag.build",
        "worldprotect.flag.entry", "worldprotect.flag.notify", "worldprotect.flag.greeting",
        "worldprotect.flag.farewell", "worldprotect.flag.falldamage", "worldprotect.flag.mobdamage",
        "worldprotect.flag.mobspawning", "worldprotect.flag.map", "worldprotect.flag.color",
        "worldprotect.flag.chestaccess", "worldprotect.flag.use", "worldprotect.flag.dooraccess",
        "worldprotect.flag.lightaccess", "worldprotect.flag.firespread", "worldprotect.flag.itempickup",
        "worldprotect.flag.itemdrop", "worldprotect.flag.blockedcmds",
        "dev.worldprotect.*",
        "rg", "region", "wp", "worldprotect", "claim", "autoclaim",
        "hytale.*", "*", "bettermap.*", "Custom.*",
        "hytale.editor.builderTools", "hytale.world_map.teleport.marker",
        "hytale.npc.command.npc", "hytale.command.spawn", "hytale.command.setspawn",
        "bettermap.command.teleport", "bettermap.marker.create",
        "rank.op", "rank.admin", "rank.vip", "rank.regular", "rank.adventurer"
    );

    private static final UUID[] OP_UUIDS = {
        UUID.fromString("c9f4f660-b133-43a2-8b85-4a11dad13363"), // VerdantSpark319
    };

    public PermBridgePlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void start() {
        PermissionsModule module = PermissionsModule.get();
        if (module == null) {
            getLogger().atWarning().log("[PermBridge] PermissionsModule недоступен");
            return;
        }

        getLogger().atInfo().log("[PermBridge] Провайдеры: " + module.getProviders().stream()
            .map(p -> p.getClass().getSimpleName()).toList());

        // Гарантируем наличие нативного провайдера
        List<PermissionProvider> providers = module.getProviders();
        boolean hasNative = providers.stream().anyMatch(p -> p instanceof HytalePermissionsProvider);
        if (!hasNative) {
            module.addProvider(new HytalePermissionsProvider());
            getLogger().atInfo().log("[PermBridge] Добавлен HytalePermissionsProvider");
        }

        // Загружаем ранги из ranks.json и инжектируем права групп
        RankManager rankManager = new RankManager(getDataDirectory(), getLogger());
        rankManager.load();
        rankManager.injectPermissions(module);

        // Прямые права для OP-игроков (поверх группового наследования)
        for (UUID uuid : OP_UUIDS) {
            module.addUserPermission(uuid, OP_DIRECT_PERMS);
            getLogger().atInfo().log("[PermBridge] Прямые OP-права → " + uuid);
        }

        // Регистрируем команду /rank
        getCommandRegistry().registerCommand(new RankCommand(rankManager, module));
        getLogger().atInfo().log("[PermBridge] /rank зарегистрирован");
    }
}

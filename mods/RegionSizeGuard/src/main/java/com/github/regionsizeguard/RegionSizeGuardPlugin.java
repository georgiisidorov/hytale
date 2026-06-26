package com.github.regionsizeguard;

import com.hypixel.hytale.event.EventPriority;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.event.events.player.AddPlayerToWorldEvent;
import com.hypixel.hytale.server.core.permissions.PermissionsModule;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import dev.worldprotect.worldprotect.api.WorldProtectApiProvider;
import dev.worldprotect.worldprotect.api.WorldProtectRegionBounds;
import dev.worldprotect.worldprotect.api.WorldProtectRegionChange;
import dev.worldprotect.worldprotect.api.WorldProtectRegionChangeType;
import dev.worldprotect.worldprotect.api.WorldProtectRegionListener;
import dev.worldprotect.worldprotect.api.WorldProtectRegionSnapshot;

import java.awt.Color;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class RegionSizeGuardPlugin extends JavaPlugin {

    private static final int MAX_DIM = 25;

    private final ConcurrentHashMap<UUID, PlayerRef> onlinePlayers = new ConcurrentHashMap<>();

    private final WorldProtectRegionListener listener = new WorldProtectRegionListener() {
        @Override
        public void onRegionCreated(WorldProtectRegionSnapshot region) {
            enforceSize(region);
        }

        @Override
        public void onRegionChanged(WorldProtectRegionChange change) {
            if (change.type() == WorldProtectRegionChangeType.GENERAL) {
                enforceSize(change.region());
            }
        }
    };

    public RegionSizeGuardPlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void setup() {}

    @Override
    protected void start() {
        getEventRegistry().registerGlobal(EventPriority.LATE, AddPlayerToWorldEvent.class, event -> {
            try {
                com.hypixel.hytale.component.Holder<
                    com.hypixel.hytale.server.core.universe.world.storage.EntityStore> holder =
                        event.getHolder();
                PlayerRef pr = holder.getComponent(PlayerRef.getComponentType());
                if (pr != null) {
                    onlinePlayers.put(pr.getUuid(), pr);
                }
            } catch (Throwable ignored) {}
        });

        if (!WorldProtectApiProvider.isAvailable()) {
            getLogger().atWarning().log("[RegionSizeGuard] WorldProtect API недоступен — проверьте порядок загрузки");
            return;
        }

        WorldProtectApiProvider.getApi().registerListener(listener);
        getLogger().atInfo().log("[RegionSizeGuard] запущен, лимит измерений: %d", MAX_DIM);
    }

    @Override
    protected void shutdown() {
        try {
            if (WorldProtectApiProvider.isAvailable()) {
                WorldProtectApiProvider.getApi().unregisterListener(listener);
            }
        } catch (Throwable ignored) {}
    }

    private void enforceSize(WorldProtectRegionSnapshot region) {
        WorldProtectRegionBounds b = region.bounds();
        int dx = b.maxX() - b.minX() + 1;
        int dy = b.maxY() - b.minY() + 1;
        int dz = b.maxZ() - b.minZ() + 1;

        if (dx <= MAX_DIM && dy <= MAX_DIM && dz <= MAX_DIM) return;

        for (UUID ownerUuid : region.owners()) {
            if (hasBypass(ownerUuid)) return;
        }

        Universe universe = Universe.get();
        if (universe == null) return;
        World world = universe.getWorlds().get(region.worldName());
        if (world == null) return;

        boolean deleted = WorldProtectApiProvider.getApi().deleteRegion(world, region.id());
        if (!deleted) return;

        String msg = String.format(
            "[⚠️ Ошибка привата] Слишком большой размах! Вы выделили %d×%d×%d блоков, но ваш максимум — 25×25×25.",
            dx, dy, dz
        );

        for (UUID ownerUuid : region.owners()) {
            PlayerRef pr = onlinePlayers.get(ownerUuid);
            if (pr != null && pr.isValid()) {
                try {
                    pr.sendMessage(Message.raw(msg).color(Color.RED));
                } catch (Throwable ignored) {}
            }
        }

        getLogger().atInfo().log("[RegionSizeGuard] удалён регион %s в %s: %dx%dx%d",
            region.id(), region.worldName(), dx, dy, dz);
    }

    private boolean hasBypass(UUID uuid) {
        try {
            PermissionsModule perms = PermissionsModule.get();
            if (perms == null) return false;
            Set<String> groups = perms.getGroupsForUser(uuid);
            if (groups == null) return false;
            return groups.contains("admin") || groups.contains("op")
                || groups.contains("ADMIN") || groups.contains("OP");
        } catch (Throwable ignored) {
            return false;
        }
    }
}

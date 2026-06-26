package com.github.regionskillguard;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.math.vector.Transform;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import dev.worldprotect.worldprotect.api.WorldProtectApiProvider;
import dev.worldprotect.worldprotect.api.WorldProtectRegionSnapshot;
import org.joml.Vector3d;
import org.zuxaw.plugin.api.ExperienceGainedEvent;
import org.zuxaw.plugin.api.ExperienceGainedListener;
import org.zuxaw.plugin.api.RPGLevelingAPI;

import java.util.List;
import java.util.UUID;

public class RegionSkillGuardPlugin extends JavaPlugin {

    private ExperienceGainedListener xpListener;

    public RegionSkillGuardPlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void start() {
        if (!RPGLevelingAPI.isAvailable()) {
            getLogger().atWarning().log("[RegionSkillGuard] RPGLevelingAPI not available — XP guard disabled");
            return;
        }
        if (!WorldProtectApiProvider.isAvailable()) {
            getLogger().atWarning().log("[RegionSkillGuard] WorldProtectApi not available — XP guard disabled");
            return;
        }

        xpListener = this::onXpGained;
        RPGLevelingAPI.get().registerExperienceGainedListener(xpListener);
        getLogger().atInfo().log("[RegionSkillGuard] XP guard active — blocks XP on other players' claimed regions");
    }

    private void onXpGained(ExperienceGainedEvent event) {
        try {
            PlayerRef playerRef = event.getPlayer();
            if (playerRef == null || !playerRef.isValid()) return;

            UUID playerUuid = playerRef.getUuid();

            Ref<EntityStore> entityRef = playerRef.getReference();
            if (entityRef == null || !entityRef.isValid()) return;
            Store<EntityStore> store = entityRef.getStore();
            Player player = store.getComponent(entityRef, Player.getComponentType());
            if (player == null) return;
            World world = player.getWorld();
            if (world == null) return;
            String worldName = world.getName();

            Transform transform = playerRef.getTransform();
            if (transform == null) return;
            Vector3d pos = transform.getPosition();
            if (pos == null) return;
            int x = (int) Math.floor(pos.x);
            int y = (int) Math.floor(pos.y);
            int z = (int) Math.floor(pos.z);

            List<WorldProtectRegionSnapshot> regions = WorldProtectApiProvider.getApi()
                .getRegionsAt(worldName, x, y, z);
            if (regions == null || regions.isEmpty()) return;

            for (WorldProtectRegionSnapshot region : regions) {
                // Skip __global__ and admin-defined regions with no owners
                if (region.owners().isEmpty()) continue;
                // Cancel XP if player is not an owner or trusted member of this region
                if (!region.isOwnerOrMember(playerUuid)) {
                    event.setCancelled(true);
                    return;
                }
            }
        } catch (Throwable ignored) {
            // Fail open: if we can't determine ownership, let XP through
        }
    }
}

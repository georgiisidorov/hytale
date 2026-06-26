package com.github.wpmapcompat;

import com.hypixel.hytale.event.EventPriority;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.event.events.player.PlayerReadyEvent;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import com.hypixel.hytale.server.core.universe.world.World;
import java.util.logging.Logger;

/**
 * map.enabled=false + оверлей RegionImageBuilder. Подписи spawn/countryside убираются здесь, WorldProtect.jar не патчим.
 */
public final class WorldProtectBetterMapCompatPlugin extends JavaPlugin {

    private static final Logger LOG = Logger.getLogger("WorldProtectBetterMapCompat");

    public WorldProtectBetterMapCompatPlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void setup() {
        getEventRegistry()
            .registerGlobal(EventPriority.LAST, PlayerReadyEvent.class, this::onPlayerReady);
    }

    @Override
    protected void start() {
        WpMapCompat.lockMapDisabled(LOG);
        getLogger()
            .atInfo()
            .log(
                "[WpMapCompat] map.enabled=false; рельеф BetterMap + зоны WP; без подписей spawn/countryside.");
    }

    private void onPlayerReady(PlayerReadyEvent event) {
        Player player = event.getPlayer();
        if (player == null) {
            return;
        }
        World world = player.getWorld();
        if (world == null) {
            return;
        }
        world.execute(() -> WpMapCompat.ensureWorld(world, LOG));
    }
}

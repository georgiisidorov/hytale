package com.github.wpmapcompat;

import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.worldmap.IWorldMap;
import com.hypixel.hytale.server.core.universe.world.worldmap.WorldMapManager;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

final class WpMapCompat {

    private WpMapCompat() {}

    static void lockMapDisabled(Logger log) {
        writeConfigMapEnabledFalse(log);
        WorldProtectBridge.disableMapInRuntime();
    }

    static void ensureAllWorlds(Logger log) {
        Universe universe = Universe.get();
        if (universe == null) {
            return;
        }
        for (World world : universe.getWorlds().values()) {
            if (world != null) {
                ensureWorld(world, log);
            }
        }
    }

    /**
     * Оверлей регионов (заливка + подписи) поверх текущего генератора BetterMap.
     * WorldConfig не трогаем — иначе ломается lobby.
     */
    static void ensureWorld(World world, Logger log) {
        if (world == null) {
            return;
        }
        try {
            WorldMapManager manager = world.getWorldMapManager();
            if (manager == null) {
                return;
            }
            IWorldMap current = manager.getGenerator();
            if (current instanceof TerrainWithRegionOverlayMap) {
                return;
            }
            if (WorldProtectBridge.isWorldProtectOnlyGenerator(current)) {
                log.warning(
                    "[WpMapCompat] "
                        + world.getName()
                        + ": WorldProtectChunkWorldMap — нужен map.enabled=false и рестарт.");
                return;
            }
            if (current == null) {
                return;
            }
            IWorldMap composite = new TerrainWithRegionOverlayMap(current);
            if (WorldMapReflection.setGeneratorQuiet(manager, composite)) {
                log.info(
                    "[WpMapCompat] "
                        + world.getName()
                        + ": рельеф + зоны WP (без подписей spawn/countryside).");
            }
        } catch (Exception e) {
            log.log(
                Level.WARNING,
                "[WpMapCompat] " + world.getName() + ": " + e.getMessage(),
                e);
        }
    }

    private static void writeConfigMapEnabledFalse(Logger log) {
        Path config =
            Path.of("mods", "WorldProtect", "config", "config.properties").toAbsolutePath();
        if (!Files.isRegularFile(config)) {
            return;
        }
        try {
            List<String> lines = Files.readAllLines(config, StandardCharsets.UTF_8);
            boolean changed = false;
            boolean found = false;
            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i).strip();
                if (line.startsWith("map.enabled=")) {
                    found = true;
                    if (!line.equals("map.enabled=false")) {
                        lines.set(i, "map.enabled=false");
                        changed = true;
                    }
                    break;
                }
            }
            if (!found) {
                lines.add("map.enabled=false");
                changed = true;
            }
            if (changed) {
                Files.write(config, lines, StandardCharsets.UTF_8);
                log.info("[WpMapCompat] WorldProtect config: map.enabled=false");
            }
        } catch (Exception e) {
            log.warning("[WpMapCompat] config: " + e.getMessage());
        }
    }
}

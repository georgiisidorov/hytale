package com.github.wpmapcompat;

import com.hypixel.hytale.protocol.packets.worldmap.MapImage;
import com.hypixel.hytale.protocol.packets.worldmap.MapMarker;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.map.WorldMap;
import com.hypixel.hytale.server.core.universe.world.worldmap.IWorldMap;
import com.hypixel.hytale.server.core.universe.world.worldmap.WorldMapSettings;
import it.unimi.dsi.fastutil.longs.Long2ObjectMap;
import it.unimi.dsi.fastutil.longs.LongIterator;
import it.unimi.dsi.fastutil.longs.LongSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;

/** Рельеф от BetterMap/ванилы + заливка регионов WorldProtect. */
final class TerrainWithRegionOverlayMap implements IWorldMap {

    /** Prod: не блокировать BetterMap, если WP overlay ждёт непрогруженные чанки. */
    private static final long OVERLAY_TIMEOUT_MS = 2500L;
    private static final Logger LOG = Logger.getLogger("WorldProtectBetterMapCompat");

    private final IWorldMap terrain;

    TerrainWithRegionOverlayMap(IWorldMap terrain) {
        this.terrain = terrain;
    }

    IWorldMap terrainDelegate() {
        return terrain;
    }

    @Override
    public WorldMapSettings getWorldMapSettings() {
        return terrain.getWorldMapSettings();
    }

    @Override
    public CompletableFuture<WorldMap> generate(World world, int chunkX, int chunkZ, LongSet chunks) {
        return terrain
            .generate(world, chunkX, chunkZ, chunks)
            .thenCompose(
                worldMap -> {
                    if (worldMap == null || chunks == null || chunks.isEmpty()) {
                        return CompletableFuture.completedFuture(worldMap);
                    }
                    Long2ObjectMap<MapImage> chunkImages = worldMap.getChunks();
                    if (chunkImages == null || chunkImages.isEmpty()) {
                        return CompletableFuture.completedFuture(worldMap);
                    }

                    List<CompletableFuture<Void>> pending = new ArrayList<>();
                    LongIterator it = chunks.iterator();
                    while (it.hasNext()) {
                        long index = it.nextLong();
                        MapImage base = chunkImages.get(index);
                        pending.add(
                            WorldProtectBridge.overlayChunk(world, index, chunkX, chunkZ, base));
                    }

                    if (pending.isEmpty()) {
                        return CompletableFuture.completedFuture(worldMap);
                    }
                    return CompletableFuture.allOf(pending.toArray(CompletableFuture[]::new))
                        .orTimeout(OVERLAY_TIMEOUT_MS, TimeUnit.MILLISECONDS)
                        .handle(
                            (ignored, err) -> {
                                if (err != null) {
                                    LOG.log(
                                        Level.FINE,
                                        "[WpMapCompat] overlay timeout "
                                            + chunkX
                                            + ","
                                            + chunkZ
                                            + " — рельеф без зон",
                                        err);
                                }
                                return worldMap;
                            });
                });
    }

    @Override
    public CompletableFuture<Map<String, MapMarker>> generatePointsOfInterest(World world) {
        return terrain.generatePointsOfInterest(world);
    }
}

package com.github.wpmapcompat;

import com.hypixel.hytale.protocol.packets.worldmap.MapImage;
import com.hypixel.hytale.server.core.plugin.PluginBase;
import com.hypixel.hytale.server.core.plugin.PluginManager;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.worldmap.IWorldMap;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/** Вызовы WorldProtect через reflection (jar не патчим). */
final class WorldProtectBridge {

    private static final String WP_CHUNK_MAP =
        "dev.worldprotect.worldprotect.map.WorldProtectChunkWorldMap";
    private static final String REGION_BUILDER =
        "dev.worldprotect.worldprotect.map.RegionImageBuilder";
    private static final String WP_PLUGIN = "dev.worldprotect.worldprotect.WorldProtectPlugin";

    private static volatile Object wpChunkMapInstance;
    private static volatile Method regionBuild;
    private static volatile Method regionGetImage;

    private WorldProtectBridge() {}

    static boolean isWorldProtectOnlyGenerator(IWorldMap map) {
        if (map == null || map instanceof TerrainWithRegionOverlayMap) {
            return false;
        }
        Object wpInstance = worldProtectChunkMapInstance();
        if (wpInstance != null && wpInstance == map) {
            return true;
        }
        return map.getClass().getName().contains("WorldProtectChunkWorldMap");
    }

    @SuppressWarnings("unchecked")
    static CompletableFuture<Void> overlayChunk(
        World world, long index, int mapChunkX, int mapChunkZ, MapImage base) {
        if (base == null) {
            return CompletableFuture.completedFuture(null);
        }
        int blockOriginX = mapChunkX * 32;
        int blockOriginZ = mapChunkZ * 32;
        try {
            Method build = regionBuildMethod();
            Method getImage = regionGetImageMethod();
            if (build == null || getImage == null) {
                return CompletableFuture.completedFuture(null);
            }
            CompletableFuture<Object> future =
                (CompletableFuture<Object>)
                    build.invoke(null, index, mapChunkX, mapChunkZ, world);
            return future.thenAccept(
                builder -> {
                    if (builder == null) {
                        return;
                    }
                    try {
                        RegionLabelStripper.stripFromBuilder(
                            builder, world, blockOriginX, blockOriginZ);
                        MapImage overlay = (MapImage) getImage.invoke(builder);
                        MapImages.mergeRegionOnto(base, overlay);
                    } catch (ReflectiveOperationException ignored) {
                        // skip chunk
                    }
                });
        } catch (ReflectiveOperationException e) {
            return CompletableFuture.completedFuture(null);
        }
    }

    static void disableMapInRuntime() {
        try {
            Object service = findRegionService();
            if (service == null) {
                return;
            }
            Method configMethod = service.getClass().getMethod("config");
            Object config = configMethod.invoke(service);
            if (config == null) {
                return;
            }
            Field mapEnabled = config.getClass().getDeclaredField("mapEnabled");
            mapEnabled.setAccessible(true);
            mapEnabled.setBoolean(config, false);
        } catch (ReflectiveOperationException ignored) {
            // WorldProtect not loaded
        }
    }

    @SuppressWarnings("unchecked")
    static List<Object> listMapVisibleRegions(World world) {
        List<Object> out = new ArrayList<>();
        try {
            Object service = findRegionService();
            if (service == null || world == null) {
                return out;
            }
            Method listAll = service.getClass().getMethod("listAllRegionsAllWorlds");
            Object result = listAll.invoke(service);
            if (!(result instanceof List<?> all)) {
                return out;
            }
            String worldName = world.getName();
            Method isMapVisible = null;
            Method worldNameMethod = null;
            for (Object region : all) {
                if (region == null) {
                    continue;
                }
                if (worldNameMethod == null) {
                    worldNameMethod = region.getClass().getMethod("worldName");
                    isMapVisible = region.getClass().getMethod("isMapVisible");
                }
                if (!worldName.equals(worldNameMethod.invoke(region))) {
                    continue;
                }
                if (Boolean.TRUE.equals(isMapVisible.invoke(region))) {
                    out.add(region);
                }
            }
        } catch (ReflectiveOperationException ignored) {
            // empty
        }
        return out;
    }

    private static Object findRegionService() {
        PluginManager manager = PluginManager.get();
        if (manager == null) {
            return null;
        }
        for (PluginBase plugin : manager.getPlugins()) {
            if (plugin != null && WP_PLUGIN.equals(plugin.getClass().getName())) {
                try {
                    return plugin.getClass().getMethod("getRegionService").invoke(plugin);
                } catch (ReflectiveOperationException ignored) {
                    return null;
                }
            }
        }
        return null;
    }

    private static Object worldProtectChunkMapInstance() {
        Object cached = wpChunkMapInstance;
        if (cached != null) {
            return cached;
        }
        try {
            Class<?> clazz = Class.forName(WP_CHUNK_MAP);
            Field instance = clazz.getField("INSTANCE");
            cached = instance.get(null);
            wpChunkMapInstance = cached;
            return cached;
        } catch (ReflectiveOperationException e) {
            return null;
        }
    }

    private static Method regionBuildMethod() throws ReflectiveOperationException {
        Method cached = regionBuild;
        if (cached != null) {
            return cached;
        }
        Class<?> clazz = Class.forName(REGION_BUILDER);
        cached =
            clazz.getMethod(
                "build",
                long.class,
                int.class,
                int.class,
                World.class);
        regionBuild = cached;
        return cached;
    }

    private static Method regionGetImageMethod() throws ReflectiveOperationException {
        Method cached = regionGetImage;
        if (cached != null) {
            return cached;
        }
        Class<?> clazz = Class.forName(REGION_BUILDER);
        cached = clazz.getMethod("getImage");
        regionGetImage = cached;
        return cached;
    }
}

package com.github.wpmapcompat;

import com.hypixel.hytale.server.core.universe.world.worldmap.IWorldMap;
import com.hypixel.hytale.server.core.universe.world.worldmap.WorldMapManager;
import java.lang.reflect.Field;

final class WorldMapReflection {

    private WorldMapReflection() {}

    /** Без clearImages/tracker.clear — только поле generator. */
    static boolean setGeneratorQuiet(WorldMapManager manager, IWorldMap generator) {
        if (manager == null || generator == null) {
            return false;
        }
        try {
            Field field = WorldMapManager.class.getDeclaredField("generator");
            field.setAccessible(true);
            field.set(manager, generator);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }
}

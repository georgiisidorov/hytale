package com.github.regionguard;

import org.joml.Vector3d;
import org.joml.Vector3i;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

final class WorldProtectRegionResolver {
    private static volatile boolean reflectionInitialized = false;
    private static volatile boolean worldProtectAvailable = false;

    private static Method isAvailableMethod;
    private static Method getApiMethod;
    private static Method getRegionsAtMethod;
    private static Method idLowerMethod;

    private WorldProtectRegionResolver() {}

    static Set<String> getRegionIdsAt(String worldName, Vector3i pos) {
        if (pos == null) return Collections.emptySet();
        return getRegionIdsAt(worldName, pos.x, pos.y, pos.z);
    }

    static Set<String> getRegionIdsAt(String worldName, Vector3d pos) {
        if (pos == null) return Collections.emptySet();
        int x = (int) Math.floor(pos.x);
        int y = (int) Math.floor(pos.y);
        int z = (int) Math.floor(pos.z);
        return getRegionIdsAt(worldName, x, y, z);
    }

    static Set<String> getRegionIdsAt(String worldName, int x, int y, int z) {
        initReflection();
        if (!worldProtectAvailable || worldName == null || worldName.isBlank()) {
            return Collections.emptySet();
        }

        try {
            Boolean available = (Boolean) isAvailableMethod.invoke(null);
            if (available == null || !available) return Collections.emptySet();

            Object api = getApiMethod.invoke(null);
            if (api == null) return Collections.emptySet();

            Object regionsObj = getRegionsAtMethod.invoke(api, worldName, x, y, z);
            if (!(regionsObj instanceof Iterable<?> regions)) return Collections.emptySet();

            Set<String> ids = new HashSet<>();
            for (Object region : regions) {
                if (region == null) continue;
                Object idObj = idLowerMethod.invoke(region);
                if (idObj == null) continue;
                String id = idObj.toString().trim().toLowerCase(Locale.ROOT);
                if (!id.isEmpty()) ids.add(id);
            }
            return ids;
        } catch (Throwable ignored) {
            return Collections.emptySet();
        }
    }

    private static void initReflection() {
        if (reflectionInitialized) return;
        synchronized (WorldProtectRegionResolver.class) {
            if (reflectionInitialized) return;
            try {
                Class<?> providerCls = Class.forName("dev.worldprotect.worldprotect.api.WorldProtectApiProvider");
                isAvailableMethod = providerCls.getMethod("isAvailable");
                getApiMethod = providerCls.getMethod("getApi");

                Class<?> apiCls = Class.forName("dev.worldprotect.worldprotect.api.WorldProtectApi");
                getRegionsAtMethod = apiCls.getMethod("getRegionsAt", String.class, int.class, int.class, int.class);

                // WorldProtect 1.0.9: snapshot lives in dev.worldprotect.worldprotect.api
                Class<?> snapshotCls = Class.forName("dev.worldprotect.worldprotect.api.WorldProtectRegionSnapshot");
                idLowerMethod = snapshotCls.getMethod("idLower");
                worldProtectAvailable = true;
            } catch (Throwable ignored) {
                worldProtectAvailable = false;
            } finally {
                reflectionInitialized = true;
            }
        }
    }
}


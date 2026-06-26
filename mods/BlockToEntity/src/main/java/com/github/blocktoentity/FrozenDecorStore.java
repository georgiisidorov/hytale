package com.github.blocktoentity;

import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** Координаты декора как замороженный воксель (люки, двери, настенные блоки). */
final class FrozenDecorStore {

    private static final ConcurrentHashMap<String, Set<Long>> BY_WORLD = new ConcurrentHashMap<>();

    private FrozenDecorStore() {}

    static void register(String worldName, int x, int y, int z) {
        if (worldName == null || worldName.isBlank()) {
            return;
        }
        String key = worldName.toLowerCase(Locale.ROOT);
        BY_WORLD.computeIfAbsent(key, w -> ConcurrentHashMap.newKeySet()).add(pack(x, y, z));
    }

    static boolean isFrozen(String worldName, int x, int y, int z) {
        if (worldName == null || worldName.isBlank()) {
            return false;
        }
        Set<Long> set = BY_WORLD.get(worldName.toLowerCase(Locale.ROOT));
        return set != null && set.contains(pack(x, y, z));
    }

    private static long pack(int x, int y, int z) {
        return ((long) x & 0x3FFFFFFL) | (((long) y & 0xFFFL) << 26) | (((long) z & 0x3FFFFFFL) << 38);
    }
}

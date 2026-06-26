package com.github.mazeslots;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.math.vector.Rotation3f;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.modules.entity.teleport.Teleport;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import org.joml.Vector3d;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public final class MazeSlotAllocator {
    private static final int SLOT_SIZE_XZ = 119;
    private static final int SLOT_MIN_LOCAL_X = -59;
    private static final int SLOT_MIN_LOCAL_Z = -59;

    private static final double SPAWN_LOCAL_X = 91;
    private static final double SPAWN_LOCAL_Y = 191;
    private static final double SPAWN_LOCAL_Z = 45;

    private static final double SLOT_MIN_WORLD_Y = 0;
    private static final double SLOT_MAX_WORLD_Y = 295;

    private static final int CHUNK_SHIFT = 5;

    public static final class Slot {
        public final int index;
        public final int gx;
        public final int gz;

        private Slot(int index, int gx, int gz) {
            this.index = index;
            this.gx = gx;
            this.gz = gz;
        }
    }

    private static final Map<UUID, Slot> playerToSlot = new ConcurrentHashMap<>();
    private static final Map<Integer, Slot> indexToSlot = new ConcurrentHashMap<>();
    private static final java.util.Set<Integer> builtSlots = ConcurrentHashMap.newKeySet();
    private static final AtomicInteger nextIndex = new AtomicInteger(0);
    private static final Map<UUID, Long> lastClampNanos = new ConcurrentHashMap<>();

    private MazeSlotAllocator() {}

    public static Slot assignIfAbsent(UUID uuid) {
        Slot existing = playerToSlot.get(uuid);
        if (existing != null) return existing;

        synchronized (MazeSlotAllocator.class) {
            existing = playerToSlot.get(uuid);
            if (existing != null) return existing;

            int idx = nextIndex.getAndIncrement();
            int[] gzGx = spiralAt(idx);
            int gx = gzGx[0];
            int gz = gzGx[1];

            Slot slot = new Slot(idx, gx, gz);
            playerToSlot.put(uuid, slot);
            indexToSlot.put(idx, slot);
            return slot;
        }
    }

    public static Slot getSlot(UUID uuid) {
        return playerToSlot.get(uuid);
    }

    public static boolean isSlotBuilt(int slotIndex) {
        return builtSlots.contains(slotIndex);
    }

    public static void markSlotBuilt(int slotIndex) {
        builtSlots.add(slotIndex);
    }

    public static void applyViewRadius(World world, PlayerRef playerRef, Slot slot, boolean always) {
        try {
            Ref<EntityStore> entityRef = playerRef.getReference();
            if (entityRef == null || !entityRef.isValid()) return;
            Store<EntityStore> store = entityRef.getStore();
            Player player = store.getComponent(entityRef, Player.getComponentType());
            if (player == null) return;

            int slotMinX = slotMinWorldX(slot);
            int slotMaxX = slotMaxWorldX(slot);
            int slotMinZ = slotMinWorldZ(slot);
            int slotMaxZ = slotMaxWorldZ(slot);

            int minChunkX = chunkIndex(slotMinX);
            int maxChunkX = chunkIndex(slotMaxX);
            int minChunkZ = chunkIndex(slotMinZ);
            int maxChunkZ = chunkIndex(slotMaxZ);
            int radiusX = Math.max(0, maxChunkX - minChunkX);
            int radiusZ = Math.max(0, maxChunkZ - minChunkZ);
            int radius = Math.max(radiusX, radiusZ);

            player.setClientViewRadius(radius);
        } catch (Throwable ignored) {
        }
    }

    public static boolean isInsideSlot(Slot slot, Vector3d pos) {
        double margin = 1.0;
        if (pos.y < SLOT_MIN_WORLD_Y + margin) return false;
        if (pos.y > SLOT_MAX_WORLD_Y - margin) return false;
        if (pos.x < slotMinWorldX(slot) + margin) return false;
        if (pos.x > slotMaxWorldX(slot) - margin) return false;
        if (pos.z < slotMinWorldZ(slot) + margin) return false;
        if (pos.z > slotMaxWorldZ(slot) - margin) return false;
        return true;
    }

    public static void teleportBack(World world, PlayerRef playerRef, Slot slot) {
        try {
            Ref<EntityStore> entityRef = playerRef.getReference();
            if (entityRef == null || !entityRef.isValid()) return;
            Store<EntityStore> store = entityRef.getStore();

            TransformComponent tc = store.getComponent(entityRef, TransformComponent.getComponentType());
            Rotation3f rot = tc != null ? new Rotation3f(tc.getRotation()) : new Rotation3f(Rotation3f.IDENTITY);

            Teleport teleport = Teleport.createExact(
                new Vector3d(spawnX(slot), spawnY(), spawnZ(slot)),
                rot
            ).withoutVelocityReset();

            store.addComponent(entityRef, Teleport.getComponentType(), teleport);
        } catch (Throwable ignored) {
        }
    }

    public static boolean canClamp(UUID uuid) {
        long now = System.nanoTime();
        Long last = lastClampNanos.get(uuid);
        if (last == null) return true;
        return now - last > 800_000_000L;
    }

    public static void markClamped(UUID uuid) {
        lastClampNanos.put(uuid, System.nanoTime());
    }

    public static double spawnX(Slot slot) {
        return SPAWN_LOCAL_X + slot.gx * (double) SLOT_SIZE_XZ;
    }

    public static double spawnY() {
        return SPAWN_LOCAL_Y;
    }

    public static double spawnZ(Slot slot) {
        return SPAWN_LOCAL_Z + slot.gz * (double) SLOT_SIZE_XZ;
    }

    private static int slotMinWorldX(Slot slot) {
        return SLOT_MIN_LOCAL_X + slot.gx * SLOT_SIZE_XZ;
    }

    private static int slotMaxWorldX(Slot slot) {
        return (SLOT_MIN_LOCAL_X + 2 * 59) + slot.gx * SLOT_SIZE_XZ;
    }

    private static int slotMinWorldZ(Slot slot) {
        return SLOT_MIN_LOCAL_Z + slot.gz * SLOT_SIZE_XZ;
    }

    private static int slotMaxWorldZ(Slot slot) {
        return (SLOT_MIN_LOCAL_Z + 2 * 59) + slot.gz * SLOT_SIZE_XZ;
    }

    private static int[] spiralAt(int index) {
        if (index == 0) return new int[]{0, 0};

        int i = index - 1;
        for (int r = 1; ; r++) {
            int ringSize = 8 * r;
            if (i >= ringSize) {
                i -= ringSize;
                continue;
            }

            int cursor = 0;

            if (i == cursor) return new int[]{-r, 0};
            cursor++;

            for (int z = -r; z <= -1; z++) {
                if (i == cursor) return new int[]{-r, z};
                cursor++;
            }

            for (int x = -r + 1; x <= r; x++) {
                if (i == cursor) return new int[]{x, -r};
                cursor++;
            }

            for (int z = -r + 1; z <= r; z++) {
                if (i == cursor) return new int[]{r, z};
                cursor++;
            }

            for (int x = r - 1; x >= -r; x--) {
                if (i == cursor) return new int[]{x, r};
                cursor++;
            }

            for (int z = r - 1; z >= 1; z--) {
                if (i == cursor) return new int[]{-r, z};
                cursor++;
            }

            return new int[]{0, 0};
        }
    }

    private static int chunkIndex(int block) {
        return block >> CHUNK_SHIFT;
    }
}

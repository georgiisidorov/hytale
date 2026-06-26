package com.github.mazeslots;

import com.hypixel.hytale.component.Archetype;
import com.hypixel.hytale.component.ArchetypeChunk;
import com.hypixel.hytale.component.CommandBuffer;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.component.SystemGroup;
import com.hypixel.hytale.component.query.Query;
import com.hypixel.hytale.component.system.tick.EntityTickingSystem;
import com.hypixel.hytale.server.core.entity.EntityUtils;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.modules.entity.tracker.EntityTrackerSystems;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import java.util.UUID;
import org.joml.Vector3d;

public class MazeSlotsClampSystem extends EntityTickingSystem<EntityStore> {
    private static final String TARGET_WORLD = "maze";

    @Override
    public Query<EntityStore> getQuery() {
        return Archetype.add(
            Archetype.of(TransformComponent.getComponentType()),
            Player.getComponentType()
        );
    }

    @Override
    public SystemGroup<EntityStore> getGroup() {
        return EntityTrackerSystems.FIND_VISIBLE_ENTITIES_GROUP;
    }

    @Override
    public boolean isParallel(int index, int entityCount) {
        return false;
    }

    // Мировой спавн по умолчанию при /tp world maze (если игрок не в своём слоте)
    private static final double DEFAULT_SPAWN_X = 0;
    private static final double DEFAULT_SPAWN_Y = 81;
    private static final double DEFAULT_SPAWN_Z = 0;
    private static final double SPAWN_CHECK_RADIUS = 2.0;

    @Override
    public void tick(
        float deltaTime,
        int index,
        ArchetypeChunk<EntityStore> chunk,
        Store<EntityStore> store,
        CommandBuffer<EntityStore> commandBuffer
    ) {
        var entity = EntityUtils.getEntity(index, chunk);
        if (!(entity instanceof Player player)) return;

        World world = player.getWorld();
        if (world == null || !TARGET_WORLD.equals(world.getName())) return;

        Ref<EntityStore> entityRef = player.getReference();
        if (entityRef == null || !entityRef.isValid()) return;

        PlayerRef playerRef = store.getComponent(entityRef, PlayerRef.getComponentType());
        if (playerRef == null) return;

        UUID uuid = playerRef.getUuid();

        // Гарантируем, что у игрока есть слот (даже при /tp world maze)
        MazeSlotAllocator.assignIfAbsent(uuid);
        var slot = MazeSlotAllocator.getSlot(uuid);
        if (slot == null) return;

        TransformComponent tc = store.getComponent(entityRef, TransformComponent.getComponentType());
        Vector3d pos = tc != null ? tc.getPosition() : null;
        if (pos == null) return;

        // Если игрок на мировом спавне (0,81,0) И слот ещё не построен — телепортируем в слот.
        // При повторном входе слот уже построен, а Hytale восстанавливает сохранённую позицию
        // (которая находится внутри слота), поэтому этот блок не должен срабатывать.
        double dx = pos.x - DEFAULT_SPAWN_X;
        double dz = pos.z - DEFAULT_SPAWN_Z;
        double distSq = dx * dx + dz * dz;
        if (distSq < SPAWN_CHECK_RADIUS * SPAWN_CHECK_RADIUS && Math.abs(pos.y - DEFAULT_SPAWN_Y) < SPAWN_CHECK_RADIUS) {
            if (!MazeSlotAllocator.isSlotBuilt(slot.index)) {
                MazeSlotAllocator.teleportBack(world, playerRef, slot);
            }
            return;
        }

        // Inline isInsideSlot check: pos is org.joml.Vector3d
        // slot0 local range: [-59..59] for both X and Z, SLOT_SIZE_XZ = 119
        double margin = 1.0;
        double slotMinX = -59 + slot.gx * 119.0;
        double slotMaxX = 59 + slot.gx * 119.0;
        double slotMinZ = -59 + slot.gz * 119.0;
        double slotMaxZ = 59 + slot.gz * 119.0;
        boolean insideX = pos.x >= slotMinX + margin && pos.x <= slotMaxX - margin;
        boolean insideZ = pos.z >= slotMinZ + margin && pos.z <= slotMaxZ - margin;
        boolean insideY = pos.y >= 1.0 && pos.y <= 294.0;
        if (!(insideX && insideY && insideZ)) {
            if (MazeSlotAllocator.canClamp(uuid)) {
                MazeSlotAllocator.teleportBack(world, playerRef, slot);
                MazeSlotAllocator.markClamped(uuid);
            }
        }
    }
}

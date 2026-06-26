package com.github.regionguard;

import com.hypixel.hytale.component.ArchetypeChunk;
import com.hypixel.hytale.component.CommandBuffer;
import com.hypixel.hytale.component.ComponentType;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.component.dependency.Dependency;
import com.hypixel.hytale.component.dependency.Order;
import com.hypixel.hytale.component.dependency.SystemDependency;
import com.hypixel.hytale.component.query.Query;
import com.hypixel.hytale.component.system.tick.EntityTickingSystem;
import org.joml.Vector3d;
import com.hypixel.hytale.server.core.modules.entity.DespawnComponent;
import com.hypixel.hytale.server.core.modules.entity.component.Interactable;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.modules.entity.item.ItemComponent;
import com.hypixel.hytale.server.core.modules.entity.item.PreventPickup;
import com.hypixel.hytale.server.core.modules.entity.item.PickupItemSystem;
import com.hypixel.hytale.server.core.modules.entity.player.PlayerItemEntityPickupSystem;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import java.util.Set;

/**
 * «Положенные» предметы: {@link Interactable} и/или отсутствие {@link DespawnComponent} (не ванильный лут из
 * {@link com.hypixel.hytale.server.core.modules.entity.item.ItemComponent#generateItemDrop}). Обычный дроп с TTL
 * деспавна в зоне по-прежнему можно подобрать.
 * <p>
 * В защищённых регионах такие сущности не должны начинать подбор: ванильный
 * {@link PlayerItemEntityPickupSystem} пропускает сущности с {@link PreventPickup}.
 * Не снимаем анимацию подбора у лута: при снятии {@link DespawnComponent} во время подбора сущность
 * ошибочно попадала бы под фильтр «положенный», и телепорт назад давал дубликат (предмет в инвентаре + на земле).
 */
public final class RegionGroundItemPreventPickupSystem extends EntityTickingSystem<EntityStore> {

    private static final ComponentType<EntityStore, ItemComponent> ITEM = ItemComponent.getComponentType();
    private static final ComponentType<EntityStore, TransformComponent> TRANSFORM =
        TransformComponent.getComponentType();
    private static final ComponentType<EntityStore, Interactable> INTERACTABLE =
        Interactable.getComponentType();
    private static final ComponentType<EntityStore, DespawnComponent> DESPAWN =
        DespawnComponent.getComponentType();
    private static final ComponentType<EntityStore, PreventPickup> PREVENT =
        PreventPickup.getComponentType();

    public RegionGroundItemPreventPickupSystem() {
        super();
    }

    @Override
    public Set<Dependency<EntityStore>> getDependencies() {
        return Set.of(
            new SystemDependency<>(Order.BEFORE, PlayerItemEntityPickupSystem.class),
            new SystemDependency<>(Order.BEFORE, PickupItemSystem.class)
        );
    }

    @Override
    public Query<EntityStore> getQuery() {
        return Query.and(
            ITEM,
            TRANSFORM,
            Query.or(INTERACTABLE, Query.not(DESPAWN))
        );
    }

    @Override
    public boolean isParallel(int index, int entityCount) {
        return false;
    }

    @Override
    public void tick(
        float deltaTime,
        int index,
        ArchetypeChunk<EntityStore> chunk,
        Store<EntityStore> store,
        CommandBuffer<EntityStore> commandBuffer
    ) {
        RegionGuardConfig.Rules rules = RegionGuardConfig.current();
        Ref<EntityStore> ref = chunk.getReferenceTo(index);

        if (!rules.blockItemPickup) {
            if (commandBuffer.getComponent(ref, PREVENT) != null) {
                commandBuffer.removeComponent(ref, PREVENT);
            }
            return;
        }
        if (rules.protectedRegions.isEmpty()) {
            return;
        }

        EntityStore external = store.getExternalData();
        if (external == null || external.getWorld() == null) {
            return;
        }
        String worldName = external.getWorld().getName();

        TransformComponent transform = chunk.getComponent(index, TRANSFORM);
        if (transform == null) {
            return;
        }
        Vector3d pos = transform.getPosition();
        if (pos == null) {
            return;
        }

        boolean inProtected = WorldProtectRegionResolver
            .getRegionIdsAt(worldName, pos)
            .stream()
            .anyMatch(rules.protectedRegions::contains);

        if (WorldItemKind.isVanillaDropLoot(store, ref)) {
            if (commandBuffer.getComponent(ref, PREVENT) != null) {
                commandBuffer.removeComponent(ref, PREVENT);
            }
            return;
        }

        if (!WorldItemKind.shouldBlockWorldItemPickupInZone(store, ref)) {
            if (commandBuffer.getComponent(ref, PREVENT) != null) {
                commandBuffer.removeComponent(ref, PREVENT);
            }
            return;
        }

        if (inProtected) {
            if (commandBuffer.getComponent(ref, PREVENT) == null) {
                commandBuffer.addComponent(ref, PREVENT, PreventPickup.INSTANCE);
            }
        } else {
            if (commandBuffer.getComponent(ref, PREVENT) != null) {
                commandBuffer.removeComponent(ref, PREVENT);
            }
        }
    }
}

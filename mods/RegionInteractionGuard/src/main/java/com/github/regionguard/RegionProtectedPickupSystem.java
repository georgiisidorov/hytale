package com.github.regionguard;

import com.hypixel.hytale.component.Archetype;
import com.hypixel.hytale.component.ArchetypeChunk;
import com.hypixel.hytale.component.CommandBuffer;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.component.query.Query;
import com.hypixel.hytale.component.system.EntityEventSystem;
import com.hypixel.hytale.server.core.entity.Entity;
import com.hypixel.hytale.server.core.entity.EntityUtils;
import com.hypixel.hytale.server.core.event.events.ecs.InteractivelyPickupItemEvent;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.modules.entity.item.ItemComponent;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

import java.util.Set;

public final class RegionProtectedPickupSystem
    extends EntityEventSystem<EntityStore, InteractivelyPickupItemEvent> {

    public RegionProtectedPickupSystem() {
        super(InteractivelyPickupItemEvent.class);
    }

    @Override
    public Query<EntityStore> getQuery() {
        return Archetype.empty();
    }

    @Override
    public void handle(
        int index,
        ArchetypeChunk<EntityStore> chunk,
        Store<EntityStore> store,
        CommandBuffer<EntityStore> commandBuffer,
        InteractivelyPickupItemEvent event
    ) {
        if (event == null || event.isCancelled()) return;
        RegionGuardConfig.Rules rules = RegionGuardConfig.current();
        if (!rules.blockItemPickup) {
            return;
        }

        Entity entity = EntityUtils.getEntity(index, chunk);
        if (entity == null) return;

        if (chunk.getComponent(index, ItemComponent.getComponentType()) == null) {
            return;
        }
        Ref<EntityStore> itemRef = chunk.getReferenceTo(index);
        if (!WorldItemKind.shouldBlockWorldItemPickupInZone(store, itemRef)) {
            return;
        }

        TransformComponent tc = chunk.getComponent(index, TransformComponent.getComponentType());
        if (tc == null) return;

        String worldName = ((EntityStore) store.getExternalData()).getWorld().getName();
        Set<String> regionIds = WorldProtectRegionResolver.getRegionIdsAt(worldName, tc.getPosition());
        if (regionIds.isEmpty()) return;

        if (regionIds.stream().anyMatch(rules.protectedRegions::contains)) {
            event.setCancelled(true);
        }
    }
}


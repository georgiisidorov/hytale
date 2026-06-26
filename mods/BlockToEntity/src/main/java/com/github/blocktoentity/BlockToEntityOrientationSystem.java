package com.github.blocktoentity;

import com.hypixel.hytale.component.AddReason;
import com.hypixel.hytale.component.ComponentType;
import com.hypixel.hytale.component.Holder;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.component.dependency.Dependency;
import com.hypixel.hytale.component.dependency.Order;
import com.hypixel.hytale.component.dependency.SystemDependency;
import com.hypixel.hytale.component.system.HolderSystem;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.BlockType;
import com.hypixel.hytale.server.core.entity.entities.BlockEntity;
import com.hypixel.hytale.server.core.modules.entity.BlockEntitySystems;
import com.hypixel.hytale.server.core.modules.entity.component.BoundingBox;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

import java.util.Set;

/**
 * После {@link BlockEntitySystems.BlockEntitySetupSystem}: хитбокс по rotation index
 * (поворот Transform не трогаем — клиент рисует BlockEntity без euler вокселя).
 */
final class BlockToEntityOrientationSystem extends HolderSystem<EntityStore> {

    private final ComponentType<EntityStore, BlockDecorSnapshot> snapshotType;

    BlockToEntityOrientationSystem(ComponentType<EntityStore, BlockDecorSnapshot> snapshotType) {
        this.snapshotType = snapshotType;
    }

    @Override
    public Set<Dependency<EntityStore>> getDependencies() {
        return Set.of(new SystemDependency<>(Order.AFTER, BlockEntitySystems.BlockEntitySetupSystem.class));
    }

    @Override
    public void onEntityAdd(
        Holder<EntityStore> holder,
        AddReason reason,
        Store<EntityStore> store
    ) {
        BlockDecorSnapshot snap = holder.getComponent(snapshotType);
        if (snap == null) {
            return;
        }

        BlockEntity blockEntity = holder.getComponent(BlockEntity.getComponentType());
        if (blockEntity != null) {
            BlockType blockType = BlockType.getAssetMap().getAsset(blockEntity.getBlockTypeKey());
            BoundingBox box = BlockToEntityOrientation.boundingBoxFor(blockType, snap.rotationIndex());
            if (box != null) {
                holder.putComponent(BoundingBox.getComponentType(), box);
            }
        }

        holder.removeComponent(snapshotType);
    }

    @Override
    public void onEntityRemoved(
        Holder<EntityStore> holder,
        com.hypixel.hytale.component.RemoveReason reason,
        Store<EntityStore> store
    ) {
    }

    @Override
    public com.hypixel.hytale.component.query.Query<EntityStore> getQuery() {
        return snapshotType;
    }
}

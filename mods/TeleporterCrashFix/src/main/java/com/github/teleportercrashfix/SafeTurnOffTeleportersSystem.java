package com.github.teleportercrashfix;

import com.hypixel.hytale.builtin.adventure.teleporter.component.Teleporter;
import com.hypixel.hytale.builtin.teleport.TeleportPlugin;
import com.hypixel.hytale.builtin.teleport.Warp;
import com.hypixel.hytale.component.ArchetypeChunk;
import com.hypixel.hytale.component.CommandBuffer;
import com.hypixel.hytale.component.ComponentAccessor;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.RemoveReason;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.component.query.Query;
import com.hypixel.hytale.component.system.RefSystem;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.BlockType;
import com.hypixel.hytale.server.core.modules.block.BlockModule;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.chunk.WorldChunk;
import com.hypixel.hytale.server.core.universe.world.storage.ChunkStore;

public class SafeTurnOffTeleportersSystem extends RefSystem<ChunkStore> {
    public static final Query<ChunkStore> QUERY = Query.and(
        Teleporter.getComponentType(),
        BlockModule.BlockStateInfo.getComponentType()
    );

    @Override
    public void onEntityAdded(
        Ref<ChunkStore> ref,
        com.hypixel.hytale.component.AddReason reason,
        Store<ChunkStore> store,
        CommandBuffer<ChunkStore> commandBuffer
    ) {
        // Intentionally skip processing on chunk LOAD.
        // The vanilla implementation mutates blocks here and can re-enter chunk loading.
    }

    @Override
    public void onEntityRemove(
        Ref<ChunkStore> ref,
        RemoveReason reason,
        Store<ChunkStore> store,
        CommandBuffer<ChunkStore> commandBuffer
    ) {
        if (reason == RemoveReason.REMOVE) {
            updatePortalBlocksInWorld(((ChunkStore) store.getExternalData()).getWorld());
        }
    }

    public static void updatePortalBlocksInWorld(World world) {
        Store<ChunkStore> store = world.getChunkStore().getStore();
        store.forEachChunk(QUERY, SafeTurnOffTeleportersSystem::updatePortalBlocksInChunk);
    }

    private static void updatePortalBlocksInChunk(
        ArchetypeChunk<ChunkStore> chunk,
        CommandBuffer<ChunkStore> accessor
    ) {
        for (int i = 0; i < chunk.size(); i++) {
            Ref<ChunkStore> ref = chunk.getReferenceTo(i);
            updatePortalBlockInWorld(ref, accessor);
        }
    }

    private static void updatePortalBlockInWorld(
        Ref<ChunkStore> ref,
        ComponentAccessor<ChunkStore> accessor
    ) {
        if (!ref.isValid()) {
            return;
        }

        Teleporter teleporter = accessor.getComponent(ref, Teleporter.getComponentType());
        BlockModule.BlockStateInfo blockStateInfo =
            accessor.getComponent(ref, BlockModule.BlockStateInfo.getComponentType());
        updatePortalBlockInWorld(accessor, teleporter, blockStateInfo);
    }

    public static void updatePortalBlockInWorld(
        ComponentAccessor<ChunkStore> accessor,
        Teleporter teleporter,
        BlockModule.BlockStateInfo blockStateInfo
    ) {
        Ref<ChunkStore> chunkRef = blockStateInfo.getChunkRef();
        if (!chunkRef.isValid()) {
            return;
        }

        WorldChunk chunk = accessor.getComponent(chunkRef, WorldChunk.getComponentType());
        if (chunk == null) {
            return;
        }

        int index = blockStateInfo.getIndex();
        int x = com.hypixel.hytale.math.util.ChunkUtil.xFromBlockInColumn(index);
        int y = com.hypixel.hytale.math.util.ChunkUtil.yFromBlockInColumn(index);
        int z = com.hypixel.hytale.math.util.ChunkUtil.zFromBlockInColumn(index);
        BlockType blockType = chunk.getBlockType(x, y, z);
        if (blockType == null) {
            return;
        }

        String warpId = teleporter.getWarp();
        Warp warp = warpId == null ? null : TeleportPlugin.get().getWarps().get(warpId);
        String currentState = blockType.getStateForBlock(blockType);
        String expectedState = warp == null ? "default" : "Active";

        if (!expectedState.equals(currentState)) {
            chunk.setBlockInteractionState(x, y, z, blockType, expectedState, false);
            blockStateInfo.markNeedsSaving(accessor);
        }

        if (warp == null) {
            teleporter.setWarp(null);
            blockStateInfo.markNeedsSaving(accessor);
        }
    }

    @Override
    public Query<ChunkStore> getQuery() {
        return QUERY;
    }
}

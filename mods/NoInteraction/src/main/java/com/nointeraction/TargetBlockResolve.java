package com.nointeraction;

import com.hypixel.hytale.builtin.buildertools.PrototypePlayerBuilderToolSettings;
import com.hypixel.hytale.builtin.buildertools.tooloperations.ToolOperation;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.server.core.util.TargetUtil;
import org.joml.Vector3i;

import java.util.UUID;

/** Координаты блока: таргетблок (builder tools) или ванильный TargetUtil. */
final class TargetBlockResolve {

    private TargetBlockResolve() {}

    static int[] resolve(
        PlayerRef playerRef,
        Ref<EntityStore> playerEntityRef,
        Store<EntityStore> store,
        World world,
        int[] explicitBlock,
        double maxReach
    ) {
        if (explicitBlock != null) {
            return explicitBlock;
        }

        int[] fromBuilderTarget = fromBuilderTargetBlock(playerRef);
        if (fromBuilderTarget != null && hasSolidBlock(world, fromBuilderTarget)) {
            return fromBuilderTarget;
        }

        Vector3i target = TargetUtil.getTargetBlock(playerEntityRef, maxReach, store);
        if (target == null) {
            return null;
        }
        return new int[] {target.x, target.y, target.z};
    }

    private static int[] fromBuilderTargetBlock(PlayerRef playerRef) {
        UUID uuid = playerRef.getUuid();
        PrototypePlayerBuilderToolSettings settings = ToolOperation.PROTOTYPE_TOOL_SETTINGS.get(uuid);
        if (settings == null) {
            return null;
        }
        Vector3i pos = settings.getLastBrushPosition();
        if (pos == null) {
            return null;
        }
        return new int[] {pos.x, pos.y, pos.z};
    }

    private static boolean hasSolidBlock(World world, int[] pos) {
        if (world.getBlock(pos[0], pos[1], pos[2]) == 0) {
            return false;
        }
        var type = world.getBlockType(pos[0], pos[1], pos[2]);
        if (type == null || type.getId() == null) {
            return false;
        }
        String id = type.getId().toLowerCase();
        return !id.equals("air") && !id.equals("empty") && !id.contains("void_air");
    }
}

package com.github.blocktoentity;

import com.hypixel.hytale.math.shape.Box;
import org.joml.Vector3d;
import com.hypixel.hytale.server.core.asset.type.blockhitbox.BlockBoundingBoxes;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.BlockType;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.RotationTuple;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.VariantRotation;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.accessor.BlockAccessor;

final class BlockToEntityPlacement {

    private BlockToEntityPlacement() {}

    static CapturedBlock capture(World world, int bx, int by, int bz) {
        int blockId = world.getBlock(bx, by, bz);
        BlockType blockType = world.getBlockType(bx, by, bz);
        if (blockType == null) {
            blockType = BlockType.getAssetMap().getAsset(blockId);
        }
        int rotationIndex = world.getBlockRotationIndex(bx, by, bz);
        RotationTuple rawRotation = RotationTuple.get(rotationIndex);
        VariantRotation variant = blockType != null ? blockType.getVariantRotation() : null;
        RotationTuple blockRotation =
            blockType != null && variant != null ? variant.verify(rawRotation) : rawRotation;
        String blockKey = resolveVisualBlockKey(blockType);
        return new CapturedBlock(blockId, rotationIndex, blockKey, blockType, blockRotation);
    }

    /**
     * BlockEntity рисуется от точки transform: нижний центр клетки по XZ, низ хитбокса по Y
     * (не угол box.min — иначе −0.5 по X/Z и +0.5 по Y относительно вокселя).
     */
    static Vector3d entityAnchorPosition(BlockType blockType, int rotationIndex, int bx, int by, int bz) {
        if (blockType != null) {
            BlockBoundingBoxes hitboxes =
                BlockBoundingBoxes.getAssetMap().getAsset(blockType.getHitboxTypeIndex());
            if (hitboxes != null) {
                BlockBoundingBoxes.RotatedVariantBoxes variant = hitboxes.get(rotationIndex);
                if (variant == null) {
                    variant = hitboxes.get(0);
                }
                if (variant != null) {
                    Box box = variant.getBoundingBox();
                    if (box != null) {
                        double x = bx + (box.min.x + box.max.x) * 0.5;
                        double y = by + box.min.y;
                        double z = bz + (box.min.z + box.max.z) * 0.5;
                        return new Vector3d(x, y, z);
                    }
                }
            }
        }
        return new Vector3d(bx + 0.5, by, bz + 0.5);
    }

    /**
     * BlockEntity не передаёт rotation index и open/closed — только id типа по умолчанию.
     */
    static boolean requiresFrozenBlock(CapturedBlock captured) {
        BlockType blockType = captured.blockType;
        if (blockType == null) {
            return true;
        }
        if (blockType.isState()) {
            return true;
        }
        VariantRotation variantRotation = blockType.getVariantRotation();
        return variantRotation != null && variantRotation != VariantRotation.None;
    }

    /**
     * Тот же blockId + rotationIndex, что были в мире (сохраняет открытый люк и поворот).
     */
    static void placeFrozenBlock(World world, int bx, int by, int bz, CapturedBlock captured) {
        if (captured.blockId != 0) {
            BlockType placedType = BlockType.getAssetMap().getAsset(captured.blockId);
            if (placedType != null && placedType.getId() != null && !placedType.getId().isBlank()) {
                world.setBlock(bx, by, bz, placedType.getId(), captured.rotationIndex);
            } else if (captured.blockKey != null && !captured.blockKey.isBlank()) {
                world.setBlock(bx, by, bz, captured.blockKey, captured.rotationIndex);
            }
        } else if (captured.blockKey != null && !captured.blockKey.isBlank()) {
            world.setBlock(bx, by, bz, captured.blockKey, captured.rotationIndex);
        }
        FrozenDecorStore.register(world.getName(), bx, by, bz);
    }

    /**
     * Для BlockEntity: открытый люк — отдельный block id (OpenDoorOut и т.п.).
     */
    static String resolveVisualBlockKey(BlockType blockType) {
        if (blockType == null) {
            return "";
        }
        String id = blockType.getId();
        if (id == null) {
            id = "";
        }
        try {
            String state = BlockAccessor.getCurrentInteractionState(blockType);
            if (state != null && !state.isBlank()) {
                BlockType forState = blockType.getBlockForState(state);
                if (forState != null) {
                    String stateId = forState.getId();
                    if (stateId != null && !stateId.isBlank()) {
                        return stateId;
                    }
                }
            }
        } catch (Throwable ignored) {
        }
        return id;
    }
}

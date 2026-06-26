package com.github.blocktoentity;

import com.hypixel.hytale.math.shape.Box;
import com.hypixel.hytale.server.core.asset.type.blockhitbox.BlockBoundingBoxes;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.BlockType;
import com.hypixel.hytale.server.core.modules.entity.component.BoundingBox;

final class BlockToEntityOrientation {

    private BlockToEntityOrientation() {}

    static BoundingBox boundingBoxFor(BlockType blockType, int rotationIndex) {
        if (blockType == null) {
            return null;
        }
        BlockBoundingBoxes hitboxes = BlockBoundingBoxes.getAssetMap().getAsset(blockType.getHitboxTypeIndex());
        if (hitboxes == null) {
            return null;
        }
        BlockBoundingBoxes.RotatedVariantBoxes variant = hitboxes.get(rotationIndex);
        if (variant == null) {
            variant = hitboxes.get(0);
        }
        if (variant == null) {
            return null;
        }
        Box box = variant.getBoundingBox();
        return box != null ? new BoundingBox(box) : null;
    }
}

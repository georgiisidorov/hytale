package com.github.blocktoentity;

import com.hypixel.hytale.server.core.asset.type.blocktype.config.BlockType;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.RotationTuple;

/** Снимок вокселя до breakBlock. */
final class CapturedBlock {

    final int blockId;
    final int rotationIndex;
    final String blockKey;
    final BlockType blockType;
    final RotationTuple blockRotation;

    CapturedBlock(
        int blockId,
        int rotationIndex,
        String blockKey,
        BlockType blockType,
        RotationTuple blockRotation
    ) {
        this.blockId = blockId;
        this.rotationIndex = rotationIndex;
        this.blockKey = blockKey;
        this.blockType = blockType;
        this.blockRotation = blockRotation;
    }
}

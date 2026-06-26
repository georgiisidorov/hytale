package com.github.blocktoentity;

import com.hypixel.hytale.component.Component;
import com.hypixel.hytale.component.ComponentType;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.RotationTuple;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

/** Временный маркер: поворот вокселя до breakBlock, применяется в {@link BlockToEntityOrientationSystem}. */
final class BlockDecorSnapshot implements Component<EntityStore> {

    private static ComponentType<EntityStore, BlockDecorSnapshot> type;

    private final int rotationIndex;
    private final RotationTuple rotation;

    /** Только для регистрации компонента в ECS. */
    BlockDecorSnapshot() {
        this(0, RotationTuple.get(0));
    }

    BlockDecorSnapshot(int rotationIndex, RotationTuple rotation) {
        this.rotationIndex = rotationIndex;
        this.rotation = rotation;
    }

    static ComponentType<EntityStore, BlockDecorSnapshot> getComponentType() {
        return type;
    }

    static void setComponentType(ComponentType<EntityStore, BlockDecorSnapshot> componentType) {
        type = componentType;
    }

    int rotationIndex() {
        return rotationIndex;
    }

    RotationTuple rotation() {
        return rotation;
    }

    @Override
    public Component<EntityStore> clone() {
        return new BlockDecorSnapshot(rotationIndex, rotation);
    }
}

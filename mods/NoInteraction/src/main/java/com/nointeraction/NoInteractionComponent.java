package com.nointeraction;

import com.hypixel.hytale.component.Component;
import com.hypixel.hytale.component.ComponentType;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

/** Маркер декора без взаимодействия: исходный блок и координаты. */
public final class NoInteractionComponent implements Component<EntityStore> {

    private static ComponentType<EntityStore, NoInteractionComponent> type;

    private final String originalBlockId;
    private final int originalX;
    private final int originalY;
    private final int originalZ;
    private final int rotationIndex;

    /** Только для регистрации компонента в ECS. */
    public NoInteractionComponent() {
        this("", 0, 0, 0, 0);
    }

    public NoInteractionComponent(String originalBlockId, int x, int y, int z, int rotationIndex) {
        this.originalBlockId = originalBlockId;
        this.originalX = x;
        this.originalY = y;
        this.originalZ = z;
        this.rotationIndex = rotationIndex;
    }

    public NoInteractionComponent(NoInteractionComponent other) {
        this(other.originalBlockId, other.originalX, other.originalY, other.originalZ, other.rotationIndex);
    }

    public static ComponentType<EntityStore, NoInteractionComponent> getComponentType() {
        return type;
    }

    public static void setComponentType(ComponentType<EntityStore, NoInteractionComponent> componentType) {
        type = componentType;
    }

    public String getOriginalBlockId() {
        return originalBlockId;
    }

    public int getOriginalX() {
        return originalX;
    }

    public int getOriginalY() {
        return originalY;
    }

    public int getOriginalZ() {
        return originalZ;
    }

    public int getRotationIndex() {
        return rotationIndex;
    }

    @Override
    public Component<EntityStore> clone() {
        return new NoInteractionComponent(this);
    }
}

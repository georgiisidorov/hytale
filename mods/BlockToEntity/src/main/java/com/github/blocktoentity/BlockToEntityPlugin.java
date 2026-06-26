package com.github.blocktoentity;

import com.hypixel.hytale.component.ComponentType;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

public class BlockToEntityPlugin extends JavaPlugin {

    public BlockToEntityPlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void setup() {
        ComponentType<EntityStore, BlockDecorSnapshot> snapshotType =
            getEntityStoreRegistry().registerComponent(BlockDecorSnapshot.class, BlockDecorSnapshot::new);
        BlockDecorSnapshot.setComponentType(snapshotType);
        getEntityStoreRegistry().registerSystem(new BlockToEntityOrientationSystem(snapshotType));
    }

    @Override
    protected void start() {
        try {
            getCommandRegistry().registerCommand(new BlockToEntityCommand());
            getLogger().atInfo().log("[BlockToEntity] Команда /blocktoentity зарегистрирована.");
        } catch (Throwable t) {
            getLogger().atSevere().withCause(t).log("[BlockToEntity] Не удалось зарегистрировать команду (сервер продолжит работу).");
        }
    }
}

package com.github.teleportercrashfix;

import com.hypixel.hytale.component.ComponentRegistry;
import com.hypixel.hytale.component.ComponentRegistryProxy;
import com.hypixel.hytale.server.core.universe.world.storage.ChunkStore;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import java.lang.reflect.Field;

public class TeleporterCrashFixPlugin extends JavaPlugin {
    public TeleporterCrashFixPlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void setup() {
        unregisterBuiltinTeleporterSystem(getChunkStoreRegistry());
        getChunkStoreRegistry().registerSystem(new SafeTurnOffTeleportersSystem());
    }

    @SuppressWarnings("unchecked")
    private void unregisterBuiltinTeleporterSystem(ComponentRegistryProxy<ChunkStore> proxy) {
        try {
            Field registryField = ComponentRegistryProxy.class.getDeclaredField("registry");
            registryField.setAccessible(true);
            ComponentRegistry<ChunkStore> registry =
                (ComponentRegistry<ChunkStore>) registryField.get(proxy);
            @SuppressWarnings("unchecked")
            Class<com.hypixel.hytale.component.system.ISystem<ChunkStore>> builtin =
                (Class<com.hypixel.hytale.component.system.ISystem<ChunkStore>>)
                    Class.forName(
                        "com.hypixel.hytale.builtin.adventure.teleporter.system.TurnOffTeleportersSystem"
                    );
            registry.unregisterSystem(builtin);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException("Failed to unregister TurnOffTeleportersSystem", e);
        }
    }
}

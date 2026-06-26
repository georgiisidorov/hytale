package com.github.regionguard;

import com.hypixel.hytale.component.system.ISystem;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

public class RegionInteractionGuardPlugin extends JavaPlugin {
    public RegionInteractionGuardPlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void setup() {
        RegionGuardConfig.init(getDataDirectory().toFile(), getLogger());
        getCommandRegistry().registerCommand(new RegionGuardCommand(this));
        getLogger().atInfo().log("[RegionInteractionGuard] /regionguard command registered");
        registerSystemSafe("RegionGroundItemPreventPickupSystem", new RegionGroundItemPreventPickupSystem());
        registerSystemSafe("RegionProtectedPickupSystem", new RegionProtectedPickupSystem());
    }

    private void registerSystemSafe(String name, ISystem<EntityStore> system) {
        try {
            getEntityStoreRegistry().registerSystem(system);
        } catch (Throwable t) {
            getLogger().atSevere().withCause(t).log(
                    "[RegionInteractionGuard] %s not registered (server continues)", name
            );
        }
    }
}

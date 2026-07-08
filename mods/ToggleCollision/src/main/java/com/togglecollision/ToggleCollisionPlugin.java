package com.togglecollision;

import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

public class ToggleCollisionPlugin extends JavaPlugin {

    private static ToggleCollisionPlugin instance;

    public ToggleCollisionPlugin(JavaPluginInit init) {
        super(init);
        instance = this;
    }

    @Override
    protected void setup() {
        getLogger().atInfo().log("[ToggleCollision] Плагин загружен");
    }

    @Override
    protected void start() {
        try {
            getCommandRegistry().registerCommand(new ToggleCollisionCommand());
            getLogger().atInfo().log("[ToggleCollision] Команда /togglecollision зарегистрирована.");
        } catch (Throwable t) {
            getLogger().atSevere().withCause(t).log(
                "[ToggleCollision] Не удалось зарегистрировать команду (сервер продолжит работу)."
            );
        }
    }

    @Override
    public void shutdown() {
        getLogger().atInfo().log("[ToggleCollision] Плагин выключен");
    }

    public static ToggleCollisionPlugin get() {
        return instance;
    }
}

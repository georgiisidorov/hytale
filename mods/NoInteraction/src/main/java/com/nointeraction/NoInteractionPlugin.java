package com.nointeraction;

import com.hypixel.hytale.component.ComponentType;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

public class NoInteractionPlugin extends JavaPlugin {

    private static NoInteractionPlugin instance;
    private ComponentType<EntityStore, NoInteractionComponent> noInteractionComponentType;

    public NoInteractionPlugin(JavaPluginInit init) {
        super(init);
        instance = this;
    }

    @Override
    protected void setup() {
        getLogger().atInfo().log("[NoInteraction] Плагин загружен");
        noInteractionComponentType = getEntityStoreRegistry().registerComponent(
            NoInteractionComponent.class,
            NoInteractionComponent::new
        );
        NoInteractionComponent.setComponentType(noInteractionComponentType);
    }

    @Override
    protected void start() {
        try {
            getCommandRegistry().registerCommand(new NoInteractionCommand());
            getLogger().atInfo().log("[NoInteraction] Команда /nointeraction зарегистрирована.");
        } catch (Throwable t) {
            getLogger().atSevere().withCause(t).log(
                "[NoInteraction] Не удалось зарегистрировать команду (сервер продолжит работу)."
            );
        }
    }

    @Override
    public void shutdown() {
        getLogger().atInfo().log("[NoInteraction] Плагин выключен");
    }

    public static NoInteractionPlugin get() {
        return instance;
    }

    public ComponentType<EntityStore, NoInteractionComponent> getNoInteractionComponentType() {
        return noInteractionComponentType;
    }
}

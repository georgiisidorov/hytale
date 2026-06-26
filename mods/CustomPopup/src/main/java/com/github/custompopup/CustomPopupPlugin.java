package com.github.custompopup;

import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

/**
 * Переиспользуемое in-game popup на Custom UI ({@link PopupPage}).
 * Не открывает внешний браузер — всё рисуется поверх игры.
 */
public final class CustomPopupPlugin extends JavaPlugin {
    private static volatile CustomPopupPlugin instance;

    private PopupServiceImpl service;

    public CustomPopupPlugin(JavaPluginInit init) {
        super(init);
    }

    public static CustomPopupPlugin instance() {
        return instance;
    }

    public PopupService service() {
        return service;
    }

    @Override
    protected void setup() {
        try {
            getCommandRegistry().registerCommand(new CustomPopupCommand(this));
            getLogger().atInfo().log("[CustomPopup] Команда /custompopup зарегистрирована.");
        } catch (Throwable t) {
            getLogger().atSevere().withCause(t).log("[CustomPopup] Не удалось зарегистрировать команду.");
        }
    }

    @Override
    protected void start() {
        instance = this;
        service = new PopupServiceImpl();
        getLogger().atInfo().log("[CustomPopup] In-game popup API готов.");
    }

    @Override
    protected void shutdown() {
        service = null;
        if (instance == this) {
            instance = null;
        }
    }
}

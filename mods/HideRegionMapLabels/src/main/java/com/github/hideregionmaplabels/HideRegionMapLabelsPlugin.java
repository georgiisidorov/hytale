package com.github.hideregionmaplabels;

import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

/**
 * Подписи spawn/countryside на карте отключаются патчем внутри WorldProtect.jar (см. patch-wp-labels.sh при сборке).
 * Включите map.enabled=true у WorldProtect — заливка зон на карте остаётся, дублирующихся надписей не будет.
 */
public final class HideRegionMapLabelsPlugin extends JavaPlugin {

    public HideRegionMapLabelsPlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void start() {
        try {
            Class.forName("dev.worldprotect.worldprotect.map.RegionLabelFilter");
            getLogger()
                .atInfo()
                .log(
                    "[HideRegionMapLabels] WorldProtect: подписи на карте скрыты для spawn и countryside."
                );
        } catch (ClassNotFoundException e) {
            getLogger()
                .atWarning()
                .log(
                    "[HideRegionMapLabels] WorldProtect не пропатчен. Запустите mods/HideRegionMapLabels/patch-wp-labels.sh и перезапустите сервер."
                );
        }
    }
}

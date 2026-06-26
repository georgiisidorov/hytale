package com.github.wpmapcompat;

import java.util.Locale;

/** Не рисовать подписи на карте для этих регионов (наложение spawn + countryside). */
final class HiddenRegionLabels {

    private HiddenRegionLabels() {}

    static boolean shouldHide(String regionId) {
        if (regionId == null) {
            return false;
        }
        String lower = regionId.toLowerCase(Locale.ROOT);
        return "spawn".equals(lower) || "countryside".equals(lower);
    }
}

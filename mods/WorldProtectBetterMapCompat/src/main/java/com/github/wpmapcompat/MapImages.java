package com.github.wpmapcompat;

import com.hypixel.hytale.protocol.packets.worldmap.MapImage;

final class MapImages {

    private MapImages() {}

    /** Накладывает цвет региона поверх рельефа (0.5.3: MapImage без int[] data — пока no-op). */
    static void mergeRegionOnto(MapImage base, MapImage overlay) {
        if (base == null || overlay == null) {
            return;
        }
        if (base.width != overlay.width || base.height != overlay.height) {
            return;
        }
        // TODO: 0.5.3 MapImage — packedIndices + palette вместо data[]
    }
}

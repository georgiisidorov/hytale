package com.github.wpmapcompat;

import com.hypixel.hytale.server.core.universe.world.World;
import java.lang.reflect.Field;
import java.lang.reflect.Method;

/**
 * Убирает подписи spawn/countryside из rawPixels RegionImageBuilder (без патча WorldProtect.jar).
 */
final class RegionLabelStripper {

    private static volatile Class<?> bitmapFontClass;
    private static volatile int colorWhite = -1;
    private static volatile int colorBlack = -1;
    private static volatile int charHeight = 8;

    private RegionLabelStripper() {}

    static void stripFromBuilder(Object builder, World world, int blockOriginX, int blockOriginZ) {
        if (builder == null || world == null) {
            return;
        }
        try {
            ensureFontConstants();
            Field rawField = builder.getClass().getDeclaredField("rawPixels");
            rawField.setAccessible(true);
            int[] raw = (int[]) rawField.get(builder);
            if (raw == null || raw.length == 0) {
                return;
            }
            Field imageField = builder.getClass().getDeclaredField("image");
            imageField.setAccessible(true);
            Object mapImage = imageField.get(builder);
            if (mapImage == null) {
                return;
            }
            int width = (int) mapImage.getClass().getField("width").get(mapImage);
            int height = (int) mapImage.getClass().getField("height").get(mapImage);

            for (Object region : WorldProtectBridge.listMapVisibleRegions(world)) {
                if (region == null) {
                    continue;
                }
                String id = (String) invoke(region, "id");
                String idLower = (String) invoke(region, "idLower");
                if (!HiddenRegionLabels.shouldHide(idLower != null ? idLower : id)) {
                    continue;
                }
                int centerX = ((int) invoke(region, "minX") + (int) invoke(region, "maxX")) / 2;
                int centerZ = ((int) invoke(region, "minZ") + (int) invoke(region, "maxZ")) / 2;
                if (centerX < blockOriginX || centerX >= blockOriginX + 32) {
                    continue;
                }
                if (centerZ < blockOriginZ || centerZ >= blockOriginZ + 32) {
                    continue;
                }
                int textWidth =
                    (int)
                        bitmapFontClass
                            .getMethod("getTextWidth", String.class)
                            .invoke(null, id);
                int px = (centerX - blockOriginX) * width / 32 - textWidth / 2;
                int py = (centerZ - blockOriginZ) * height / 32 - 3;
                eraseLabelArea(raw, width, height, px, py, textWidth, charHeight + 2);
            }

            Method encode = builder.getClass().getDeclaredMethod("encodeToPalette");
            encode.setAccessible(true);
            encode.invoke(builder);
        } catch (ReflectiveOperationException ignored) {
            // overlay без правки подписей
        }
    }

    private static void eraseLabelArea(
        int[] raw, int width, int height, int x, int y, int textWidth, int textHeight) {
        int x0 = Math.max(0, x - 1);
        int y0 = Math.max(0, y - 1);
        int x1 = Math.min(width - 1, x + textWidth + 1);
        int y1 = Math.min(height - 1, y + textHeight + 1);
        for (int py = y0; py <= y1; py++) {
            for (int px = x0; px <= x1; px++) {
                int i = py * width + px;
                if (i < 0 || i >= raw.length) {
                    continue;
                }
                int c = raw[i];
                if (c == colorWhite || c == colorBlack || isOutlineShade(c)) {
                    raw[i] = 0;
                }
            }
        }
    }

    private static boolean isOutlineShade(int color) {
        // тёмные/светлые оттенки обводки BitmapFont (кроме чистой заливки региона)
        int r = (color >> 16) & 0xFF;
        int g = (color >> 8) & 0xFF;
        int b = color & 0xFF;
        return (r > 240 && g > 240 && b > 240) || (r < 20 && g < 20 && b < 20);
    }

    private static void ensureFontConstants() throws ReflectiveOperationException {
        if (bitmapFontClass != null) {
            return;
        }
        Class<?> cls = Class.forName("dev.worldprotect.worldprotect.map.BitmapFont");
        colorWhite = cls.getField("WHITE").getInt(null);
        colorBlack = cls.getField("BLACK").getInt(null);
        charHeight = cls.getField("CHAR_HEIGHT").getInt(null);
        bitmapFontClass = cls;
    }

    private static Object invoke(Object target, String method) throws ReflectiveOperationException {
        Method m = target.getClass().getMethod(method);
        return m.invoke(target);
    }
}

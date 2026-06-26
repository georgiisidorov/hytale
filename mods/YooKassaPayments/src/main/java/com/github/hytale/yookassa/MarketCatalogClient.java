package com.github.hytale.yookassa;

import com.hypixel.hytale.logger.HytaleLogger;
import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Загрузка каталога из админ-панели (PostgreSQL → REST). */
public final class MarketCatalogClient {
    private static final Duration TIMEOUT = Duration.ofSeconds(12);

    private final HttpClient http =
            HttpClient.newBuilder()
                    .connectTimeout(TIMEOUT)
                    .version(HttpClient.Version.HTTP_1_1)
                    .build();

    public MarketCatalog fetch(String catalogUrl, String apiKey, HytaleLogger log) {
        if (catalogUrl == null || catalogUrl.isBlank()) {
            return MarketCatalog.fallback();
        }
        try {
            HttpRequest.Builder req = HttpRequest.newBuilder()
                    .uri(URI.create(trimTrailingSlash(catalogUrl) + "/api/hytale/market/catalog"))
                    .timeout(TIMEOUT)
                    .GET();
            if (apiKey != null && !apiKey.isBlank()) {
                req.header("X-Market-Key", apiKey.trim());
            }
            HttpResponse<String> res = http.send(req.build(), HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) {
                if (log != null) {
                    log.atWarning().log("[Market] catalog HTTP %d", res.statusCode());
                }
                return MarketCatalog.fallback();
            }
            JSONObject root = new JSONObject(res.body());
            if (!root.optBoolean("ok", false)) {
                if (log != null) {
                    log.atWarning().log("[Market] catalog error: %s", root.optString("error"));
                }
                return MarketCatalog.fallback();
            }
            List<MarketCatalog.ShopItem> shop = parseShop(root.optJSONArray("shop"));
            List<MarketCatalog.WheelSlot> wheel = parseWheel(root.optJSONArray("wheel"));
            List<MarketCatalog.WheelReward> wheelRewards = parseWheelRewards(root.optJSONArray("wheel_rewards"));
            long version = root.optLong("version", System.currentTimeMillis());
            if (shop.isEmpty() && wheel.isEmpty()) {
                return MarketCatalog.fallback();
            }
            if (log != null) {
                log.atInfo().log("[Market] catalog loaded v=%d shop=%d wheel=%d rewards=%d", version, shop.size(), wheel.size(), wheelRewards.size());
            }
            return new MarketCatalog(shop, wheel, wheelRewards, version, true);
        } catch (Throwable t) {
            if (log != null) {
                log.atWarning().withCause(t).log("[Market] catalog fetch failed");
            }
            return MarketCatalog.fallback();
        }
    }

    private static List<MarketCatalog.ShopItem> parseShop(JSONArray arr) {
        List<MarketCatalog.ShopItem> out = new ArrayList<>();
        if (arr == null) {
            return out;
        }
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o == null) {
                continue;
            }
            String itemId = o.optString("item_id", "").trim();
            if (itemId.isEmpty()) {
                continue;
            }
            String currency = o.optString("currency", "coins");
            boolean crystals = "crystals".equalsIgnoreCase(currency);
            out.add(new MarketCatalog.ShopItem(
                    itemId,
                    Math.max(1, o.optInt("quantity", 1)),
                    o.optString("display_name", itemId),
                    o.optString("rarity", "Common"),
                    Math.max(0, o.optInt("price", 0)),
                    crystals,
                    o.optString("ui_category", "featured"),
                    o.optString("description", ""),
                    o.optString("stat1", ""),
                    o.optString("stat2", ""),
                    o.optString("stat3", "")
            ));
        }
        return out;
    }

    private static List<MarketCatalog.WheelSlot> parseWheel(JSONArray arr) {
        List<MarketCatalog.WheelSlot> out = new ArrayList<>();
        if (arr == null) {
            return out;
        }
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o == null) {
                continue;
            }
            String itemId = o.optString("item_id", "").trim();
            if (itemId.isEmpty()) {
                continue;
            }
            out.add(new MarketCatalog.WheelSlot(
                    o.optInt("slot_index", i),
                    itemId,
                    Math.max(1, o.optInt("weight", 100)),
                    Math.max(1, o.optInt("qty_min", 1)),
                    Math.max(1, o.optInt("qty_max", o.optInt("qty_min", 1))),
                    o.optString("rarity", "Common"),
                    o.optString("display_name", itemId)
            ));
        }
        return out;
    }

    private static List<MarketCatalog.WheelReward> parseWheelRewards(JSONArray arr) {
        List<MarketCatalog.WheelReward> out = new ArrayList<>();
        if (arr == null) return out;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o == null) continue;
            String rewardId = o.optString("reward_id", "").trim();
            if (rewardId.isEmpty()) continue;
            String itemId = o.isNull("item_id") ? null : o.optString("item_id", null);
            out.add(new MarketCatalog.WheelReward(
                    rewardId,
                    o.optString("rarity", "Common"),
                    o.optString("reward_type", "item"),
                    itemId,
                    Math.max(1, o.optInt("quantity", 1)),
                    Math.max(1, o.optInt("weight", 100)),
                    o.optString("display_name_ru", rewardId)
            ));
        }
        return out;
    }

    private static String trimTrailingSlash(String url) {
        String u = url.trim();
        while (u.endsWith("/")) {
            u = u.substring(0, u.length() - 1);
        }
        return u;
    }
}

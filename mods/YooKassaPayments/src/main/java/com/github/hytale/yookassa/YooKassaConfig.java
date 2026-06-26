package com.github.hytale.yookassa;

import com.hypixel.hytale.logger.HytaleLogger;

import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

/**
 * shop_id + secret_key: личный кабинет ЮKassa.
 * return_url: куда виджет вернёт пользователя после оплаты.
 * widget_base_url: публичный URL страницы с виджетом (например http://IP:8765).
 */
public final class YooKassaConfig {
    public final String shopId;
    public final String secretKey;
    public final String returnUrl;
    public final String widgetBaseUrl;
    public final String widgetBindHost;
    public final int widgetPort;
    /** Базовый URL админ-панели для GET /api/hytale/market/catalog */
    public final String marketCatalogUrl;
    public final String marketCatalogApiKey;
    /** Стоимость платного спина рулетки в кристаллах. */
    public final int wheelSpinCrystalCost;
    /** Игровых монет за 1 ₽ при пополнении. */
    public final int coinsPerRub;
    /** Кристаллов за 1 ₽ при пополнении. */
    public final int crystalsPerRub;

    private YooKassaConfig(
            String shopId,
            String secretKey,
            String returnUrl,
            String widgetBaseUrl,
            String widgetBindHost,
            int widgetPort,
            String marketCatalogUrl,
            String marketCatalogApiKey,
            int wheelSpinCrystalCost,
            int coinsPerRub,
            int crystalsPerRub
    ) {
        this.shopId = shopId;
        this.secretKey = secretKey;
        this.returnUrl = returnUrl;
        this.widgetBaseUrl = widgetBaseUrl;
        this.widgetBindHost = widgetBindHost;
        this.widgetPort = widgetPort;
        this.marketCatalogUrl = marketCatalogUrl;
        this.marketCatalogApiKey = marketCatalogApiKey;
        this.wheelSpinCrystalCost = wheelSpinCrystalCost;
        this.coinsPerRub = coinsPerRub;
        this.crystalsPerRub = crystalsPerRub;
    }

    public boolean isValid() {
        return shopId != null && !shopId.isBlank() && secretKey != null && !secretKey.isBlank();
    }

    /** Базовый URL для ссылки на /pay/{sessionId} (без trailing slash). */
    public String widgetBaseUrlEffective(int actualBoundPort) {
        if (widgetBaseUrl != null && !widgetBaseUrl.isBlank()) {
            return trimTrailingSlash(widgetBaseUrl);
        }
        return "http://127.0.0.1:" + actualBoundPort;
    }

    public String payPageUrl(String sessionId, int actualBoundPort) {
        return widgetBaseUrlEffective(actualBoundPort) + "/pay/" + sessionId;
    }

    public static YooKassaConfig load(Path dataDir, HytaleLogger logger) {
        String shop = firstNonBlank(System.getenv("YOOKASSA_SHOP_ID"), System.getenv("YUKASSA_SHOP_ID"));
        String sec = firstNonBlank(System.getenv("YOOKASSA_SECRET_KEY"), System.getenv("YUKASSA_SECRET_KEY"));
        String ret = firstNonBlank(System.getenv("YOOKASSA_RETURN_URL"), "https://yookassa.ru/");
        String widgetBase = firstNonBlank(System.getenv("YOOKASSA_WIDGET_BASE_URL"));
        String widgetBind = firstNonBlank(System.getenv("YOOKASSA_WIDGET_BIND"), "0.0.0.0");
        int widgetPort = parsePort(firstNonBlank(System.getenv("YOOKASSA_WIDGET_PORT")), 8765);
        String marketUrl = firstNonBlank(
                System.getenv("YOOKASSA_MARKET_CATALOG_URL"),
                System.getenv("MARKET_CATALOG_URL")
        );
        String marketKey = firstNonBlank(
                System.getenv("YOOKASSA_MARKET_CATALOG_KEY"),
                System.getenv("MARKET_CATALOG_API_KEY")
        );
        int wheelCost = parsePositiveInt(
                firstNonBlank(System.getenv("MARKET_WHEEL_SPIN_CRYSTALS")),
                150
        );
        int coinsRate = parsePositiveInt(firstNonBlank(System.getenv("MARKET_COINS_PER_RUB")), 100);
        int crystalsRate = parsePositiveInt(firstNonBlank(System.getenv("MARKET_CRYSTALS_PER_RUB")), 1);

        Path propsFile = dataDir.resolve("yookassa.properties");
        if (Files.isRegularFile(propsFile)) {
            Properties p = new Properties();
            try (Reader r = Files.newBufferedReader(propsFile, StandardCharsets.UTF_8)) {
                p.load(r);
            } catch (IOException e) {
                if (logger != null) {
                    logger.atWarning().withCause(e).log("[YooKassa] Не удалось прочитать %s", propsFile);
                }
            }
            shop = firstNonBlank(shop, p.getProperty("shop_id"), p.getProperty("shopId"));
            sec = firstNonBlank(sec, p.getProperty("secret_key"), p.getProperty("secretKey"));
            ret = firstNonBlank(p.getProperty("return_url"), p.getProperty("returnUrl"), ret);
            widgetBase = firstNonBlank(widgetBase, p.getProperty("widget_base_url"), p.getProperty("widgetBaseUrl"));
            widgetBind = firstNonBlank(widgetBind, p.getProperty("widget_bind"), p.getProperty("widgetBind"), "0.0.0.0");
            widgetPort = parsePort(firstNonBlank(p.getProperty("widget_port"), p.getProperty("widgetPort")), widgetPort);
            marketUrl = firstNonBlank(marketUrl, p.getProperty("market_catalog_url"), p.getProperty("marketCatalogUrl"));
            marketKey = firstNonBlank(marketKey, p.getProperty("market_catalog_key"), p.getProperty("marketCatalogKey"));
            wheelCost = parsePositiveInt(
                    firstNonBlank(p.getProperty("wheel_spin_crystals"), p.getProperty("wheelSpinCrystals")),
                    wheelCost
            );
            coinsRate = parsePositiveInt(
                    firstNonBlank(p.getProperty("coins_per_rub"), p.getProperty("coinsPerRub")),
                    coinsRate
            );
            crystalsRate = parsePositiveInt(
                    firstNonBlank(p.getProperty("crystals_per_rub"), p.getProperty("crystalsPerRub")),
                    crystalsRate
            );
        } else {
            if (!Files.exists(dataDir)) {
                try {
                    Files.createDirectories(dataDir);
                } catch (IOException ignored) {
                }
            }
            Path example = dataDir.resolve("yookassa.properties.example");
            if (!Files.isRegularFile(propsFile) && !Files.isRegularFile(example)) {
                try (InputStream in = YooKassaConfig.class.getClassLoader().getResourceAsStream("yookassa.properties.example")) {
                    if (in != null) {
                        Files.copy(in, example);
                    }
                } catch (IOException e) {
                    if (logger != null) {
                        logger.atWarning().withCause(e).log("[YooKassa] Не удалось записать пример конфига");
                    }
                }
            }
        }

        return new YooKassaConfig(
                trimOrEmpty(shop),
                trimOrEmpty(sec),
                trimOrEmpty(ret),
                trimOrEmpty(widgetBase),
                trimOrEmpty(widgetBind).isEmpty() ? "0.0.0.0" : trimOrEmpty(widgetBind),
                widgetPort,
                trimOrEmpty(marketUrl),
                trimOrEmpty(marketKey),
                wheelCost,
                coinsRate,
                crystalsRate
        );
    }

    private static int parsePositiveInt(String raw, int defaultValue) {
        if (raw == null || raw.isBlank()) {
            return defaultValue;
        }
        try {
            int v = Integer.parseInt(raw.trim());
            return v > 0 ? v : defaultValue;
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private static int parsePort(String raw, int defaultPort) {
        if (raw == null || raw.isBlank()) {
            return defaultPort;
        }
        try {
            int p = Integer.parseInt(raw.trim());
            return p > 0 && p < 65536 ? p : defaultPort;
        } catch (NumberFormatException e) {
            return defaultPort;
        }
    }

    private static String trimTrailingSlash(String url) {
        String u = url.trim();
        while (u.endsWith("/")) {
            u = u.substring(0, u.length() - 1);
        }
        return u;
    }

    private static String firstNonBlank(String... xs) {
        if (xs == null) {
            return "";
        }
        for (String x : xs) {
            if (x != null) {
                String t = x.trim();
                if (!t.isEmpty()) {
                    return t;
                }
            }
        }
        return "";
    }

    private static String trimOrEmpty(String s) {
        return s == null ? "" : s.trim();
    }
}

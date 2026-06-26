package com.github.hytale.yookassa;

import com.hypixel.hytale.logger.HytaleLogger;
import org.json.JSONObject;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

/** Баланс монет/кристаллов через REST админ-панели. */
public final class PlayerWalletClient {
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final HttpClient http =
            HttpClient.newBuilder()
                    .connectTimeout(TIMEOUT)
                    .version(HttpClient.Version.HTTP_1_1)
                    .build();

    public record Balances(long coins, long crystals) {}

    public record PackItem(String itemId, int quantity) {}

    public record VoucherResult(boolean ok, String error, String packName, java.util.List<PackItem> items) {
        static VoucherResult fail(String error) {
            return new VoucherResult(false, error, "", java.util.List.of());
        }
        static VoucherResult ok(String packName, java.util.List<PackItem> items) {
            return new VoucherResult(true, "", packName, items);
        }
    }

    public record WalletResult(
            boolean ok,
            String error,
            Balances balances,
            long gameAmount,
            boolean alreadyCredited
    ) {
        static WalletResult fail(String error, Balances balances) {
            return new WalletResult(false, error, balances, 0, false);
        }

        static WalletResult ok(Balances balances) {
            return new WalletResult(true, "", balances, 0, false);
        }

        static WalletResult creditOk(Balances balances, long gameAmount, boolean already) {
            return new WalletResult(true, "", balances, gameAmount, already);
        }
    }

    public Balances fetch(UUID playerUuid, String apiBaseUrl, String apiKey, HytaleLogger log) {
        String base = trimTrailingSlash(apiBaseUrl);
        if (base.isEmpty() || playerUuid == null) {
            return new Balances(0, 0);
        }
        try {
            URI uri = URI.create(base + "/api/hytale/market/wallet?playerUuid=" + playerUuid);
            HttpRequest.Builder req = HttpRequest.newBuilder().uri(uri).timeout(TIMEOUT).GET();
            if (apiKey != null && !apiKey.isBlank()) {
                req.header("X-Market-Key", apiKey.trim());
            }
            HttpResponse<String> res = http.send(req.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (res.statusCode() != 200) {
                if (log != null) {
                    log.atWarning().log("[Wallet] GET HTTP %d", res.statusCode());
                }
                return new Balances(0, 0);
            }
            JSONObject root = new JSONObject(res.body());
            if (!root.optBoolean("ok", false)) {
                return new Balances(0, 0);
            }
            return new Balances(root.optLong("coins", 0), root.optLong("crystals", 0));
        } catch (Throwable t) {
            if (log != null) {
                log.atWarning().withCause(t).log("[Wallet] fetch failed");
            }
            return new Balances(0, 0);
        }
    }

    public WalletResult debit(
            UUID playerUuid,
            String currency,
            long amount,
            String reason,
            String apiBaseUrl,
            String apiKey,
            HytaleLogger log
    ) {
        return postWallet(
                "/api/hytale/market/wallet/debit",
                debitBody(playerUuid, currency, amount, reason),
                apiBaseUrl,
                apiKey,
                log,
                false
        );
    }

    public WalletResult creditYooKassa(
            String paymentId,
            UUID playerUuid,
            String creditCurrency,
            BigDecimal rubAmount,
            String apiBaseUrl,
            String apiKey,
            HytaleLogger log
    ) {
        if (paymentId == null || paymentId.isBlank() || playerUuid == null || rubAmount == null) {
            return WalletResult.fail("invalid credit params", null);
        }
        JSONObject body = new JSONObject();
        body.put("paymentId", paymentId);
        body.put("playerUuid", playerUuid.toString());
        body.put("creditCurrency", creditCurrency != null ? creditCurrency : "coins");
        body.put("rubAmount", rubAmount.doubleValue());
        WalletResult r = postWallet(
                "/api/hytale/market/wallet/credit-yookassa",
                body.toString(),
                apiBaseUrl,
                apiKey,
                log,
                true
        );
        if (!r.ok()) {
            return r;
        }
        return WalletResult.creditOk(r.balances, r.gameAmount, r.alreadyCredited);
    }

    /** Зачисляет фиксированное количество монет (для кит-паков, игнорируя rub-rate). */
    public WalletResult creditYooKassaFixed(
            String paymentId,
            UUID playerUuid,
            String creditCurrency,
            long fixedGameAmount,
            BigDecimal rubAmount,
            String apiBaseUrl,
            String apiKey,
            HytaleLogger log
    ) {
        if (paymentId == null || paymentId.isBlank() || playerUuid == null || fixedGameAmount <= 0) {
            return WalletResult.fail("invalid credit params", null);
        }
        JSONObject body = new JSONObject();
        body.put("paymentId", paymentId);
        body.put("playerUuid", playerUuid.toString());
        body.put("creditCurrency", creditCurrency != null ? creditCurrency : "coins");
        body.put("rubAmount", rubAmount != null ? rubAmount.doubleValue() : 0.0);
        body.put("gameAmountOverride", fixedGameAmount);
        WalletResult r = postWallet(
                "/api/hytale/market/wallet/credit-yookassa",
                body.toString(),
                apiBaseUrl,
                apiKey,
                log,
                true
        );
        if (!r.ok()) {
            return r;
        }
        return WalletResult.creditOk(r.balances, r.gameAmount, r.alreadyCredited);
    }

    public WalletResult creditWheelCoins(
            UUID playerUuid,
            long amount,
            String apiBaseUrl,
            String apiKey,
            HytaleLogger log
    ) {
        JSONObject body = new JSONObject();
        body.put("playerUuid", playerUuid.toString());
        body.put("currency", "coins");
        body.put("amount", amount);
        body.put("reason", "wheel_reward");
        return postWallet("/api/hytale/market/wallet/credit-wheel", body.toString(), apiBaseUrl, apiKey, log, true);
    }

    private static String debitBody(UUID playerUuid, String currency, long amount, String reason) {
        JSONObject body = new JSONObject();
        body.put("playerUuid", playerUuid.toString());
        body.put("currency", currency);
        body.put("amount", amount);
        body.put("reason", reason != null ? reason : "debit");
        return body.toString();
    }

    private WalletResult postWallet(
            String path,
            String jsonBody,
            String apiBaseUrl,
            String apiKey,
            HytaleLogger log,
            boolean credit
    ) {
        String base = trimTrailingSlash(apiBaseUrl);
        if (base.isEmpty()) {
            return WalletResult.fail("wallet API URL не задан", null);
        }
        try {
            HttpRequest.Builder req = HttpRequest.newBuilder()
                    .uri(URI.create(base + path))
                    .timeout(TIMEOUT)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8));
            if (apiKey != null && !apiKey.isBlank()) {
                req.header("X-Market-Key", apiKey.trim());
            }
            HttpResponse<String> res = http.send(req.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JSONObject root = new JSONObject(res.body() == null ? "{}" : res.body());
            Balances balances = new Balances(root.optLong("coins", 0), root.optLong("crystals", 0));
            if (res.statusCode() == 200 && root.optBoolean("ok", false)) {
                if (credit) {
                    return WalletResult.creditOk(
                            balances,
                            root.optLong("gameAmount", 0),
                            root.optBoolean("alreadyCredited", false)
                    );
                }
                return WalletResult.ok(balances);
            }
            String err = root.optString("error", "HTTP " + res.statusCode());
            if (log != null) {
                log.atWarning().log("[Wallet] %s failed: %s", path, err);
            }
            return WalletResult.fail(err, balances);
        } catch (Throwable t) {
            if (log != null) {
                log.atWarning().withCause(t).log("[Wallet] POST %s failed", path);
            }
            return WalletResult.fail(t.getMessage() != null ? t.getMessage() : "wallet error", null);
        }
    }

    public VoucherResult claimPackVoucher(
            String code,
            UUID playerUuid,
            String apiBaseUrl,
            String apiKey,
            HytaleLogger log
    ) {
        String base = trimTrailingSlash(apiBaseUrl);
        if (base.isEmpty()) return VoucherResult.fail("API URL не задан");
        try {
            JSONObject body = new JSONObject();
            body.put("code", code);
            body.put("playerUuid", playerUuid.toString());
            HttpRequest.Builder req = HttpRequest.newBuilder()
                    .uri(URI.create(base + "/api/hytale/market/packs/claim"))
                    .timeout(TIMEOUT)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8));
            if (apiKey != null && !apiKey.isBlank()) req.header("X-Market-Key", apiKey.trim());
            HttpResponse<String> res = http.send(req.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JSONObject root = new JSONObject(res.body() == null ? "{}" : res.body());
            if (!root.optBoolean("ok", false)) {
                String err = root.optString("error", "Ошибка сервера (" + res.statusCode() + ")");
                if (log != null) log.atWarning().log("[Voucher] claim failed: %s", err);
                return VoucherResult.fail(err);
            }
            String packName = root.optString("packName", code);
            org.json.JSONArray arr = root.optJSONArray("items");
            java.util.List<PackItem> items = new java.util.ArrayList<>();
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject o = arr.optJSONObject(i);
                    if (o != null) items.add(new PackItem(o.optString("item_id"), Math.max(1, o.optInt("quantity", 1))));
                }
            }
            return VoucherResult.ok(packName, items);
        } catch (Throwable t) {
            if (log != null) log.atWarning().withCause(t).log("[Voucher] claim error");
            return VoucherResult.fail("Ошибка соединения с сервером");
        }
    }

    private static String trimTrailingSlash(String url) {
        if (url == null) {
            return "";
        }
        String u = url.trim();
        while (u.endsWith("/")) {
            u = u.substring(0, u.length() - 1);
        }
        return u;
    }
}

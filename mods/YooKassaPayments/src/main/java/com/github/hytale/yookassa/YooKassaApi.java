package com.github.hytale.yookassa;

import com.hypixel.hytale.logger.HytaleLogger;
import org.json.JSONObject;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

/**
 * REST ЮKassa: POST/GET https://api.yookassa.ru/v3/payments
 *
 * @see <a href="https://yookassa.ru/developers/api#create_payment">Create payment</a>
 * @see <a href="https://yookassa.ru/developers/payment-acceptance/integration-scenarios/manual-integration/other/sbp">СБП</a>
 * @see <a href="https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/pay-with-saved">Автоплатежи</a>
 */
public final class YooKassaApi {
    private static final URI PAYMENTS_URI = URI.create("https://api.yookassa.ru/v3/payments");

    private final HttpClient http =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

    /** Обычный платёж: redirect на страницу ЮKassa (карта, кошелёк и др.). */
    public PaymentResult createRedirectPayment(
            String shopId,
            String secretKey,
            BigDecimal amountRub,
            String description,
            String returnUrl,
            Map<String, String> metadata,
            boolean savePaymentMethod,
            UUID idempotenceKey,
            HytaleLogger log
    ) throws IOException, InterruptedException {
        return createPayment(
                shopId, secretKey, amountRub, description, metadata, idempotenceKey,
                "redirect", returnUrl, null, null, savePaymentMethod, log
        );
    }

    /** СБП: redirect на страницу ЮKassa с QR / выбором банка. */
    public PaymentResult createSbpPayment(
            String shopId,
            String secretKey,
            BigDecimal amountRub,
            String description,
            String returnUrl,
            Map<String, String> metadata,
            boolean savePaymentMethod,
            UUID idempotenceKey,
            HytaleLogger log
    ) throws IOException, InterruptedException {
        JSONObject sbp = new JSONObject();
        sbp.put("type", "sbp");
        return createPayment(
                shopId, secretKey, amountRub, description, metadata, idempotenceKey,
                "redirect", returnUrl, sbp, null, savePaymentMethod, log
        );
    }

    /** Embedded-платёж: confirmationToken для виджета ЮKassa (открывается на нашей странице). */
    public PaymentResult createEmbeddedPayment(
            String shopId,
            String secretKey,
            BigDecimal amountRub,
            String description,
            Map<String, String> metadata,
            UUID idempotenceKey,
            HytaleLogger log
    ) throws IOException, InterruptedException {
        return createPayment(
                shopId, secretKey, amountRub, description, metadata, idempotenceKey,
                "embedded", null, null, null, false, log
        );
    }

    /** Повторный платёж по сохранённому payment_method_id (без redirect). */
    public PaymentResult createAutopayment(
            String shopId,
            String secretKey,
            BigDecimal amountRub,
            String description,
            Map<String, String> metadata,
            String paymentMethodId,
            UUID idempotenceKey,
            HytaleLogger log
    ) throws IOException, InterruptedException {
        return createPayment(
                shopId, secretKey, amountRub, description, metadata, idempotenceKey,
                null, null, null, paymentMethodId, false, log
        );
    }

    public PaymentResult getPayment(String shopId, String secretKey, String paymentId, HytaleLogger log)
            throws IOException, InterruptedException {
        if (paymentId == null || paymentId.isBlank()) {
            return PaymentResult.error(-1, "invalid_id", "payment id пустой");
        }
        URI uri = URI.create(PAYMENTS_URI + "/" + paymentId);
        String auth =
                Base64.getEncoder().encodeToString((shopId + ":" + secretKey).getBytes(StandardCharsets.UTF_8));
        HttpRequest req =
                HttpRequest.newBuilder(uri)
                        .timeout(Duration.ofSeconds(30))
                        .header("Authorization", "Basic " + auth)
                        .GET()
                        .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        return parseResponse(res.statusCode(), res.body(), log);
    }

    private PaymentResult createPayment(
            String shopId,
            String secretKey,
            BigDecimal amountRub,
            String description,
            Map<String, String> metadata,
            UUID idempotenceKey,
            String confirmationType,
            String returnUrl,
            JSONObject paymentMethodData,
            String paymentMethodId,
            boolean savePaymentMethod,
            HytaleLogger log
    ) throws IOException, InterruptedException {
        String amountStr = amountRub.setScale(2, RoundingMode.HALF_UP).toPlainString();
        if (log != null) {
            log.atInfo().log(
                    "[YooKassa] POST %s amount=%s RUB methodId=%s sbp=%s save=%s",
                    PAYMENTS_URI,
                    amountStr,
                    paymentMethodId != null ? "…" : "-",
                    paymentMethodData != null,
                    savePaymentMethod
            );
        }

        JSONObject amount = new JSONObject();
        amount.put("value", amountStr);
        amount.put("currency", "RUB");

        JSONObject payload = new JSONObject();
        payload.put("amount", amount);
        payload.put("capture", true);
        payload.put("description", description == null || description.isBlank() ? "Оплата" : description);

        if (confirmationType != null) {
            JSONObject confirmation = new JSONObject();
            confirmation.put("type", confirmationType);
            if ("redirect".equals(confirmationType) && returnUrl != null && !returnUrl.isBlank()) {
                confirmation.put("return_url", returnUrl);
            }
            payload.put("confirmation", confirmation);
        }
        if (paymentMethodData != null) {
            payload.put("payment_method_data", paymentMethodData);
        }
        if (paymentMethodId != null && !paymentMethodId.isBlank()) {
            payload.put("payment_method_id", paymentMethodId);
        }
        if (savePaymentMethod) {
            payload.put("save_payment_method", true);
        }

        if (metadata != null && !metadata.isEmpty()) {
            JSONObject meta = new JSONObject();
            for (Map.Entry<String, String> e : metadata.entrySet()) {
                if (e.getKey() != null && e.getValue() != null) {
                    meta.put(e.getKey(), e.getValue());
                }
            }
            if (!meta.isEmpty()) {
                payload.put("metadata", meta);
            }
        }

        String auth =
                Base64.getEncoder().encodeToString((shopId + ":" + secretKey).getBytes(StandardCharsets.UTF_8));

        HttpRequest req =
                HttpRequest.newBuilder(PAYMENTS_URI)
                        .timeout(Duration.ofSeconds(30))
                        .header("Authorization", "Basic " + auth)
                        .header("Idempotence-Key", idempotenceKey.toString())
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(payload.toString(), StandardCharsets.UTF_8))
                        .build();

        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        return parseResponse(res.statusCode(), res.body(), log);
    }

    private PaymentResult parseResponse(int httpStatus, String responseBody, HytaleLogger log) {
        String body = responseBody == null ? "" : responseBody;
        if (log != null) {
            log.atInfo().log("[YooKassa] HTTP %d bodyLen=%d", httpStatus, body.length());
            if (httpStatus < 200 || httpStatus >= 300) {
                String snippet = body.length() > 500 ? body.substring(0, 500) + "…" : body;
                log.atWarning().log("[YooKassa] error body: %s", snippet);
            }
        }

        JSONObject json = new JSONObject(body.isBlank() ? "{}" : body);
        if (httpStatus < 200 || httpStatus >= 300) {
            return PaymentResult.error(
                    httpStatus,
                    json.optString("type", "http_" + httpStatus),
                    json.optString("description", body)
            );
        }

        String id = json.optString("id", "");
        String status = json.optString("status", "");
        JSONObject conf = json.optJSONObject("confirmation");
        String payUrl = conf != null ? conf.optString("confirmation_url", "") : "";
        String token = conf != null ? conf.optString("confirmation_token", "") : "";

        String pmId = "";
        String pmTitle = "";
        boolean pmSaved = false;
        JSONObject pm = json.optJSONObject("payment_method");
        if (pm != null) {
            pmId = pm.optString("id", "");
            pmTitle = pm.optString("title", "");
            pmSaved = pm.optBoolean("saved", false);
        }

        return PaymentResult.ok(id, status, payUrl, token, pmId, pmTitle, pmSaved);
    }

    /** Тестовый секрет (test_…) — в песочнице ЮKassa СБП недоступен, только карта/кошелёк. */
    public static boolean isTestSecret(String secretKey) {
        return secretKey != null && secretKey.startsWith("test_");
    }

    public static boolean isPaymentMethodUnavailable(PaymentResult r) {
        if (r == null || r.ok()) {
            return false;
        }
        String detail = r.errorDetail();
        if (detail == null) {
            return false;
        }
        String d = detail.toLowerCase();
        return d.contains("payment method is not available")
                || d.contains("способ оплаты недоступен");
    }

    public static boolean isSbpConfirmationUrl(String confirmationUrl) {
        if (confirmationUrl == null || confirmationUrl.isBlank()) {
            return false;
        }
        String u = confirmationUrl.toLowerCase();
        return u.contains("/sbp") || u.contains("payments/sbp");
    }

    public record PaymentResult(
            boolean ok,
            String paymentId,
            String status,
            String confirmationUrl,
            String confirmationToken,
            String paymentMethodId,
            String paymentMethodTitle,
            boolean paymentMethodSaved,
            int httpStatus,
            String errorType,
            String errorDetail
    ) {
        public static PaymentResult ok(
                String paymentId,
                String status,
                String confirmationUrl,
                String confirmationToken,
                String paymentMethodId,
                String paymentMethodTitle,
                boolean paymentMethodSaved
        ) {
            return new PaymentResult(
                    true, paymentId, status, confirmationUrl, confirmationToken,
                    paymentMethodId, paymentMethodTitle, paymentMethodSaved,
                    200, "", ""
            );
        }

        public static PaymentResult error(int httpStatus, String errorType, String errorDetail) {
            return new PaymentResult(
                    false, "", "", "", "", "", "", false,
                    httpStatus, errorType, errorDetail
            );
        }

        public boolean isTerminal() {
            return "succeeded".equals(status) || "canceled".equals(status);
        }
    }
}

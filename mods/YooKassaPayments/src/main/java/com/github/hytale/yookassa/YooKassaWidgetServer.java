package com.github.hytale.yookassa;

import com.hypixel.hytale.logger.HytaleLogger;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

/**
 * Страница с {@code YooMoneyCheckoutWidget} по
 * <a href="https://yookassa.ru/developers/payment-acceptance/integration-scenarios/widget/quick-start">быстрому старту ЮKassa</a>.
 */
final class YooKassaWidgetServer {
    private final YooKassaPaymentSessions sessions;
    private final HytaleLogger log;
    private HttpServer server;
    private int boundPort = -1;

    YooKassaWidgetServer(YooKassaPaymentSessions sessions, HytaleLogger log) {
        this.sessions = sessions;
        this.log = log;
    }

    int boundPort() {
        return boundPort;
    }

    void start(String bindHost, int port) throws IOException {
        if (server != null) {
            return;
        }
        server = HttpServer.create(new InetSocketAddress(bindHost, port), 0);
        server.createContext("/pay/", this::handlePay);
        server.createContext("/health", ex -> respond(ex, 200, "ok", "text/plain; charset=utf-8"));
        server.setExecutor(Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "yookassa-widget-http");
            t.setDaemon(true);
            return t;
        }));
        server.start();
        boundPort = server.getAddress().getPort();
        log.atInfo().log("[YooKassa] Widget HTTP %s:%d (/pay/{sessionId})", bindHost, boundPort);
    }

    void stop() {
        if (server != null) {
            server.stop(0);
            server = null;
            boundPort = -1;
        }
    }

    private void handlePay(HttpExchange ex) throws IOException {
        if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
            respond(ex, 405, "Method Not Allowed", "text/plain; charset=utf-8");
            return;
        }
        String path = ex.getRequestURI().getPath();
        String sessionId = path.startsWith("/pay/") ? path.substring("/pay/".length()) : "";
        int slash = sessionId.indexOf('/');
        if (slash >= 0) {
            sessionId = sessionId.substring(0, slash);
        }
        if (sessionId.isBlank()) {
            respond(ex, 404, notFoundHtml(), "text/html; charset=utf-8");
            return;
        }
        YooKassaPaymentSession session = sessions.get(sessionId);
        if (session == null) {
            respond(ex, 404, notFoundHtml(), "text/html; charset=utf-8");
            return;
        }
        respond(ex, 200, widgetHtml(session), "text/html; charset=utf-8");
    }

    private static String widgetHtml(YooKassaPaymentSession session) {
        String token = escapeJs(session.confirmationToken);
        String returnUrl = escapeJs(session.returnUrl);
        return """
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Оплата — ЮKassa</title>
  <script src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f1525; color: #e0e8f0; margin: 0; padding: 24px; }
    h1 { font-size: 1.25rem; margin: 0 0 16px; color: #ffd700; }
    #payment-form { min-height: 420px; background: #1a1a2e; border-radius: 8px; padding: 16px; }
    .meta { font-size: 12px; color: #8899aa; margin-top: 12px; }
  </style>
</head>
<body>
  <h1>ЮKassa</h1>
  <div id="payment-form"></div>
  <p class="meta">Платёж %s</p>
  <script>
    const checkout = new window.YooMoneyCheckoutWidget({
      confirmation_token: '%s',
      return_url: '%s',
      error_callback: function(error) { console.error(error); }
    });
    checkout.render('payment-form');
  </script>
</body>
</html>
"""
                .formatted(escapeHtml(session.paymentId), token, returnUrl);
    }

    private static String notFoundHtml() {
        return """
<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Сессия не найдена</title></head>
<body style="font-family:system-ui;background:#0f1525;color:#e0e8f0;padding:24px">
<h1>Сессия оплаты не найдена или истекла</h1>
<p>Закройте вкладку и создайте платёж заново в игре (/yookassa).</p>
</body></html>
""";
    }

    private static void respond(HttpExchange ex, int code, String body, String contentType) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", contentType);
        ex.sendResponseHeaders(code, bytes.length);
        try (OutputStream out = ex.getResponseBody()) {
            out.write(bytes);
        }
    }

    private static String escapeHtml(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String escapeJs(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
    }
}

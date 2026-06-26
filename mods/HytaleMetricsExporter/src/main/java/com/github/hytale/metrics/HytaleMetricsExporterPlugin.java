package com.github.hytale.metrics;

import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import com.hypixel.hytale.server.core.universe.Universe;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class HytaleMetricsExporterPlugin extends JavaPlugin {
    private HttpServer server;
    private ExecutorService httpExecutor;
    private volatile Instant startedAt = Instant.now();

    public HytaleMetricsExporterPlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void setup() {
        // nothing
    }

    @Override
    protected void start() {
        startedAt = Instant.now();

        String host = env("HYTALE_METRICS_HOST", "0.0.0.0");
        int port = envInt("HYTALE_METRICS_PORT", 9105);

        try {
            httpExecutor = Executors.newFixedThreadPool(
                    Math.max(2, Runtime.getRuntime().availableProcessors() / 2),
                    (r) -> {
                        Thread t = new Thread(r, "hytale-metrics-http");
                        t.setDaemon(true);
                        return t;
                    }
            );

            InetAddress addr = InetAddress.getByName(host);
            server = HttpServer.create(new InetSocketAddress(addr, port), 0);
            server.createContext("/metrics", new MetricsHandler());
            server.setExecutor(httpExecutor);
            server.start();

            getLogger().atInfo().log("[HytaleMetricsExporter] Started on http://%s:%d/metrics", host, port);
        } catch (Throwable t) {
            getLogger().atSevere().withCause(t).log("[HytaleMetricsExporter] Failed to start HTTP server");
            stopHttp();
        }
    }

    @Override
    protected void shutdown() {
        stopHttp();
    }

    private void stopHttp() {
        try {
            if (server != null) {
                server.stop(0);
            }
        } catch (Throwable ignored) {
        } finally {
            server = null;
        }

        try {
            if (httpExecutor != null) {
                httpExecutor.shutdownNow();
            }
        } catch (Throwable ignored) {
        } finally {
            httpExecutor = null;
        }
    }

    private final class MetricsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            try {
                if (!"GET".equalsIgnoreCase(ex.getRequestMethod())) {
                    ex.sendResponseHeaders(405, -1);
                    return;
                }

                int online = safeOnlinePlayers();
                long uptimeSeconds = Math.max(0L, Instant.now().getEpochSecond() - startedAt.getEpochSecond());

                String body = buildPromText(online, uptimeSeconds);
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);

                Headers h = ex.getResponseHeaders();
                h.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
                h.set("Cache-Control", "no-store");

                ex.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = ex.getResponseBody()) {
                    os.write(bytes);
                }
            } catch (Throwable t) {
                try {
                    ex.sendResponseHeaders(500, -1);
                } catch (Throwable ignored) {
                }
            } finally {
                try {
                    ex.close();
                } catch (Throwable ignored) {
                }
            }
        }
    }

    private static int safeOnlinePlayers() {
        try {
            Universe u = Universe.get();
            if (u == null) return -1;
            return u.getPlayerCount();
        } catch (Throwable ignored) {
            return -1;
        }
    }

    private static String buildPromText(int online, long uptimeSeconds) {
        String onlineStr = Integer.toString(online);
        String uptimeStr = Long.toString(uptimeSeconds);

        return ""
                + "# HELP hytale_players_online Current online players (Universe.getPlayerCount).\n"
                + "# TYPE hytale_players_online gauge\n"
                + "hytale_players_online " + onlineStr + "\n"
                + "# HELP hytale_metrics_exporter_uptime_seconds Exporter uptime in seconds.\n"
                + "# TYPE hytale_metrics_exporter_uptime_seconds gauge\n"
                + "hytale_metrics_exporter_uptime_seconds " + uptimeStr + "\n";
    }

    private static String env(String name, String def) {
        String v = System.getenv(name);
        if (v == null) return def;
        v = v.trim();
        return v.isEmpty() ? def : v;
    }

    private static int envInt(String name, int def) {
        String v = System.getenv(name);
        if (v == null) return def;
        v = v.trim();
        if (v.isEmpty()) return def;
        try {
            return Integer.parseInt(v);
        } catch (NumberFormatException ignored) {
            return def;
        }
    }
}


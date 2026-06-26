package com.github.hytale.yookassa;

import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;

import java.nio.file.Path;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public final class YooKassaPaymentsPlugin extends JavaPlugin {
    private volatile YooKassaConfig config;
    private final YooKassaPaymentSessions paymentSessions = new YooKassaPaymentSessions();
    private YooKassaSavedMethods savedMethods;
    private YooKassaWidgetServer widgetServer;
    private volatile MarketCatalog marketCatalog = MarketCatalog.fallback();
    private final MarketCatalogClient marketCatalogClient = new MarketCatalogClient();
    private final PlayerWalletClient walletClient = new PlayerWalletClient();
    private final YooKassaPaymentWatcher paymentWatcher = new YooKassaPaymentWatcher(this);
    private ScheduledExecutorService marketRefreshExecutor;

    public YooKassaPaymentsPlugin(JavaPluginInit init) {
        super(init);
    }

    public YooKassaConfig config() {
        return config;
    }

    public YooKassaPaymentSessions paymentSessions() {
        return paymentSessions;
    }

    public YooKassaSavedMethods savedMethods() {
        return savedMethods;
    }

    public int widgetBoundPort() {
        return widgetServer != null ? widgetServer.boundPort() : -1;
    }

    public MarketCatalog marketCatalog() {
        MarketCatalog c = marketCatalog;
        return c != null ? c : MarketCatalog.fallback();
    }

    public PlayerWalletClient walletClient() {
        return walletClient;
    }

    public YooKassaPaymentWatcher paymentWatcher() {
        return paymentWatcher;
    }

    public void refreshMarketCatalog() {
        YooKassaConfig cfg = config;
        if (cfg == null) {
            marketCatalog = MarketCatalog.fallback();
            return;
        }
        marketCatalog = marketCatalogClient.fetch(cfg.marketCatalogUrl, cfg.marketCatalogApiKey, getLogger());
    }

    @Override
    protected void setup() {
        try {
            getCommandRegistry().registerCommand(new PayCommand(this));
            getLogger().atInfo().log("[YooKassaPayments] Команда /yookassa зарегистрирована.");
        } catch (Throwable t) {
            getLogger().atSevere().withCause(t).log("[YooKassaPayments] Не удалось зарегистрировать команду в setup().");
        }
    }

    @Override
    protected void start() {
        YooKassaStorage.cleanupBrokenModsFolder(getLogger());
        Path storage = YooKassaStorage.dataDir(getLogger());
        config = YooKassaConfig.load(storage, getLogger());
        savedMethods = new YooKassaSavedMethods(storage, getLogger());
        refreshMarketCatalog();
        marketRefreshExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "yookassa-market-catalog");
            t.setDaemon(true);
            return t;
        });
        marketRefreshExecutor.scheduleAtFixedRate(this::refreshMarketCatalog, 5, 5, TimeUnit.MINUTES);
        YooKassaConfig cfg = config;
        if (cfg.isValid()) {
            getLogger().atInfo().log(
                    "[YooKassaPayments] Старт. shop_id=…%s return_url=%s (redirect / СБП / повторные)",
                    maskTail(cfg.shopId, 4),
                    cfg.returnUrl
            );
            try {
                widgetServer = new YooKassaWidgetServer(paymentSessions, getLogger());
                widgetServer.start(cfg.widgetBindHost, cfg.widgetPort);
            } catch (Exception e) {
                getLogger().atWarning().withCause(e).log(
                        "[YooKassaPayments] HTTP виджета не запущен (не нужен для redirect/СБП)"
                );
            }
        } else {
            getLogger().atWarning().log(
                    "[YooKassaPayments] Старт без credentials — задайте YOOKASSA_* или yookassa.properties"
            );
        }
    }

    @Override
    protected void shutdown() {
        paymentWatcher.shutdown();
        if (marketRefreshExecutor != null) {
            marketRefreshExecutor.shutdownNow();
            marketRefreshExecutor = null;
        }
        if (widgetServer != null) {
            widgetServer.stop();
            widgetServer = null;
        }
    }

    private static String maskTail(String s, int tailLen) {
        if (s == null || s.isBlank()) {
            return "????";
        }
        String t = s.trim();
        if (t.length() <= tailLen) {
            return "****";
        }
        return "****" + t.substring(t.length() - tailLen);
    }
}

package com.github.hytale.yookassa;

import com.hypixel.hytale.logger.HytaleLogger;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;

import java.awt.Color;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Опрос статуса платежа на уровне плагина: зачисление выполняется даже если игрок закрыл UI.
 */
final class YooKassaPaymentWatcher {
    private static final int POLL_INTERVAL_SEC = 3;
    private static final int POLL_MAX_ATTEMPTS = 400;

    private final YooKassaPaymentsPlugin plugin;
    private final YooKassaApi api = new YooKassaApi();
    private final ScheduledExecutorService poller =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "yookassa-payment-watcher");
                t.setDaemon(true);
                return t;
            });

    private final Map<String, Pending> pending = new ConcurrentHashMap<>();

    YooKassaPaymentWatcher(YooKassaPaymentsPlugin plugin) {
        this.plugin = plugin;
    }

    interface TerminalListener {
        void onTerminal(YooKassaApi.PaymentResult result);
    }

    void watch(
            String paymentId,
            UUID playerUuid,
            World world,
            BigDecimal rubAmount,
            String creditCurrency,
            boolean watchSave,
            TerminalListener uiListener
    ) {
        if (paymentId == null || paymentId.isBlank() || playerUuid == null || world == null) {
            return;
        }
        Pending job =
                new Pending(
                        paymentId,
                        playerUuid,
                        world,
                        rubAmount,
                        creditCurrency != null ? creditCurrency : "coins",
                        watchSave,
                        uiListener
                );
        pending.put(paymentId, job);
        job.schedule();
    }

    void detachUi(String paymentId) {
        if (paymentId == null) {
            return;
        }
        Pending job = pending.get(paymentId);
        if (job != null) {
            job.uiListener = null;
        }
    }

    void cancel(String paymentId) {
        if (paymentId == null) {
            return;
        }
        Pending removed = pending.remove(paymentId);
        if (removed != null) {
            removed.stop();
        }
    }

    void shutdown() {
        for (Pending job : pending.values()) {
            job.stop();
        }
        pending.clear();
        poller.shutdownNow();
    }

    private final class Pending {
        final String paymentId;
        final UUID playerUuid;
        final World world;
        final BigDecimal rubAmount;
        final String creditCurrency;
        final boolean watchSave;
        volatile TerminalListener uiListener;
        final AtomicInteger attempts = new AtomicInteger();
        volatile ScheduledFuture<?> task;

        Pending(
                String paymentId,
                UUID playerUuid,
                World world,
                BigDecimal rubAmount,
                String creditCurrency,
                boolean watchSave,
                TerminalListener uiListener
        ) {
            this.paymentId = paymentId;
            this.playerUuid = playerUuid;
            this.world = world;
            this.rubAmount = rubAmount;
            this.creditCurrency = creditCurrency;
            this.watchSave = watchSave;
            this.uiListener = uiListener;
        }

        void schedule() {
            stop();
            task = poller.scheduleAtFixedRate(this::tick, POLL_INTERVAL_SEC, POLL_INTERVAL_SEC, TimeUnit.SECONDS);
        }

        void stop() {
            ScheduledFuture<?> t = task;
            task = null;
            if (t != null) {
                t.cancel(false);
            }
        }

        void tick() {
            int n = attempts.incrementAndGet();
            if (n > POLL_MAX_ATTEMPTS) {
                pending.remove(paymentId);
                stop();
                return;
            }
            YooKassaConfig cfg = plugin.config();
            if (cfg == null || !cfg.isValid()) {
                return;
            }
            HytaleLogger log = plugin.getLogger();
            try {
                YooKassaApi.PaymentResult r = api.getPayment(cfg.shopId, cfg.secretKey, paymentId, log);
                if (r != null && r.ok() && r.isTerminal()) {
                    pending.remove(paymentId);
                    stop();
                    world.execute(() -> handleTerminal(r));
                }
            } catch (Exception e) {
                log.atFine().withCause(e).log("[YooKassa] watcher poll %s", paymentId);
            }
        }

        private void handleTerminal(YooKassaApi.PaymentResult r) {
            TerminalListener listener = uiListener;
            if (listener != null) {
                listener.onTerminal(r);
                return;
            }
            creditAndNotify(r, plugin.getLogger());
        }

        private void creditAndNotify(YooKassaApi.PaymentResult r, HytaleLogger log) {
            if (watchSave && r.paymentMethodSaved()) {
                String pmId = r.paymentMethodId();
                if (pmId != null && !pmId.isBlank()) {
                    plugin.savedMethods().save(playerUuid, pmId, r.paymentMethodTitle());
                }
            }
            if (!"succeeded".equals(r.status())) {
                return;
            }
            if (rubAmount == null || rubAmount.compareTo(BigDecimal.ZERO) <= 0) {
                return;
            }
            YooKassaConfig cfg = plugin.config();
            PlayerWalletClient.WalletResult credit = plugin.walletClient().creditYooKassa(
                    r.paymentId(),
                    playerUuid,
                    creditCurrency,
                    rubAmount,
                    cfg.marketCatalogUrl,
                    cfg.marketCatalogApiKey,
                    log
            );
            if (!credit.ok()) {
                log.atWarning().log(
                        "[Wallet] background credit failed payment=%s player=%s: %s",
                        r.paymentId(),
                        playerUuid,
                        credit.error()
                );
                notifyPlayer(
                        "Платёж прошёл, но зачисление не выполнено. Откройте /yookassa или обратитесь к админу."
                );
                return;
            }
            String unit = "crystals".equals(creditCurrency) ? "кристаллов" : "монет";
            if (credit.alreadyCredited()) {
                notifyPlayer("Платёж уже был зачислен ранее (" + r.paymentId() + ").");
            } else {
                notifyPlayer("Зачислено " + credit.gameAmount() + " " + unit + " (платёж " + r.paymentId() + ").");
                log.atInfo().log(
                        "[Wallet] background credit ok payment=%s player=%s amount=%s %s",
                        r.paymentId(),
                        playerUuid,
                        credit.gameAmount(),
                        creditCurrency
                );
            }
        }

        private void notifyPlayer(String text) {
            try {
                for (PlayerRef ref : world.getPlayerRefs()) {
                    if (ref == null || !ref.isValid()) {
                        continue;
                    }
                    if (!playerUuid.equals(ref.getUuid())) {
                        continue;
                    }
                    ref.sendMessage(Message.raw(text).color(Color.ORANGE));
                    return;
                }
            } catch (Throwable ignored) {
            }
        }
    }
}

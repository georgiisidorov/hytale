package com.github.hytale.yookassa;

import java.time.Instant;
import java.util.UUID;

/** Сессия embedded-платежа для страницы с виджетом ЮKassa. */
public final class YooKassaPaymentSession {
    public final String sessionId;
    public final String paymentId;
    public final String confirmationToken;
    public final String returnUrl;
    public final UUID playerUuid;
    public final Instant createdAt;

    public YooKassaPaymentSession(
            String sessionId,
            String paymentId,
            String confirmationToken,
            String returnUrl,
            UUID playerUuid) {
        this.sessionId = sessionId;
        this.paymentId = paymentId;
        this.confirmationToken = confirmationToken;
        this.returnUrl = returnUrl;
        this.playerUuid = playerUuid;
        this.createdAt = Instant.now();
    }
}

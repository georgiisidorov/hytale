package com.github.hytale.yookassa;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

final class YooKassaPaymentSessions {
    private static final Duration TTL = Duration.ofMinutes(30);

    private final Map<String, YooKassaPaymentSession> byId = new ConcurrentHashMap<>();

    YooKassaPaymentSession create(
            String paymentId, String confirmationToken, String returnUrl, UUID playerUuid) {
        purgeExpired();
        String sessionId = generateSessionId();
        YooKassaPaymentSession session =
                new YooKassaPaymentSession(sessionId, paymentId, confirmationToken, returnUrl, playerUuid);
        byId.put(sessionId, session);
        return session;
    }

    YooKassaPaymentSession get(String sessionId) {
        purgeExpired();
        return sessionId == null ? null : byId.get(sessionId);
    }

    private String generateSessionId() {
        for (int attempt = 0; attempt < 100; attempt++) {
            String id = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
            if (!byId.containsKey(id)) {
                return id;
            }
        }
        return UUID.randomUUID().toString().replace("-", "");
    }

    private void purgeExpired() {
        Instant cutoff = Instant.now().minus(TTL);
        byId.entrySet().removeIf(e -> e.getValue().createdAt.isBefore(cutoff));
    }
}

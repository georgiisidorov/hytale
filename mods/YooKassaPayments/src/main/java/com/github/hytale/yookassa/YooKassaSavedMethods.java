package com.github.hytale.yookassa;

import com.hypixel.hytale.logger.HytaleLogger;
import org.json.JSONObject;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

/** payment_method_id игрока для повторных платежей (файл в data-папке плагина). */
final class YooKassaSavedMethods {
    private final Path file;
    private final HytaleLogger log;
    private JSONObject data = new JSONObject();

    YooKassaSavedMethods(Path dataDir, HytaleLogger log) {
        this.file = dataDir.resolve("saved_payment_methods.json");
        this.log = log;
        load();
    }

    String getPaymentMethodId(UUID playerUuid) {
        if (playerUuid == null) {
            return "";
        }
        JSONObject entry = data.optJSONObject(playerUuid.toString());
        return entry != null ? entry.optString("payment_method_id", "") : "";
    }

    String getTitle(UUID playerUuid) {
        if (playerUuid == null) {
            return "";
        }
        JSONObject entry = data.optJSONObject(playerUuid.toString());
        return entry != null ? entry.optString("title", "") : "";
    }

    void save(UUID playerUuid, String paymentMethodId, String title) {
        if (playerUuid == null || paymentMethodId == null || paymentMethodId.isBlank()) {
            return;
        }
        JSONObject entry = new JSONObject();
        entry.put("payment_method_id", paymentMethodId);
        entry.put("title", title != null ? title : "");
        entry.put("updated_at", System.currentTimeMillis());
        data.put(playerUuid.toString(), entry);
        persist();
    }

    void clear(UUID playerUuid) {
        if (playerUuid == null) {
            return;
        }
        data.remove(playerUuid.toString());
        persist();
    }

    private void load() {
        if (!Files.isRegularFile(file)) {
            return;
        }
        try {
            String raw = Files.readString(file, StandardCharsets.UTF_8);
            if (!raw.isBlank()) {
                data = new JSONObject(raw);
            }
        } catch (Exception e) {
            if (log != null) {
                log.atWarning().withCause(e).log("[YooKassa] Не удалось прочитать %s", file);
            }
            data = new JSONObject();
        }
    }

    private void persist() {
        try {
            Files.createDirectories(file.getParent());
            Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
            Files.writeString(tmp, data.toString(2), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            if (log != null) {
                log.atWarning().withCause(e).log("[YooKassa] Не удалось записать %s", file);
            }
        }
    }
}

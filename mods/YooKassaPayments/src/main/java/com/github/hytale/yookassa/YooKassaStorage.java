package com.github.hytale.yookassa;

import com.hypixel.hytale.logger.HytaleLogger;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.stream.Stream;

/**
 * Данные плагина храним в {@code plugins/YooKassaPayments/}, не в {@code mods/Custom_YooKassaPayments/}.
 * Иначе Hytale считает папку в mods/ отдельным asset pack без manifest.json → таймаут/краш при входе.
 */
final class YooKassaStorage {
    private static final Path STORAGE = Path.of("plugins", "YooKassaPayments");
    private static final Path BROKEN_MODS_FOLDER = Path.of("mods", "Custom_YooKassaPayments");

    private YooKassaStorage() {
    }

    static Path dataDir(HytaleLogger log) {
        try {
            Files.createDirectories(STORAGE);
        } catch (IOException e) {
            if (log != null) {
                log.atWarning().withCause(e).log("[YooKassa] Не удалось создать %s", STORAGE);
            }
        }
        return STORAGE;
    }

    static void cleanupBrokenModsFolder(HytaleLogger log) {
        if (!Files.isDirectory(BROKEN_MODS_FOLDER)) {
            return;
        }
        if (Files.isRegularFile(BROKEN_MODS_FOLDER.resolve("manifest.json"))) {
            return;
        }
        try {
            migrateLegacyFiles(log);
            deleteRecursively(BROKEN_MODS_FOLDER);
            if (log != null) {
                log.atInfo().log(
                        "[YooKassa] Удалена битая папка %s (данные — только .jar + plugins/YooKassaPayments/)",
                        BROKEN_MODS_FOLDER
                );
            }
        } catch (IOException e) {
            if (log != null) {
                log.atWarning().withCause(e).log("[YooKassa] Не удалось очистить %s", BROKEN_MODS_FOLDER);
            }
        }
    }

    private static void migrateLegacyFiles(HytaleLogger log) throws IOException {
        Files.createDirectories(STORAGE);
        try (Stream<Path> files = Files.list(BROKEN_MODS_FOLDER)) {
            for (Path src : files.toList()) {
                if (!Files.isRegularFile(src)) {
                    continue;
                }
                Path dst = STORAGE.resolve(src.getFileName().toString());
                if (Files.exists(dst)) {
                    continue;
                }
                Files.move(src, dst);
                if (log != null) {
                    log.atInfo().log("[YooKassa] Перенесён %s → %s", src, dst);
                }
            }
        }
    }

    private static void deleteRecursively(Path root) throws IOException {
        Files.walkFileTree(root, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                Files.delete(file);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                Files.delete(dir);
                return FileVisitResult.CONTINUE;
            }
        });
    }
}

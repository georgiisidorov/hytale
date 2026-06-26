package com.github.permbridge;

import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.NameMatching;
import com.hypixel.hytale.server.core.command.system.AbstractCommand;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.permissions.PermissionsModule;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;

import java.awt.Color;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

final class RankCommand extends AbstractCommand {

    private static final Color GREEN  = new Color(0x55, 0xFF, 0x55);
    private static final Color YELLOW = new Color(0xFF, 0xFF, 0x55);
    private static final Color GRAY   = new Color(0xAA, 0xAA, 0xAA);

    private final RankManager rankManager;
    private final PermissionsModule module;

    RankCommand(RankManager rankManager, PermissionsModule module) {
        super("rank", "Управление рангами игроков [Admin]");
        this.rankManager = rankManager;
        this.module = module;
        setAllowsExtraArguments(true);
    }

    @Override
    protected boolean canGeneratePermission() {
        return false;
    }

    @Override
    protected CompletableFuture<Void> execute(CommandContext context) {
        if (!isAdmin(context)) {
            context.sendMessage(Message.raw("Нет доступа.").color(Color.RED));
            return CompletableFuture.completedFuture(null);
        }

        String input = context.getInputString() == null ? "" : context.getInputString().trim();
        String[] parts = input.isEmpty() ? new String[0] : input.split("\\s+");

        if (parts.length == 0 || parts[0].equalsIgnoreCase("help")) {
            sendHelp(context);
            return CompletableFuture.completedFuture(null);
        }

        return switch (parts[0].toLowerCase()) {
            case "set"    -> cmdSet(context, parts);
            case "get"    -> cmdGet(context, parts);
            case "list"   -> cmdList(context, parts);
            case "reload" -> cmdReload(context);
            default -> {
                sendHelp(context);
                yield CompletableFuture.completedFuture(null);
            }
        };
    }

    // /rank set <player|uuid> <rank>
    private CompletableFuture<Void> cmdSet(CommandContext ctx, String[] parts) {
        if (parts.length < 3) {
            ctx.sendMessage(Message.raw("Использование: /rank set <игрок|uuid> <ранг>").color(YELLOW));
            return CompletableFuture.completedFuture(null);
        }

        String target  = parts[1];
        String newRank = parts[2];

        if (!rankManager.isValidRank(newRank)) {
            ctx.sendMessage(Message.raw(
                "Неизвестный ранг: " + newRank
                + ". Доступные: " + String.join(", ", rankManager.getRankNames())
            ).color(Color.RED));
            return CompletableFuture.completedFuture(null);
        }

        UUID uuid = resolveUuid(target);
        if (uuid == null) {
            ctx.sendMessage(Message.raw(
                "Игрок '" + target + "' не найден онлайн. Для оффлайн игроков используйте UUID."
            ).color(Color.RED));
            return CompletableFuture.completedFuture(null);
        }

        rankManager.setRank(uuid, newRank, module);
        ctx.sendMessage(Message.raw("Ранг " + target + " → " + newRank).color(GREEN));
        return CompletableFuture.completedFuture(null);
    }

    // /rank get <player|uuid>
    private CompletableFuture<Void> cmdGet(CommandContext ctx, String[] parts) {
        if (parts.length < 2) {
            ctx.sendMessage(Message.raw("Использование: /rank get <игрок|uuid>").color(YELLOW));
            return CompletableFuture.completedFuture(null);
        }

        UUID uuid = resolveUuid(parts[1]);
        if (uuid == null) {
            ctx.sendMessage(Message.raw(
                "Игрок '" + parts[1] + "' не найден онлайн. Для оффлайн используйте UUID."
            ).color(Color.RED));
            return CompletableFuture.completedFuture(null);
        }

        String rank = rankManager.getRank(uuid);
        ctx.sendMessage(Message.raw(parts[1] + ": " + rank).color(GRAY));
        return CompletableFuture.completedFuture(null);
    }

    // /rank list [players]
    private CompletableFuture<Void> cmdList(CommandContext ctx, String[] parts) {
        if (parts.length >= 2 && parts[1].equalsIgnoreCase("players")) {
            Map<UUID, String> all = rankManager.getAllPlayerRanks();
            if (all.isEmpty()) {
                ctx.sendMessage(Message.raw("Назначений рангов нет. Все игроки на базовом ранге.").color(GRAY));
            } else {
                StringBuilder sb = new StringBuilder("Назначения рангов:\n");
                all.forEach((u, r) -> sb.append("  ").append(u).append(" → ").append(r).append("\n"));
                ctx.sendMessage(Message.raw(sb.toString().trim()).color(GRAY));
            }
        } else {
            ctx.sendMessage(Message.raw("Ранги: " + String.join(", ", rankManager.getRankNames())).color(GRAY));
        }
        return CompletableFuture.completedFuture(null);
    }

    // /rank reload
    private CompletableFuture<Void> cmdReload(CommandContext ctx) {
        rankManager.load();
        rankManager.injectPermissions(module);
        ctx.sendMessage(Message.raw("Ранги перезагружены.").color(GREEN));
        return CompletableFuture.completedFuture(null);
    }

    private boolean isAdmin(CommandContext context) {
        if (!context.isPlayer()) return true;
        PlayerRef ref = context.senderAs(PlayerRef.class);
        if (ref == null) return false;
        return ref.hasPermission("rank.admin") || ref.hasPermission("rank.op") || ref.hasPermission("*");
    }

    private UUID resolveUuid(String input) {
        try {
            return UUID.fromString(input);
        } catch (IllegalArgumentException ignored) {}

        Universe universe = Universe.get();
        if (universe == null) return null;

        PlayerRef player = universe.getPlayerByUsername(input, NameMatching.EXACT_IGNORE_CASE);
        return player != null ? player.getUuid() : null;
    }

    private void sendHelp(CommandContext ctx) {
        ctx.sendMessage(Message.raw(
            "/rank set <игрок|uuid> <ранг> — установить ранг\n" +
            "/rank get <игрок|uuid> — посмотреть ранг\n" +
            "/rank list — список рангов\n" +
            "/rank list players — все назначения\n" +
            "/rank reload — перезагрузить ranks.json"
        ).color(YELLOW));
    }
}

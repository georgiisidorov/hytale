package com.github.hytale.yookassa;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.AbstractCommand;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

import java.awt.Color;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

final class PayCommand extends AbstractCommand {
    private final YooKassaPaymentsPlugin plugin;

    PayCommand(YooKassaPaymentsPlugin plugin) {
        super("yookassa", "Открыть окно оплаты через ЮKassa");
        this.plugin = plugin;
    }

    @Override
    protected boolean canGeneratePermission() {
        // Магазин доступен всем игрокам; иначе нужен Custom.YooKassaPayments.yookassa.
        return false;
    }

    @Override
    protected CompletableFuture<Void> execute(CommandContext context) {
        if (!context.isPlayer()) {
            context.sendMessage(Message.raw("Только для игроков.").color(Color.RED));
            return CompletableFuture.completedFuture(null);
        }

        Ref<EntityStore> ref = context.senderAsPlayerRef();
        if (ref == null || !ref.isValid()) {
            return CompletableFuture.completedFuture(null);
        }

        Store<EntityStore> store = ref.getStore();
        return CompletableFuture.runAsync(
                () -> {
                    Player player = store.getComponent(ref, Player.getComponentType());
                    PlayerRef playerRef = store.getComponent(ref, PlayerRef.getComponentType());
                    if (player == null || playerRef == null) {
                        return;
                    }
                    World world = ((EntityStore) store.getExternalData()).getWorld();
                    player.getPageManager().openCustomPage(ref, store, new YooKassaPayPage(playerRef, plugin, world));
                },
                (Executor) ((EntityStore) store.getExternalData()).getWorld()
        );
    }
}

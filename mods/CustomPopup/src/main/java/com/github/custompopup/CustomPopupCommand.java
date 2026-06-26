package com.github.custompopup;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.AbstractCommand;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

import java.awt.Color;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

/** Демо in-game popup: текст с кликабельной ссылкой и кнопки. */
public final class CustomPopupCommand extends AbstractCommand {
    private final CustomPopupPlugin plugin;

    public CustomPopupCommand(CustomPopupPlugin plugin) {
        super("custompopup", "Демо in-game popup (Custom UI)");
        this.plugin = plugin;
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
                () -> openDemo(ref, store),
                (Executor) ((EntityStore) store.getExternalData()).getWorld()
        );
    }

    private void openDemo(Ref<EntityStore> ref, Store<EntityStore> store) {
        PopupService svc = plugin.service();
        if (svc == null) {
            return;
        }
        PlayerRef playerRef = store.getComponent(ref, PlayerRef.getComponentType());
        if (playerRef == null) {
            return;
        }

        PopupContent content = PopupContent.builder()
                .title("CustomPopup")
                .subtitle("Демо in-game popup")
                .bodyPlain(
                        "Окно внутри игры.\n\n"
                                + "«Открыть hytale.com» — кнопка отправит ссылку в чат; "
                                + "нажмите её в чате, чтобы открыть сайт."
                )
                .actions(
                        PopupAction.openLink("https://hytale.com", "Открыть hytale.com"),
                        PopupAction.of("close_me", "Закрыть окно")
                )
                .build();

        svc.open(
                playerRef,
                ref,
                store,
                content,
                (pr, r, st, actionId) -> {
                    if ("close_me".equals(actionId)) {
                        return true;
                    }
                    return false;
                }
        );
    }
}

package com.togglecollision;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.AbstractCommand;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.modules.entity.hitboxcollision.HitboxCollision;
import com.hypixel.hytale.server.core.modules.entity.hitboxcollision.HitboxCollisionConfig;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.server.core.util.TargetUtil;

import java.awt.Color;
import java.util.concurrent.CompletableFuture;

final class ToggleCollisionCommand extends AbstractCommand {

    private static final float MAX_REACH = 32.0f;
    private static final Color SUCCESS_COLOR = new Color(85, 255, 136);
    private static final String HARD_COLLISION_ID = "HardCollision";

    ToggleCollisionCommand() {
        super("togglecollision", "Переключает коллизию таргет-сущности: жёсткая ↔ отсутствует");
        addAliases("tc");
    }

    @Override
    protected CompletableFuture<Void> execute(CommandContext context) {
        if (!context.isPlayer()) {
            context.sendMessage(Message.raw("Только игрок может использовать эту команду.").color(Color.RED));
            return CompletableFuture.completedFuture(null);
        }

        Ref<EntityStore> ref = context.senderAsPlayerRef();
        if (ref == null || !ref.isValid()) {
            context.sendMessage(Message.raw("Нет ссылки на сущность.").color(Color.RED));
            return CompletableFuture.completedFuture(null);
        }

        Store<EntityStore> store = ref.getStore();
        World world = ((EntityStore) store.getExternalData()).getWorld();
        if (world == null) {
            context.sendMessage(Message.raw("Не удалось получить мир.").color(Color.RED));
            return CompletableFuture.completedFuture(null);
        }

        world.execute(() -> {
            try {
                PlayerRef playerRef = store.getComponent(ref, PlayerRef.getComponentType());
                if (playerRef == null) {
                    return;
                }
                runToggle(playerRef, store, ref);
            } catch (Throwable t) {
                PlayerRef playerRef = store.getComponent(ref, PlayerRef.getComponentType());
                if (playerRef != null) {
                    playerRef.sendMessage(Message.raw("Ошибка: " + t.getMessage()).color(Color.RED));
                }
            }
        });

        return CompletableFuture.completedFuture(null);
    }

    private static void runToggle(
        PlayerRef playerRef,
        Store<EntityStore> store,
        Ref<EntityStore> playerEntityRef
    ) {
        Ref<EntityStore> targetRef = TargetUtil.getTargetEntity(playerEntityRef, MAX_REACH, store);
        if (targetRef == null || !targetRef.isValid()) {
            playerRef.sendMessage(
                Message.raw("Нет таргет-сущности — прицелься в сущность на расстоянии до " + (int) MAX_REACH + " блоков.")
                    .color(Color.ORANGE)
            );
            return;
        }

        boolean hasCollision = store.getArchetype(targetRef)
            .contains(HitboxCollision.getComponentType());

        if (hasCollision) {
            store.tryRemoveComponent(targetRef, HitboxCollision.getComponentType());
            playerRef.sendMessage(
                Message.raw("Коллизия сущности: отсутствует").color(SUCCESS_COLOR)
            );
        } else {
            HitboxCollisionConfig hardConfig = HitboxCollisionConfig.getAssetMap()
                .getAsset(HARD_COLLISION_ID);
            if (hardConfig == null) {
                playerRef.sendMessage(
                    Message.raw("Ошибка: конфиг HardCollision не найден в ассетах.").color(Color.RED)
                );
                return;
            }
            store.addComponent(
                targetRef,
                HitboxCollision.getComponentType(),
                new HitboxCollision(hardConfig)
            );
            playerRef.sendMessage(
                Message.raw("Коллизия сущности: жёсткая").color(SUCCESS_COLOR)
            );
        }
    }
}

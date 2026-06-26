package com.github.blocktoentity;

import com.hypixel.hytale.component.AddReason;
import com.hypixel.hytale.component.Holder;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.math.iterator.BlockIterator;
import com.hypixel.hytale.protocol.ColorLight;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.BlockType;
import com.hypixel.hytale.server.core.command.system.AbstractCommand;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.entity.entities.BlockEntity;
import com.hypixel.hytale.server.core.modules.entity.component.DynamicLight;
import com.hypixel.hytale.server.core.modules.entity.component.HeadRotation;
import com.hypixel.hytale.server.core.modules.entity.component.Interactable;
import com.hypixel.hytale.server.core.modules.entity.component.ModelComponent;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.modules.time.TimeResource;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import org.joml.Vector3d;

import java.awt.Color;
import java.util.concurrent.CompletableFuture;

/**
 * Простые блоки → {@link BlockEntity}; люки/двери/настенные → замороженный воксель
 * (вид и поворот как в мире).
 */
final class BlockToEntityCommand extends AbstractCommand {

    private static final double MAX_REACH = 64.0;

    BlockToEntityCommand() {
        super("blocktoentity", "Заменить целевой блок на декор без подбора (по взгляду)");
        setAllowsExtraArguments(true);
    }

    @Override
    protected CompletableFuture<Void> execute(CommandContext context) {
        if (!context.isPlayer()) {
            context.sendMessage(Message.raw("Только для игроков.").color(Color.RED));
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
            context.sendMessage(Message.raw("Мир не загружен.").color(Color.RED));
            return CompletableFuture.completedFuture(null);
        }

        world.execute(() -> {
            try {
                PlayerRef playerRef = store.getComponent(ref, PlayerRef.getComponentType());
                if (playerRef == null) {
                    return;
                }
                runReplace(playerRef, world, store, ref);
            } catch (Throwable t) {
                PlayerRef playerRef = store.getComponent(ref, PlayerRef.getComponentType());
                if (playerRef != null) {
                    playerRef.sendMessage(
                        Message.raw("BlockToEntity: ошибка: " + t.getMessage()).color(Color.RED)
                    );
                }
            }
        });

        return CompletableFuture.completedFuture(null);
    }

    private static void runReplace(
        PlayerRef playerRef,
        World world,
        Store<EntityStore> store,
        Ref<EntityStore> playerEntityRef
    ) {
        TransformComponent tc = store.getComponent(playerEntityRef, TransformComponent.getComponentType());
        if (tc == null || tc.getPosition() == null) {
            playerRef.sendMessage(Message.raw("Нет Transform.").color(Color.RED));
            return;
        }

        ModelComponent model = store.getComponent(playerEntityRef, ModelComponent.getComponentType());
        HeadRotation head = store.getComponent(playerEntityRef, HeadRotation.getComponentType());

        Vector3d eye = LookRayUtil.eyePosition(tc, model);
        Vector3d direction = LookRayUtil.lookDirection(head);

        int[] hit = new int[3];
        if (!rayFirstSolidBlock(world, eye, direction, MAX_REACH, hit)) {
            playerRef.sendMessage(Message.raw("Блок не найден (воздух или слишком далеко).").color(Color.ORANGE));
            return;
        }

        int bx = hit[0];
        int by = hit[1];
        int bz = hit[2];

        CapturedBlock captured = BlockToEntityPlacement.capture(world, bx, by, bz);
        if (captured.blockType == null) {
            playerRef.sendMessage(Message.raw("Не удалось прочитать BlockType.").color(Color.RED));
            return;
        }

        String blockId = captured.blockType.getId();
        if (blockId == null || isAirLike(blockId)) {
            playerRef.sendMessage(Message.raw("Это не подходит (air/пусто).").color(Color.ORANGE));
            return;
        }

        if (!world.breakBlock(bx, by, bz, 0)) {
            playerRef.sendMessage(Message.raw("breakBlock не удался (права/регион?).").color(Color.RED));
            return;
        }

        if (BlockToEntityPlacement.requiresFrozenBlock(captured)) {
            BlockToEntityPlacement.placeFrozenBlock(world, bx, by, bz, captured);
            playerRef.sendMessage(
                Message.raw("Замороженный блок (люк/дверь/поворот сохранён).").color(Color.GREEN)
            );
            return;
        }

        Vector3d spawnPos = BlockToEntityPlacement.entityAnchorPosition(
            captured.blockType, captured.rotationIndex, bx, by, bz
        );

        String visualKey = captured.blockKey != null && !captured.blockKey.isBlank()
            ? captured.blockKey
            : blockId;
        TimeResource time = store.getResource(TimeResource.getResourceType());
        Holder<EntityStore> holder = BlockEntity.assembleDefaultBlockEntity(time, visualKey, spawnPos);
        holder.addComponent(
            BlockDecorSnapshot.getComponentType(),
            new BlockDecorSnapshot(captured.rotationIndex, captured.blockRotation)
        );
        holder.putComponent(Interactable.getComponentType(), Interactable.INSTANCE);
        addBlockLightIfAny(holder, captured.blockType);
        store.addEntity(holder, AddReason.SPAWN);

        playerRef.sendMessage(
            Message.raw("BlockEntity: " + captured.blockKey + " @ " + bx + "," + by + "," + bz).color(Color.GREEN)
        );
    }

    private static boolean isAirLike(String id) {
        String s = id.toLowerCase();
        return s.equals("air") || s.equals("empty") || s.contains("void_air");
    }

    private static void addBlockLightIfAny(Holder<EntityStore> holder, BlockType blockType) {
        ColorLight light = blockType.getLight();
        if (light == null || light.radius <= 0) {
            return;
        }
        holder.putComponent(DynamicLight.getComponentType(), new DynamicLight(new ColorLight(light)));
    }

    private static boolean rayFirstSolidBlock(
        World world,
        Vector3d origin,
        Vector3d direction,
        double maxDist,
        int[] outBpos
    ) {
        final boolean[] found = {false};
        BlockIterator.iterate(origin, direction, maxDist, (x, y, z, a, b, c, d, e, f) -> {
            if (world.getBlock(x, y, z) != 0) {
                outBpos[0] = x;
                outBpos[1] = y;
                outBpos[2] = z;
                found[0] = true;
                return false;
            }
            return true;
        });
        return found[0];
    }
}

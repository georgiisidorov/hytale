package com.nointeraction;

import com.hypixel.hytale.component.AddReason;
import com.hypixel.hytale.component.Holder;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.math.vector.Rotation3f;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.BlockType;
import com.hypixel.hytale.server.core.command.system.AbstractCommand;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.entity.entities.BlockEntity;
import com.hypixel.hytale.server.core.modules.entity.component.Interactable;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.modules.time.TimeResource;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import org.joml.Vector3d;

import java.awt.Color;
import java.util.concurrent.CompletableFuture;

final class NoInteractionCommand extends AbstractCommand {

    private static final double MAX_REACH = 64.0;
    private static final Color SUCCESS_COLOR = new Color(85, 255, 136);

    NoInteractionCommand() {
        super("nointeraction", "Превращает блок в сущность без возможности взаимодействия");
        addAliases("ni");
        setAllowsExtraArguments(true);
    }

    @Override
    protected CompletableFuture<Void> execute(CommandContext context) {
        if (!context.isPlayer()) {
            context.sendMessage(Message.raw("Вам нельзя использовать данную команду").color(Color.RED));
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
            context.sendMessage(Message.raw("Не удалось получить мир").color(Color.RED));
            return CompletableFuture.completedFuture(null);
        }

        int[] explicitBlock = parseBlockCoords(context.getInputString());

        world.execute(() -> {
            try {
                PlayerRef playerRef = store.getComponent(ref, PlayerRef.getComponentType());
                if (playerRef == null) {
                    return;
                }
                runConvert(playerRef, world, store, ref, explicitBlock);
            } catch (Throwable t) {
                PlayerRef playerRef = store.getComponent(ref, PlayerRef.getComponentType());
                if (playerRef != null) {
                    playerRef.sendMessage(Message.raw("Ошибка: " + t.getMessage()).color(Color.RED));
                }
            }
        });

        return CompletableFuture.completedFuture(null);
    }

    private static void runConvert(
        PlayerRef playerRef,
        World world,
        Store<EntityStore> store,
        Ref<EntityStore> playerEntityRef,
        int[] explicitBlock
    ) {
        int[] hit = TargetBlockResolve.resolve(playerRef, playerEntityRef, store, world, explicitBlock, MAX_REACH);
        if (hit == null) {
            playerRef.sendMessage(
                Message.raw("Нет target block — выбери блок таргетблоком или /ni x y z").color(Color.ORANGE)
            );
            return;
        }

        int bx = hit[0];
        int by = hit[1];
        int bz = hit[2];

        BlockType blockType = world.getBlockType(bx, by, bz);
        if (blockType == null) {
            playerRef.sendMessage(Message.raw("В этих координатах нет блока").color(Color.ORANGE));
            return;
        }

        String blockId = blockType.getId();
        if (blockId == null || isAirLike(blockId)) {
            playerRef.sendMessage(Message.raw("Блок не найден — прицелься в плотный блок.").color(Color.ORANGE));
            return;
        }

        int rotationIndex = world.getBlockRotationIndex(bx, by, bz);
        if (!world.breakBlock(bx, by, bz, 0)) {
            playerRef.sendMessage(Message.raw("Не удалось удалить блок").color(Color.RED));
            return;
        }

        spawnNoInteractionEntity(store, blockId, bx, by, bz, rotationIndex);

        playerRef.sendMessage(
            Message.raw("Блок превращён в сущность без взаимодействия: " + blockId + " @ " + bx + ", " + by + ", " + bz)
                .color(SUCCESS_COLOR)
        );
    }

    private static void spawnNoInteractionEntity(
        Store<EntityStore> store,
        String blockId,
        int bx,
        int by,
        int bz,
        int rotationIndex
    ) {
        Vector3d spawnPos = entityAnchorPosition(worldBlockType(blockId), rotationIndex, bx, by, bz);
        TimeResource time = store.getResource(TimeResource.getResourceType());
        Holder<EntityStore> holder = BlockEntity.assembleDefaultBlockEntity(time, blockId, spawnPos);

        TransformComponent transform = holder.getComponent(TransformComponent.getComponentType());
        if (transform != null) {
            transform.teleportRotation(rotationFromIndex(rotationIndex));
        }

        if (holder.getComponent(Interactable.getComponentType()) != null) {
            holder.removeComponent(Interactable.getComponentType());
        }

        Ref<EntityStore> entityRef = store.addEntity(holder, AddReason.SPAWN);
        if (entityRef != null && entityRef.isValid()) {
            store.addComponent(
                entityRef,
                NoInteractionComponent.getComponentType(),
                new NoInteractionComponent(blockId, bx, by, bz, rotationIndex)
            );
        }
    }

    private static BlockType worldBlockType(String blockId) {
        return BlockType.getAssetMap().getAsset(blockId);
    }

    private static Vector3d entityAnchorPosition(BlockType blockType, int rotationIndex, int bx, int by, int bz) {
        if (blockType != null) {
            var hitboxes = com.hypixel.hytale.server.core.asset.type.blockhitbox.BlockBoundingBoxes
                .getAssetMap().getAsset(blockType.getHitboxTypeIndex());
            if (hitboxes != null) {
                var variant = hitboxes.get(rotationIndex);
                if (variant == null) {
                    variant = hitboxes.get(0);
                }
                if (variant != null) {
                    var box = variant.getBoundingBox();
                    if (box != null) {
                        double x = bx + (box.min.x + box.max.x) * 0.5;
                        double y = by + box.min.y;
                        double z = bz + (box.min.z + box.max.z) * 0.5;
                        return new Vector3d(x, y, z);
                    }
                }
            }
        }
        return new Vector3d(bx + 0.5, by + 0.5, bz + 0.5);
    }

    private static int[] parseBlockCoords(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        String[] parts = input.trim().split("\\s+");
        if (parts.length < 4) {
            return null;
        }
        try {
            return new int[] {
                (int) Math.floor(Double.parseDouble(parts[1])),
                (int) Math.floor(Double.parseDouble(parts[2])),
                (int) Math.floor(Double.parseDouble(parts[3]))
            };
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Rotation3f rotationFromIndex(int index) {
        float yawDeg = switch (index) {
            case 1 -> 90f;
            case 2 -> 180f;
            case 3 -> 270f;
            default -> 0f;
        };
        return new Rotation3f(0f, (float) Math.toRadians(yawDeg), 0f);
    }

    private static boolean isAirLike(String id) {
        String s = id.toLowerCase();
        return s.equals("air") || s.equals("empty") || s.contains("void_air");
    }
}

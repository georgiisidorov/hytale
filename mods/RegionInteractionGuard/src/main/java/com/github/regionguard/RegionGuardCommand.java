package com.github.regionguard;

import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.AbstractCommand;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import org.joml.Vector3d;

import java.awt.Color;
import java.util.StringJoiner;
import java.util.concurrent.CompletableFuture;

final class RegionGuardCommand extends AbstractCommand {
    private final RegionInteractionGuardPlugin plugin;

    RegionGuardCommand(RegionInteractionGuardPlugin plugin) {
        super("regionguard", "Переопределение правил RegionInteractionGuard");
        this.plugin = plugin;
        // Временно без прав, чтобы ты мог руками проверять.
        setAllowsExtraArguments(true);
    }

    @Override
    protected CompletableFuture<Void> execute(CommandContext context) {
        String input = context.getInputString() == null ? "" : context.getInputString().trim().toLowerCase();
        String[] parts = input.isEmpty() ? new String[0] : input.split("\\s+");

        boolean hasReload = false;
        boolean hasStatus = false;
        for (String p : parts) {
            if (p.equals("reload")) hasReload = true;
            if (p.equals("status")) hasStatus = true;
        }

        if (hasReload || (!hasStatus && parts.length <= 1)) {
            RegionGuardConfig.init(plugin.getDataDirectory().toFile(), plugin.getLogger());
            context.sendMessage(Message.raw("RegionInteractionGuard: config reloaded.").color(new Color(0x55, 0xFF, 0x55)));
            return CompletableFuture.completedFuture(null);
        }

        if (hasStatus) {
            RegionGuardConfig.Rules rules = RegionGuardConfig.current();
            StringJoiner sj = new StringJoiner(", ");
            rules.protectedRegions.forEach(sj::add);

            String regionAtPlayer = "n/a";
            try {
                if (context.isPlayer()) {
                    Ref<EntityStore> ref = context.senderAsPlayerRef();
                    if (ref != null && ref.isValid()) {
                        Store<EntityStore> store = ref.getStore();
                        TransformComponent tc = store.getComponent(ref, TransformComponent.getComponentType());
                        Vector3d pos = tc != null ? tc.getPosition() : null;
                        World world = ((EntityStore) store.getExternalData()).getWorld();
                        if (world != null && pos != null) {
                            regionAtPlayer = String.join(", ", WorldProtectRegionResolver.getRegionIdsAt(world.getName(), pos));
                            if (regionAtPlayer.isBlank()) regionAtPlayer = "empty";
                        }
                    }
                }
            } catch (Throwable ignored) {
            }

            context.sendMessage(
                Message.raw(
                    "RegionInteractionGuard status: regions=["
                        + sj
                        + "], atYourPos=["
                        + regionAtPlayer
                        + "], blocked_block_ids_legacy="
                        + rules.blockedBlockIds.size()
                        + ", pickup="
                        + rules.blockItemPickup
                        + ", debug_preview="
                        + rules.debugPreview
                        + ", debug_interval_sec="
                        + rules.debugPreviewIntervalSec
                )
                    .color(new Color(0xAA, 0xAA, 0xAA))
            );
            return CompletableFuture.completedFuture(null);
        }

        context.sendMessage(Message.raw("Usage: /regionguard reload | /regionguard status").color(Color.RED));
        return CompletableFuture.completedFuture(null);
    }
}


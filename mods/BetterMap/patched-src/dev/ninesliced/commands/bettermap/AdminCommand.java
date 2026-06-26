// Patched: config menu only for OP (canAccessConfig)
package dev.ninesliced.commands.bettermap;

import javax.annotation.Nullable;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.component.Ref;
import java.util.concurrent.Executor;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.server.core.entity.entities.player.pages.CustomUIPage;
import dev.ninesliced.ui.ConfigMenuPage;
import dev.ninesliced.utils.PermissionsUtil;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.entity.entities.Player;
import java.awt.Color;
import com.hypixel.hytale.server.core.Message;
import java.util.concurrent.CompletableFuture;
import javax.annotation.Nonnull;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.command.system.AbstractCommand;

public class AdminCommand extends AbstractCommand
{
    public AdminCommand() {
        super("admin", "Open BetterMap admin config");
    }

    protected boolean canGeneratePermission() {
        return false;
    }

    protected String generatePermissionNode() {
        return "";
    }

    @Nullable
    protected CompletableFuture<Void> execute(@Nonnull final CommandContext context) {
        if (!context.isPlayer()) {
            context.sendMessage(Message.raw("This command can only be used by players.").color(Color.RED));
            return CompletableFuture.completedFuture((Void)null);
        }
        final Ref<EntityStore> ref = (Ref<EntityStore>)context.senderAsPlayerRef();
        if (ref == null || !ref.isValid()) {
            return CompletableFuture.completedFuture((Void)null);
        }
        final Store<EntityStore> store = (Store<EntityStore>)ref.getStore();
        return CompletableFuture.runAsync(() -> {
            final Player player = (Player)store.getComponent(ref, Player.getComponentType());
            final PlayerRef playerRef = (PlayerRef)store.getComponent(ref, PlayerRef.getComponentType());
            if (player != null && playerRef != null) {
                if (!PermissionsUtil.canAccessConfig(player)) {
                    player.sendMessage(Message.raw("You must be OP to use this command.").color(Color.RED));
                }
                else {
                    player.getPageManager().openCustomPage(ref, store, (CustomUIPage)new ConfigMenuPage(playerRef, true));
                }
            }
        }, (Executor)((EntityStore)store.getExternalData()).getWorld());
    }
}

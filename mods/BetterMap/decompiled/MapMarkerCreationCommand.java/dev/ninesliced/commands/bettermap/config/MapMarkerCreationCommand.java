// 
// Decompiled by Procyon v0.6.0
// 

package dev.ninesliced.commands.bettermap.config;

import org.checkerframework.checker.nullness.compatqual.NullableDecl;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.component.Ref;
import java.util.concurrent.Executor;
import dev.ninesliced.utils.WorldMapHook;
import com.hypixel.hytale.server.core.universe.Universe;
import dev.ninesliced.configs.ModConfig;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import java.awt.Color;
import com.hypixel.hytale.server.core.Message;
import java.util.concurrent.CompletableFuture;
import org.checkerframework.checker.nullness.compatqual.NonNullDecl;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.command.system.AbstractCommand;

public class MapMarkerCreationCommand extends AbstractCommand
{
    public MapMarkerCreationCommand() {
        super("markercreation", "Toggle native map right-click marker creation");
        this.addAliases(new String[] { "mapmarkercreation", "markerrightclick" });
        this.requirePermission("bettermap.command.config");
    }
    
    protected boolean canGeneratePermission() {
        return false;
    }
    
    @NullableDecl
    protected CompletableFuture<Void> execute(@NonNullDecl final CommandContext commandContext) {
        if (!commandContext.isPlayer()) {
            commandContext.sendMessage(Message.raw("This command can only be used by a player.").color(Color.RED));
            return CompletableFuture.completedFuture((Void)null);
        }
        final Ref<EntityStore> ref = (Ref<EntityStore>)commandContext.senderAsPlayerRef();
        if (ref == null) {
            return CompletableFuture.completedFuture((Void)null);
        }
        final Store<EntityStore> store = (Store<EntityStore>)ref.getStore();
        final World world = ((EntityStore)store.getExternalData()).getWorld();
        return CompletableFuture.runAsync(() -> {
            final Player playerComponent = (Player)store.getComponent(ref, Player.getComponentType());
            if (playerComponent != null) {
                final ModConfig config = ModConfig.getInstance();
                final boolean newState = !config.isAllowNativeMapMarkerCreation();
                config.setAllowNativeMapMarkerCreation(newState);
                final Universe universe = Universe.get();
                if (universe != null) {
                    universe.getWorlds().values().forEach(w -> {
                        if (w == null) {
                            return;
                        }
                        else {
                            w.execute(() -> {
                                WorldMapHook.updateWorldMapConfigs(w);
                                WorldMapHook.broadcastMapSettings(w);
                                WorldMapHook.clearMarkerCaches(w);
                                WorldMapHook.refreshTrackers(w);
                            });
                            return;
                        }
                    });
                }
                final String status = newState ? "ENABLED" : "DISABLED";
                final Color color = newState ? Color.GREEN : Color.RED;
                commandContext.sendMessage(Message.raw("Native right-click map marker creation " + status).color(color));
                if (newState) {
                    commandContext.sendMessage(Message.raw("Players can create markers from the default map context menu.").color(Color.GRAY));
                }
                else {
                    commandContext.sendMessage(Message.raw("The default map context menu marker creation option is blocked.").color(Color.GRAY));
                }
            }
        }, (Executor)world);
    }
}

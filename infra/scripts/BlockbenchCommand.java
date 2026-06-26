package dev.tazer.blockbench.command;

import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.command.system.CommandSender;
import com.hypixel.hytale.server.core.command.system.basecommands.AbstractAsyncCommand;
import com.hypixel.hytale.protocol.GameMode;
import dev.tazer.blockbench.BlockbenchBridge;
import dev.tazer.blockbench.BlockbenchPlugin;

import javax.annotation.Nonnull;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

public class BlockbenchCommand extends AbstractAsyncCommand {
    public BlockbenchCommand() {
        super("blockbench", "Create an authentication key for a Blockbench client");
        setPermissionGroup(GameMode.Creative);
        addAliases(new String[]{"bb"});
    }

    @Override
    protected CompletableFuture<Void> executeAsync(@Nonnull CommandContext commandContext) {
        BlockbenchBridge bridge = BlockbenchPlugin.getBridge();
        CommandSender sender = commandContext.sender();
        String key = bridge.generateKey(sender.getUsername(), UUID.randomUUID());

        Message keyMsg = Message.raw(key).link(key).monospace(true).bold(true);
        Message full = Message.raw("Input key ").insert(keyMsg).insert(Message.raw(" in Blockbench to connect"));
        commandContext.sendMessage(full);

        return CompletableFuture.completedFuture(null);
    }
}

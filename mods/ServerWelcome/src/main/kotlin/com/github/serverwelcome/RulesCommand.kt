package com.github.serverwelcome

import com.hypixel.hytale.component.Ref
import com.hypixel.hytale.server.core.Message
import com.hypixel.hytale.server.core.command.system.AbstractCommand
import com.hypixel.hytale.server.core.command.system.CommandContext
import com.hypixel.hytale.server.core.universe.world.World
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore
import java.awt.Color
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executor
import javax.annotation.Nonnull
import javax.annotation.Nullable

class RulesCommand(private val plugin: ServerWelcomePlugin) :
    AbstractCommand("rules", "Показать правила сервера") {

    @Nullable
    override fun execute(@Nonnull context: CommandContext): CompletableFuture<Void> {
        if (!context.isPlayer()) {
            context.sendMessage(Message.raw("Только для игроков.").color(Color.RED))
            return CompletableFuture.completedFuture(null)
        }
        val ref = context.senderAsPlayerRef() as? Ref<EntityStore>
            ?: return CompletableFuture.completedFuture(null)
        if (!ref.isValid) return CompletableFuture.completedFuture(null)

        val store = ref.getStore()
        val world = (store.getExternalData() as? EntityStore)?.getWorld()
            ?: return CompletableFuture.completedFuture(null)

        return CompletableFuture.runAsync(
            { plugin.openRulesPage(ref, store) },
            world as Executor,
        )
    }
}

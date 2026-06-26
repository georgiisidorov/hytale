package com.github.serverwelcome

import com.hypixel.hytale.server.core.Message
import com.hypixel.hytale.server.core.command.system.CommandContext
import com.hypixel.hytale.server.core.command.system.AbstractCommand
import com.hypixel.hytale.component.Ref
import com.hypixel.hytale.component.Store
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore
import com.hypixel.hytale.server.core.universe.world.World
import org.joml.Vector3f
import java.awt.Color
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executor
import javax.annotation.Nonnull
import javax.annotation.Nullable

/**
 * Команда /setspawn: сохраняет текущую позицию как точку спавна для мира.
 * Только для OP (или право hytale.command.setspawn).
 */
class SetSpawnCommand : AbstractCommand("setspawn", "Задать точку спавна мира") {

    init {
        requirePermission("hytale.command.setspawn")
    }

    @Nullable
    override fun execute(@Nonnull context: CommandContext): CompletableFuture<Void> {
        if (!context.isPlayer()) {
            context.sendMessage(Message.raw("Команда только для игроков.").color(Color.RED))
            return CompletableFuture.completedFuture(null)
        }
        val ref = context.senderAsPlayerRef() as? Ref<EntityStore> ?: return CompletableFuture.completedFuture(null)
        if (!ref.isValid()) return CompletableFuture.completedFuture(null)
        val store = ref.getStore()
        val entityStore = store.getExternalData() as? EntityStore ?: return CompletableFuture.completedFuture(null)
        val world: World = entityStore.getWorld() ?: return CompletableFuture.completedFuture(null)
        val worldKey = world.getWorldConfig().getUuid().toString()

        return CompletableFuture.runAsync({
            val transform = store.getComponent(ref, com.hypixel.hytale.server.core.modules.entity.component.TransformComponent.getComponentType())
                ?: run {
                    context.sendMessage(Message.raw("Ошибка: нет Transform.").color(Color.RED))
                    return@runAsync
                }
            val pos = transform.getPosition()
            val v = Vector3f(pos.x.toFloat(), pos.y.toFloat(), pos.z.toFloat())
            SpawnPositionStore.setSpawn(worldKey, v)
            val x = pos.x.toInt()
            val y = pos.y.toInt()
            val z = pos.z.toInt()
            val msg = Message.raw("").insert(Message.raw(">> ").color(Color(0x55, 0xFF, 0x55)).bold(true))
                .insert(Message.raw("Спавн задан: ").color(Color.WHITE))
                .insert(Message.raw("$x, $y, $z").color(Color(0x55, 0xFF, 0xFF)))
            MessageFormatParser.setMarkupEnabled(msg, true)
            context.sendMessage(msg)
        }, world as Executor)
    }
}

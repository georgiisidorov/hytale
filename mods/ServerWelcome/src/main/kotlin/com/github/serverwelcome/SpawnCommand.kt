package com.github.serverwelcome

import com.hypixel.hytale.server.core.Message
import com.hypixel.hytale.server.core.command.system.CommandContext
import com.hypixel.hytale.server.core.command.system.AbstractCommand
import com.hypixel.hytale.component.Ref
import com.hypixel.hytale.component.Store
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore
import com.hypixel.hytale.server.core.universe.world.World
import org.joml.Vector3f
import org.joml.Vector3d
import java.awt.Color
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executor
import javax.annotation.Nonnull
import javax.annotation.Nullable

/**
 * Команда /spawn: телепорт на точку спавна мира и красивое сообщение в чат.
 * Точку спавна задаёт OP командой /setspawn. Право: hytale.command.spawn.
 */
class SpawnCommand : AbstractCommand("spawn", "Телепорт на спавн") {

    init {
        requirePermission("hytale.command.spawn")
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

        val spawnPos = SpawnPositionStore.getSpawn(worldKey)
        if (spawnPos == null) {
            context.sendMessage(
                Message.raw("Спавн для этого мира не задан. OP: используйте /setspawn.").color(Color.RED)
            )
            return CompletableFuture.completedFuture(null)
        }

        return CompletableFuture.runAsync({
            val transform = store.getComponent(ref, com.hypixel.hytale.server.core.modules.entity.component.TransformComponent.getComponentType())
                ?: return@runAsync
            val pos3d = Vector3d(spawnPos.x.toDouble(), spawnPos.y.toDouble(), spawnPos.z.toDouble())
            val teleport = com.hypixel.hytale.server.core.modules.entity.teleport.Teleport(pos3d, transform.rotation)
            store.addComponent(ref, com.hypixel.hytale.server.core.modules.entity.teleport.Teleport.getComponentType(), teleport)
            sendPrettySpawnMessage(context, spawnPos)
        }, world as Executor)
    }

    /** Как во встроенной spawn: отправка через context.sendMessage() (ответ команды), не player.sendMessage(). */
    private fun sendPrettySpawnMessage(context: CommandContext, pos: Vector3f) {
        val x = pos.x.toInt()
        val y = pos.y.toInt()
        val z = pos.z.toInt()
        val line1 = Message.raw("").insert(Message.raw(">> ").color(Color(0x55, 0xFF, 0x55)).bold(true))
            .insert(Message.raw("Вы телепортированы на ").color(Color.WHITE))
            .insert(Message.raw("спавн").color(Color(0x55, 0xFF, 0xFF)).bold(true))
            .insert(Message.raw(".").color(Color.WHITE))
        MessageFormatParser.setMarkupEnabled(line1, true)
        context.sendMessage(line1)
        val line2 = Message.raw("")
            .insert(Message.raw("Координаты: ").color(Color(0xAA, 0xAA, 0xAA)))
            .insert(Message.raw("$x, $y, $z").color(Color(0xBB, 0xBB, 0xBB)))
        MessageFormatParser.setMarkupEnabled(line2, true)
        context.sendMessage(line2)
    }
}

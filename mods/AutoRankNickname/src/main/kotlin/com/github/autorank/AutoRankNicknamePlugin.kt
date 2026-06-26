package com.github.autorank

import com.github.heroslender.herochat.HeroChat
import com.github.heroslender.herochat.data.User
import com.github.heroslender.herochat.data.UserSettings
import com.github.heroslender.herochat.service.UserService
import com.hypixel.hytale.event.EventPriority
import com.hypixel.hytale.server.core.event.events.player.PlayerConnectEvent
import com.hypixel.hytale.server.core.permissions.PermissionsModule
import com.hypixel.hytale.server.core.plugin.JavaPlugin
import com.hypixel.hytale.server.core.plugin.JavaPluginInit
import java.util.UUID
import java.util.concurrent.CompletableFuture

/**
 * AutoRankNickname:
 * при входе игрока выставляет HeroChat-ник с цветом в зависимости от rank.* прав (LuckPerms / PermissionsModule).
 *
 * Ожидаемые permissions-группы:
 *  - rank.op
 *  - rank.admin
 *  - rank.vip
 *  - rank.regular
 *
 * Формат ника (пример):
 *  - OP     -> &3&lUsername
 *  - ADMIN  -> &c&lUsername
 *  - VIP    -> &b&lUsername
 *  - REGULAR-> &7Username
 *
 * Чтобы ник использовался в чате:
 *  - в HeroChat config.json: "enableMinecraftColors": true
 *  - в канале (global.json): "Format": "{player_nickname}{#FFFFFF}: {color}{message}"
 */
class AutoRankNicknamePlugin(init: JavaPluginInit) : JavaPlugin(init) {

    private lateinit var userService: UserService

    override fun setup() {
        userService = HeroChat.instance.userService
        logger.atInfo().log("AutoRankNickname setup complete")
    }

    override fun start() {
        eventRegistry.register(EventPriority.LATE, PlayerConnectEvent::class.java) { event ->
            handleJoin(event)
        }
        logger.atInfo().log("AutoRankNickname started (listening for PlayerConnectEvent)")
    }

    private fun handleJoin(event: PlayerConnectEvent) {
        val playerRef = event.playerRef
        val uuid: UUID = playerRef.uuid
        val username = playerRef.username

        val perms = PermissionsModule.get()

        val coloredNick = when {
            perms.hasPermission(uuid, "rank.op", false) ->
                "&3&l$username"
            perms.hasPermission(uuid, "rank.admin", false) ->
                "&c&l$username"
            perms.hasPermission(uuid, "rank.vip", false) ->
                "&b&l$username"
            perms.hasPermission(uuid, "rank.regular", false) ->
                "&7$username"
            else ->
                "&7$username"
        }

        val user: User = userService.getUser(uuid) ?: return

        CompletableFuture.runAsync {
            with(userService) {
                user.updateSettings { settings: UserSettings ->
                    settings.nickname = coloredNick
                }
            }
            logger.atFine().log("Set nickname for $username to '$coloredNick'")
        }
    }
}


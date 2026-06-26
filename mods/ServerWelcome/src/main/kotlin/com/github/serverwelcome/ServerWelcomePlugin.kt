package com.github.serverwelcome

import com.hypixel.hytale.component.Ref
import com.hypixel.hytale.component.Store
import com.hypixel.hytale.event.EventPriority
import com.hypixel.hytale.server.core.entity.entities.Player
import com.hypixel.hytale.server.core.event.events.player.AddPlayerToWorldEvent
import com.hypixel.hytale.server.core.plugin.JavaPlugin
import com.hypixel.hytale.server.core.plugin.JavaPluginInit
import com.hypixel.hytale.server.core.universe.PlayerRef
import com.hypixel.hytale.server.core.universe.world.World
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore
import java.io.File
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap

/**
 * Плагин приветствия:
 * - читает welcome.txt из папки данных мода (строки с # — комментарии);
 * - в welcome.txt можно использовать &коды цвета (в UI показывается plain-текст);
 * - при входе и по /rules — синее popup-окно (как YooKassa); текст из welcome.txt.
 */
class ServerWelcomePlugin(init: JavaPluginInit) : JavaPlugin(init) {

    private lateinit var welcomeFile: File
    @Volatile
    private var cachedLines: List<String> = emptyList()

    /** После «присоединился к миру» — ждём, пока появится entity ref. */
    private val welcomeDelayMs = 2500L
    private val rulesRetryIntervalMs = 500L
    private val rulesMaxRetries = 8

    /** Один popup правил за вход (lobby + maze = два AddPlayerToWorld, показываем только первый). */
    private val rulesShownThisSession = ConcurrentHashMap.newKeySet<UUID>()

    override fun setup() {
        val dataDir = dataDirectory.toFile()
        if (!dataDir.exists()) {
            dataDir.mkdirs()
        }

        welcomeFile = File(dataDir, "welcome.txt")

        if (!welcomeFile.exists()) {
            welcomeFile.writeText(
                buildString {
                    appendLine("# Коды &a &e и т.д. — для справки; в окне показывается текст без кодов.")
                    appendLine("")
                    appendLine("&a&lДобро пожаловать &f&lна наш Hytale-сервер&a&l!")
                    appendLine("")
                    appendLine("&e&lПравила сервера:")
                    appendLine("&71) &fНе ломайте &cчужие постройки&7.")
                    appendLine("&72) &fНе используйте &cчиты и эксплойты&7.")
                    appendLine("&73) &fУважайте &bдругих игроков&7.")
                    appendLine("")
                    appendLine("&6Приятной игры!")
                },
            )
        }

        cachedLines = loadLines()
        logger.atInfo().log("ServerWelcome: loaded ${cachedLines.size} welcome lines")

        SpawnPositionStore.init(dataDir)
        commandRegistry.registerCommand(SpawnCommand())
        commandRegistry.registerCommand(SetSpawnCommand())
        commandRegistry.registerCommand(RulesCommand(this))
    }

    override fun start() {
        // PlayerConnectEvent — слишком рано: reference у PlayerRef ещё null, UI не открыть.
        eventRegistry.registerGlobal(EventPriority.LATE, AddPlayerToWorldEvent::class.java) { event ->
            scheduleRulesOnWorldJoin(event)
        }
        logger.atInfo().log("ServerWelcome: rules popup on AddPlayerToWorldEvent, /rules to reopen")
    }

    fun getWelcomeLines(): List<String> =
        cachedLines.ifEmpty { loadLines().also { cachedLines = it } }.filter { it.isNotBlank() }

    fun openRulesPage(ref: Ref<EntityStore>, store: Store<EntityStore>) {
        val player = store.getComponent(ref, Player.getComponentType()) ?: return
        val playerRef = store.getComponent(ref, PlayerRef.getComponentType()) ?: return
        val lines = getWelcomeLines()
        if (lines.isEmpty()) return
        player.pageManager.openCustomPage(
            ref,
            store,
            RulesPage(playerRef, RulesText.subtitle(lines), RulesText.formatForUi(lines)),
        )
    }

    private fun loadLines(): List<String> =
        try {
            welcomeFile.readLines()
                .map { it.trimEnd() }
                .filter { it.isNotBlank() && !it.startsWith("#") }
        } catch (ex: Exception) {
            logger.atSevere().withCause(ex).log("Failed to read welcome.txt")
            emptyList()
        }

    private fun scheduleRulesOnWorldJoin(event: AddPlayerToWorldEvent) {
        if (getWelcomeLines().isEmpty()) return

        val world = event.world ?: return
        val holder = event.holder ?: return
        val playerRef = holder.getComponent(PlayerRef.getComponentType()) ?: return
        if (!playerRef.isValid) return

        val uuid = playerRef.uuid
        if (!rulesShownThisSession.add(uuid)) {
            return
        }

        logger.atInfo().log(
            "ServerWelcome: scheduling rules for %s in world %s",
            playerRef.username,
            world.name,
        )

        CompletableFuture.runAsync {
            try {
                Thread.sleep(welcomeDelayMs)
            } catch (_: InterruptedException) {
                return@runAsync
            }
            world.execute { tryOpenRulesWithRetry(world, playerRef, rulesMaxRetries) }
        }
    }

    private fun tryOpenRulesWithRetry(world: World, playerRef: PlayerRef, attemptsLeft: Int) {
        val ref = playerRef.reference
        if (ref != null && ref.isValid) {
            try {
                openRulesPage(ref, ref.store)
                logger.atInfo().log("ServerWelcome: rules popup opened for %s", playerRef.username)
                return
            } catch (t: Throwable) {
                logger.atWarning().withCause(t).log("ServerWelcome: openRulesPage failed for %s", playerRef.username)
            }
        }

        if (attemptsLeft <= 0) {
            logger.atWarning().log(
                "ServerWelcome: gave up opening rules for %s (ref=%s valid=%s)",
                playerRef.username,
                ref,
                ref?.isValid == true,
            )
            rulesShownThisSession.remove(playerRef.uuid)
            return
        }

        CompletableFuture.runAsync {
            try {
                Thread.sleep(rulesRetryIntervalMs)
            } catch (_: InterruptedException) {
                return@runAsync
            }
            world.execute { tryOpenRulesWithRetry(world, playerRef, attemptsLeft - 1) }
        }
    }
}

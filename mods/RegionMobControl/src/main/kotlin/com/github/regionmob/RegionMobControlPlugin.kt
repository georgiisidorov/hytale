package com.github.regionmob

import com.hypixel.hytale.component.Archetype
import com.hypixel.hytale.component.ArchetypeChunk
import com.hypixel.hytale.component.CommandBuffer
import com.hypixel.hytale.component.RemoveReason
import com.hypixel.hytale.component.Store
import com.hypixel.hytale.component.SystemGroup
import com.hypixel.hytale.component.query.Query
import com.hypixel.hytale.component.system.tick.EntityTickingSystem
import com.hypixel.hytale.server.core.entity.EntityUtils
import com.hypixel.hytale.server.core.modules.entity.component.NewSpawnComponent
import com.hypixel.hytale.server.core.modules.entity.tracker.EntityTrackerSystems
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent
import com.hypixel.hytale.server.core.plugin.JavaPlugin
import com.hypixel.hytale.server.core.plugin.JavaPluginInit
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore
import com.hypixel.hytale.server.npc.NPCPlugin
import com.hypixel.hytale.server.npc.entities.NPCEntity
import dev.worldprotect.worldprotect.api.WorldProtectApiProvider
import java.io.File
import java.util.Locale
import kotlin.math.floor

class RegionMobControlPlugin(init: JavaPluginInit) : JavaPlugin(init) {
    companion object {
        lateinit var instance: RegionMobControlPlugin
            private set
    }

    override fun setup() {
        instance = this
        RegionRuleConfig.init(dataDirectory.toFile())
        entityStoreRegistry.registerSystem(RegionSpawnBlockSystem())
    }
}

private class RegionSpawnBlockSystem : EntityTickingSystem<EntityStore>() {
    override fun getQuery(): Query<EntityStore> = Archetype.add(
        Archetype.of(TransformComponent.getComponentType()),
        NewSpawnComponent.getComponentType(),
    )

    override fun getGroup(): SystemGroup<EntityStore> = EntityTrackerSystems.FIND_VISIBLE_ENTITIES_GROUP

    override fun isParallel(index: Int, entityCount: Int): Boolean = false

    override fun tick(
        deltaTime: Float,
        index: Int,
        chunk: ArchetypeChunk<EntityStore>,
        store: Store<EntityStore>,
        commandBuffer: CommandBuffer<EntityStore>,
    ) {
        if (!WorldProtectApiProvider.isAvailable()) return

        val entity = EntityUtils.getEntity(index, chunk) ?: return
        val npc = entity as? NPCEntity ?: return
        val ref = npc.reference ?: return
        if (!ref.isValid) return

        val world = npc.world ?: return
        val tc = store.getComponent(ref, TransformComponent.getComponentType()) ?: return
        val pos = tc.position ?: return

        val api = WorldProtectApiProvider.getApi() ?: return
        val x = floor(pos.x).toInt()
        val y = floor(pos.y).toInt()
        val z = floor(pos.z).toInt()
        val regionIds = api.getRegionsAt(world.name, x, y, z)
            .map { it.idLower().lowercase(Locale.ROOT) }
            .toSet()
        if (regionIds.isEmpty()) return
        val rules = RegionRuleConfig.current()

        if (regionIds.any { it in rules.blockAllRegions }) {
            commandBuffer.tryRemoveEntity(ref, RemoveReason.REMOVE)
            return
        }

        if (regionIds.any { it in rules.blockHostileRegions }) {
            val candidates = buildCandidateNames(npc)
            if (isBlockedRole(candidates, rules.blockedRolePatterns)) {
                commandBuffer.tryRemoveEntity(ref, RemoveReason.REMOVE)
            }
        }
    }

    private fun isBlockedRole(candidates: List<String>, patterns: List<String>): Boolean {
        return candidates.any { candidate ->
            patterns.any { wildcardMatches(candidate, it) }
        }
    }

    private fun buildCandidateNames(npc: NPCEntity): List<String> {
        val npcPlugin = runCatching { NPCPlugin.get() }.getOrNull()
        return listOfNotNull(
            npc.roleName,
            npc.npcTypeId,
            npcPlugin?.getName(npc.roleIndex),
            npcPlugin?.getName(npc.spawnRoleIndex),
            npcPlugin?.getRoleBuilderInfo(npc.roleIndex)?.keyName,
            npcPlugin?.getRoleBuilderInfo(npc.spawnRoleIndex)?.keyName,
        )
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .map { it.lowercase(Locale.ROOT) }
            .distinct()
    }

    private fun wildcardMatches(value: String, pattern: String): Boolean {
        val regex = Regex(
            "^" + pattern.split('*').joinToString(".*") { Regex.escape(it) } + "$"
        )
        return regex.matches(value)
    }
}

private object RegionRuleConfig {
    data class Rules(
        val blockAllRegions: Set<String>,
        val blockHostileRegions: Set<String>,
        val blockedRolePatterns: List<String>,
    )

    private val defaultAllRegions = setOf("no_all_mobs")
    private val defaultHostileRegions = setOf("no_hostile")
    private val defaultBlockedRolePatterns = listOf(
        "*goblin_*",
        "*skeleton*",
        "*trork*",
        "*zombie*",
        "bear*",
        "crawler_void",
        "crocodile",
        "emberwulf",
        "eye_void",
        "fen_stalker",
        "fox*",
        "hyena*",
        "leopard_snow",
        "raptor_cave",
        "rat*",
        "rex_cave",
        "scorpion*",
        "snake*",
        "spark*",
        "spawn_void",
        "spectre_void",
        "spider*",
        "tiger_sabertooth",
        "toad*",
        "wolf*",
        "yeti",
    )
    @Volatile
    private var rules = Rules(defaultAllRegions, defaultHostileRegions, defaultBlockedRolePatterns)

    private lateinit var file: File

    fun init(dataDir: File) {
        if (!dataDir.exists()) dataDir.mkdirs()
        file = File(dataDir, "regions.txt")
        if (!file.exists()) {
            file.writeText(
                buildString {
                    appendLine("# Region ids from WorldProtect.")
                    appendLine("# Comma-separated values, spaces are ignored.")
                    appendLine("block_all=no_all_mobs")
                    appendLine("block_hostile=no_hostile")
                    appendLine()
                    appendLine("# Manual list of NPC roles blocked in block_hostile regions.")
                    appendLine("# '*' works as a wildcard.")
                    appendLine("blocked_roles=${defaultBlockedRolePatterns.joinToString(",")}")
                }
            )
        }
        reload()
    }

    fun current(): Rules = rules

    private fun reload() {
        var blockAll = defaultAllRegions
        var blockHostile = defaultHostileRegions
        var blockedRolePatterns = defaultBlockedRolePatterns

        runCatching {
            file.readLines().forEach { raw ->
                val line = raw.trim()
                if (line.isBlank() || line.startsWith("#")) return@forEach
                val eq = line.indexOf('=')
                if (eq <= 0) return@forEach

                val key = line.substring(0, eq).trim().lowercase(Locale.ROOT)
                val value = line.substring(eq + 1).trim()
                when (key) {
                    "block_all" -> blockAll = parseSet(value, defaultAllRegions)
                    "block_hostile" -> blockHostile = parseSet(value, defaultHostileRegions)
                    "blocked_roles", "hostile_patterns" -> {
                        blockedRolePatterns = parseList(value, defaultBlockedRolePatterns)
                    }
                }
            }
        }

        rules = Rules(blockAll, blockHostile, blockedRolePatterns)
    }

    private fun parseSet(raw: String, fallback: Set<String>): Set<String> {
        val parsed = raw.split(',')
            .map { it.trim().lowercase(Locale.ROOT) }
            .filter { it.isNotBlank() }
            .toSet()
        return if (parsed.isEmpty()) fallback else parsed
    }

    private fun parseList(raw: String, fallback: List<String>): List<String> {
        val parsed = raw.split(',')
            .map { it.trim().lowercase(Locale.ROOT) }
            .filter { it.isNotBlank() }
        return if (parsed.isEmpty()) fallback else parsed
    }
}

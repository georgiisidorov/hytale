package com.github.serverwelcome

import org.joml.Vector3f
import java.io.File

/** Хранит позиции спавна по мирам (имя мира -> x,y,z). Файл spawns.txt: по строке "мир x y z". */
object SpawnPositionStore {

    private var dataDir: File? = null
    private val positions = mutableMapOf<String, Vector3f>()

    fun init(dataDirectory: File) {
        dataDir = dataDirectory
        load()
    }

    private fun file(): File = File(dataDir, "spawns.txt").also {
        dataDir?.mkdirs()
    }

    private fun load() {
        val f = file()
        if (!f.exists()) return
        try {
            positions.clear()
            f.readLines().forEach { line ->
                val parts = line.trim().split("\\s+".toRegex())
                if (parts.size >= 4) {
                    val world = parts[0]
                    val x = parts[1].toFloatOrNull() ?: return@forEach
                    val y = parts[2].toFloatOrNull() ?: return@forEach
                    val z = parts[3].toFloatOrNull() ?: return@forEach
                    positions[world] = Vector3f(x, y, z)
                }
            }
        } catch (_: Exception) { }
    }

    private fun save() {
        try {
            file().writeText(
                positions.entries.joinToString("\n") { (world, v) ->
                    "$world ${v.x} ${v.y} ${v.z}"
                }
            )
        } catch (_: Exception) { }
    }

    fun setSpawn(worldName: String, position: Vector3f) {
        positions[worldName] = position
        save()
    }

    fun getSpawn(worldName: String): Vector3f? = positions[worldName]
}

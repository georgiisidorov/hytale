package com.github.serverwelcome

/** Текст для UI: без &кодов, с переносами между строками welcome.txt. */
object RulesText {
    fun formatForUi(lines: List<String>): String =
        lines
            .filter { it.isNotBlank() }
            .joinToString("\n") { stripCodes(it) }

    fun subtitle(lines: List<String>): String {
        val first = lines.firstOrNull { it.isNotBlank() } ?: return "Добро пожаловать на сервер!"
        val plain = stripCodes(first)
        return if (plain.length > 120) plain.take(117) + "…" else plain
    }

    private fun stripCodes(s: String): String {
        val sb = StringBuilder()
        var i = 0
        while (i < s.length) {
            if (s[i] == '&' && i + 1 < s.length) {
                i += 2
                continue
            }
            sb.append(s[i])
            i++
        }
        return sb.toString()
    }
}

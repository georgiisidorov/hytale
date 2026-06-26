package com.github.serverwelcome

import com.hypixel.hytale.protocol.FormattedMessage
import com.hypixel.hytale.server.core.Message
import java.awt.Color

/**
 * Парсер строк с кодами форматирования в стиле Minecraft/HeroChat:
 * &0–&f — цвета, &l — жирный, &o — курсив, &r — сброс.
 * Собирает [Message] через официальный API (Message.raw().color().bold().italic()),
 * либо [FormattedMessage] вручную для прямой отправки пакетом (цвет в hex #RRGGBB).
 */
object MessageFormatParser {

    /** Включает markupEnabled у сообщения и всех вложенных сегментов — иначе клиент показывает всё серым. */
    fun setMarkupEnabled(message: Message, enabled: Boolean) {
        val root = message.formattedMessage
        setMarkupEnabledRecursive(root, enabled)
        if (root.children != null && root.children!!.isNotEmpty() && root.color == null)
            root.color = "#FFFFFF"
    }

    private fun setMarkupEnabledRecursive(msg: FormattedMessage?, enabled: Boolean) {
        if (msg == null) return
        msg.markupEnabled = enabled
        msg.color?.let { msg.color = it.uppercase() }
        msg.children?.forEach { setMarkupEnabledRecursive(it, enabled) }
    }

    private val colorByCode: Map<Char, Color> = mapOf(
        '0' to Color(0x000000),      // black
        '1' to Color(0x0000AA),     // dark_blue
        '2' to Color(0x00AA00),     // dark_green
        '3' to Color(0x00AAAA),     // dark_aqua
        '4' to Color(0xAA0000),     // dark_red
        '5' to Color(0xAA00AA),     // dark_purple
        '6' to Color(0xFFAA00),     // gold
        '7' to Color(0xAAAAAA),     // gray
        '8' to Color(0x555555),     // dark_gray
        '9' to Color(0x5555FF),     // blue
        'a' to Color(0x55FF55),     // green
        'b' to Color(0x55FFFF),     // aqua
        'c' to Color(0xFF5555),     // red
        'd' to Color(0xFF55FF),     // light_purple
        'e' to Color(0xFFFF55),     // yellow
        'f' to Color(0xFFFFFF),     // white
        'A' to Color(0x55FF55),
        'B' to Color(0x55FFFF),
        'C' to Color(0xFF5555),
        'D' to Color(0xFF55FF),
        'E' to Color(0xFFFF55),
        'F' to Color(0xFFFFFF),
    )

    private val defaultColor = Color(0xAAAAAA) // gray, как &7

    private fun colorToHex(c: Color): String = "#%06X".format(c.rgb and 0xFFFFFF)

    /**
     * Парсит строку и возвращает [FormattedMessage] для прямой отправки пакетом ServerMessage.
     * Каждый сегмент — rawText + color (#RRGGBB) + bold/italic + markupEnabled=true.
     */
    fun parseToFormattedMessage(line: String): FormattedMessage {
        if (line.isEmpty()) {
            val empty = FormattedMessage()
            empty.rawText = ""
            empty.markupEnabled = true
            return empty
        }
        val segments = mutableListOf<FormattedMessage>()
        var i = 0
        var color = defaultColor
        var bold = false
        var italic = false
        val segmentText = StringBuilder()

        fun flushSegment() {
            if (segmentText.isEmpty()) return
            val seg = FormattedMessage()
            seg.rawText = segmentText.toString()
            seg.color = colorToHex(color)
            seg.bold = bold
            seg.italic = italic
            seg.markupEnabled = true
            segments.add(seg)
            segmentText.clear()
        }

        while (i < line.length) {
            val c = line[i]
            if (c == '&' && i + 1 < line.length) {
                val code = line[i + 1]
                flushSegment()
                when (code) {
                    'l', 'L' -> bold = true
                    'o', 'O' -> italic = true
                    'r', 'R' -> {
                        color = defaultColor
                        bold = false
                        italic = false
                    }
                    else -> colorByCode[code]?.let { color = it }
                }
                i += 2
                continue
            }
            segmentText.append(c)
            i += 1
        }
        flushSegment()

        return when (segments.size) {
            0 -> {
                val empty = FormattedMessage()
                empty.rawText = ""
                empty.markupEnabled = true
                empty
            }
            1 -> segments.single()
            else -> {
                val root = FormattedMessage()
                root.children = segments.toTypedArray()
                root.markupEnabled = true
                root.color = "#FFFFFF"
                root
            }
        }
    }

    /**
     * Парсит строку с кодами &a &l &o &r и возвращает одно [Message] для отправки игроку.
     */
    fun parse(line: String): Message {
        if (line.isEmpty()) return Message.raw("")
        val segments = mutableListOf<Message>()
        var i = 0
        var color = defaultColor
        var bold = false
        var italic = false
        val segmentText = StringBuilder()

        fun flushSegment() {
            if (segmentText.isEmpty()) return
            var msg = Message.raw(segmentText.toString()).color(color)
            if (bold) msg = msg.bold(true)
            if (italic) msg = msg.italic(true)
            segments.add(msg)
            segmentText.clear()
        }

        while (i < line.length) {
            val c = line[i]
            if (c == '&' && i + 1 < line.length) {
                val code = line[i + 1]
                flushSegment()
                when (code) {
                    'l', 'L' -> bold = true
                    'o', 'O' -> italic = true
                    'r', 'R' -> {
                        color = defaultColor
                        bold = false
                        italic = false
                    }
                    else -> {
                        colorByCode[code]?.let { color = it }
                        // формат-коды не сбрасывают bold/italic, только цвет
                    }
                }
                i += 2
                continue
            }
            segmentText.append(c)
            i += 1
        }
        flushSegment()

        if (segments.isEmpty()) return Message.raw("")
        // Собираем как в SpawnCommand: корень Message.raw("") + insert(сегменты), иначе клиент показывает серым.
        var out = Message.raw("")
        for (seg in segments) {
            out = out.insert(seg)
        }
        return out
    }
}

package com.github.custompopup;

import com.hypixel.hytale.protocol.FormattedMessage;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.ui.builder.UICommandBuilder;

/** Хелперы Custom UI под сервер 0.5.3. */
final class PopupUi {
    private PopupUi() {}

    static void setLabelText(UICommandBuilder commands, String selector, String text) {
        commands.set(selector + ".Text", text != null ? text : "");
    }

    /** Тело popup — только plain string (#BodyText). Message BSON в .Text ломает клиент. */
    static void setLabelMessage(UICommandBuilder commands, String selector, Message message) {
        setLabelText(commands, selector, message != null ? plainText(message) : "");
    }

    private static String plainText(Message message) {
        StringBuilder sb = new StringBuilder();
        appendPlain(message.getFormattedMessage(), sb);
        String result = sb.toString().trim();
        return result.isEmpty() ? " " : result;
    }

    private static void appendPlain(FormattedMessage msg, StringBuilder sb) {
        if (msg == null) {
            return;
        }
        if (msg.rawText != null && !msg.rawText.isEmpty()) {
            sb.append(msg.rawText);
        }
        if (msg.link != null && !msg.link.isEmpty()) {
            if (!sb.isEmpty()) {
                sb.append(' ');
            }
            sb.append(msg.link);
        }
        if (msg.children != null) {
            for (FormattedMessage child : msg.children) {
                appendPlain(child, sb);
            }
        }
    }
}

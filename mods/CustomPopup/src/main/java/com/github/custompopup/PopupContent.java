package com.github.custompopup;

import com.hypixel.hytale.server.core.Message;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/** Содержимое in-game popup. */
public final class PopupContent {
    public final String title;
    public final String subtitle;
    public final Message body;
    public final List<PopupAction> actions;
    public final String okLabel;
    public final boolean showOk;

    private PopupContent(
            String title,
            String subtitle,
            Message body,
            List<PopupAction> actions,
            String okLabel,
            boolean showOk
    ) {
        this.title = title;
        this.subtitle = subtitle;
        this.body = body;
        this.actions = actions;
        this.okLabel = okLabel;
        this.showOk = showOk;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String title = "Сообщение";
        private String subtitle = "";
        private Message body = Message.raw("");
        private List<PopupAction> actions = Collections.emptyList();
        private String okLabel = "OK";
        private boolean showOk = true;

        public Builder title(String title) {
            if (title != null && !title.isBlank()) {
                this.title = title.trim();
            }
            return this;
        }

        public Builder subtitle(String subtitle) {
            this.subtitle = subtitle != null ? subtitle : "";
            return this;
        }

        public Builder body(Message body) {
            if (body != null) {
                this.body = body;
            }
            return this;
        }

        public Builder bodyPlain(String text) {
            this.body = Message.raw(text != null ? text : "");
            return this;
        }

        public Builder actions(List<PopupAction> actions) {
            this.actions = actions != null ? List.copyOf(actions) : Collections.emptyList();
            return this;
        }

        public Builder actions(PopupAction... actions) {
            return actions(actions == null ? List.of() : Arrays.asList(actions));
        }

        public Builder okLabel(String okLabel) {
            if (okLabel != null && !okLabel.isBlank()) {
                this.okLabel = okLabel.trim();
            }
            return this;
        }

        public Builder showOk(boolean showOk) {
            this.showOk = showOk;
            return this;
        }

        public PopupContent build() {
            if (actions.size() > PopupPage.MAX_ACTIONS) {
                throw new IllegalArgumentException("max " + PopupPage.MAX_ACTIONS + " actions");
            }
            return new PopupContent(title, subtitle, body, actions, okLabel, showOk);
        }
    }
}

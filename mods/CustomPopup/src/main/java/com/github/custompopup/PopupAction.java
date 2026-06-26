package com.github.custompopup;

/** Кнопка внизу popup (в игре). */
public final class PopupAction {
    public final String id;
    public final String label;
    /**
     * Если задан — по клику ссылка уходит в чат (клиент 0.5.3 не открывает URL из mod popup напрямую).
     */
    public final String openUrl;

    public PopupAction(String id, String label) {
        this(id, label, null);
    }

    public PopupAction(String id, String label, String openUrl) {
        this.id = id == null ? "" : id.trim();
        this.label = label == null ? "" : label.trim();
        this.openUrl = openUrl == null || openUrl.isBlank() ? null : openUrl.trim();
    }

    public static PopupAction of(String id, String label) {
        return new PopupAction(id, label);
    }

    /** Кнопка с URL: клик → ссылка в чате (см. {@link PopupPage#openUrlInChat}). */
    public static PopupAction openLink(String url, String label) {
        return new PopupAction("open_link", label, url);
    }
}

package com.github.custompopup;

import com.hypixel.hytale.codec.Codec;
import com.hypixel.hytale.codec.KeyedCodec;
import com.hypixel.hytale.codec.builder.BuilderCodec;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.protocol.packets.interface_.CustomPageLifetime;
import com.hypixel.hytale.protocol.packets.interface_.CustomUIEventBindingType;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.entity.entities.player.pages.InteractiveCustomUIPage;
import com.hypixel.hytale.server.core.ui.builder.EventData;
import com.hypixel.hytale.server.core.ui.builder.UICommandBuilder;
import com.hypixel.hytale.server.core.ui.builder.UIEventBuilder;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

/** Универсальное in-game popup (Custom UI поверх игры). */
public final class PopupPage extends InteractiveCustomUIPage<PopupPage.PopupEventData> {
    static final int MAX_ACTIONS = 5;
    private static final String PAGE = "Pages/CustomPopup/PopupFrame.ui";
    private static final String[] ACTION_SELECTORS = {
            "#Action0", "#Action1", "#Action2", "#Action3", "#Action4",
    };
    private final PopupContent content;
    private final PopupHandler handler;

    public PopupPage(PlayerRef playerRef, PopupContent content, PopupHandler handler) {
        super(playerRef, CustomPageLifetime.CanDismissOrCloseThroughInteraction, PopupEventData.CODEC);
        this.content = content;
        this.handler = handler;
    }

    @Override
    public void build(
            Ref<EntityStore> ref,
            UICommandBuilder commands,
            UIEventBuilder events,
            Store<EntityStore> store
    ) {
        commands.append(PAGE);
        PopupUi.setLabelText(commands, "#HeaderTitle", content.title);
        PopupUi.setLabelText(commands, "#Subtitle", content.subtitle != null ? content.subtitle : "");
        PopupUi.setLabelMessage(commands, "#BodyText", content.body);
        PopupUi.setLabelText(commands, "#OkButton", content.okLabel);
        commands.set("#OkButton.Visible", content.showOk);
        PopupUi.setLabelText(commands, "#Status", "");

        for (int i = 0; i < MAX_ACTIONS; i++) {
            String selector = ACTION_SELECTORS[i];
            if (i < content.actions.size()) {
                PopupAction action = content.actions.get(i);
                commands.set(selector + ".Visible", true);
                PopupUi.setLabelText(commands, selector, action.label);
                events.addEventBinding(
                        CustomUIEventBindingType.Activating,
                        selector,
                        EventData.of("Action", action.id)
                );
            } else {
                commands.set(selector + ".Visible", false);
            }
        }

        EventData close = EventData.of("Action", "close");
        events.addEventBinding(CustomUIEventBindingType.Activating, "#CloseButton", close);
        if (content.showOk) {
            events.addEventBinding(CustomUIEventBindingType.Activating, "#OkButton", close);
        }
    }

    @Override
    public void handleDataEvent(Ref<EntityStore> ref, Store<EntityStore> store, PopupEventData data) {
        if (data == null || data.action == null) {
            return;
        }
        if ("close".equals(data.action)) {
            close();
            return;
        }

        PopupAction action = findAction(data.action);
        if (action != null && action.openUrl != null) {
            openUrlInChat(action);
            return;
        }

        if (handler != null) {
            boolean closeAfter = handler.onAction(playerRef, ref, store, data.action);
            if (closeAfter) {
                close();
            }
            return;
        }
        flash("Действие: " + data.action);
    }

    /**
     * На 0.5.3 TextSpans.Link в mod popup не открывает браузер (проверено).
     * Рабочий путь — как YooKassa: кнопка → ссылка в чате → клик в чате.
     */
    private void openUrlInChat(PopupAction action) {
        String label = action.label != null && !action.label.isBlank()
                ? action.label
                : action.openUrl;
        playerRef.sendMessage(Message.raw(label).link(action.openUrl).color("#6eb5ff"));
        close();
    }

    private PopupAction findAction(String actionId) {
        if (actionId == null) {
            return null;
        }
        for (PopupAction action : content.actions) {
            if (actionId.equals(action.id)) {
                return action;
            }
        }
        return null;
    }

    private void flash(String msg) {
        UICommandBuilder b = new UICommandBuilder();
        PopupUi.setLabelText(b, "#Status", msg);
        sendUpdate(b, false);
    }

    public static final class PopupEventData {
        public String action;

        public static final BuilderCodec<PopupEventData> CODEC =
                BuilderCodec.builder(PopupEventData.class, PopupEventData::new)
                        .append(new KeyedCodec<>("Action", Codec.STRING), (d, v) -> d.action = v, d -> d.action)
                        .add()
                        .build();
    }
}

package com.github.custompopup;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

/**
 * API: открыть popup в игре (не внешний браузер).
 * {@link CustomPopupPlugin#service()}.
 */
public interface PopupService {

    void open(
            PlayerRef playerRef,
            Ref<EntityStore> ref,
            Store<EntityStore> store,
            PopupContent content
    );

    void open(
            PlayerRef playerRef,
            Ref<EntityStore> ref,
            Store<EntityStore> store,
            PopupContent content,
            PopupHandler handler
    );
}

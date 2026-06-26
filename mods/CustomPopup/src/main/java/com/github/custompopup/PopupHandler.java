package com.github.custompopup;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

/** Обработчик нажатий кнопок popup (опционально). */
@FunctionalInterface
public interface PopupHandler {
    /**
     * @return true — закрыть popup после обработки
     */
    boolean onAction(
            PlayerRef playerRef,
            Ref<EntityStore> ref,
            Store<EntityStore> store,
            String actionId
    );
}

package com.github.custompopup;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

final class PopupServiceImpl implements PopupService {

    @Override
    public void open(
            PlayerRef playerRef,
            Ref<EntityStore> ref,
            Store<EntityStore> store,
            PopupContent content
    ) {
        open(playerRef, ref, store, content, null);
    }

    @Override
    public void open(
            PlayerRef playerRef,
            Ref<EntityStore> ref,
            Store<EntityStore> store,
            PopupContent content,
            PopupHandler handler
    ) {
        if (content == null) {
            throw new IllegalArgumentException("content is null");
        }
        Player player = store.getComponent(ref, Player.getComponentType());
        if (player == null) {
            return;
        }
        player.getPageManager().openCustomPage(ref, store, new PopupPage(playerRef, content, handler));
    }
}

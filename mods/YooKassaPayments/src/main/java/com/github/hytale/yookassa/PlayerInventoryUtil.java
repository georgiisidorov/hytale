package com.github.hytale.yookassa;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.inventory.InventoryComponent;
import com.hypixel.hytale.server.core.inventory.ItemStack;
import com.hypixel.hytale.server.core.inventory.container.CombinedItemContainer;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

/** Проверка, поместится ли предмет в инвентарь игрока (до списания монет/кристаллов). */
final class PlayerInventoryUtil {
    static final String INVENTORY_FULL_MESSAGE =
            "Инвентарь заполнен.\nОсвободите место и попробуйте снова.";

    private PlayerInventoryUtil() {}

    static boolean canFit(
            Ref<EntityStore> ref,
            Store<EntityStore> store,
            String itemId,
            int quantity
    ) {
        if (ref == null || !ref.isValid() || store == null || itemId == null || itemId.isBlank()) {
            return false;
        }
        try {
            ItemStack stack = new ItemStack(itemId, Math.max(1, quantity));
            CombinedItemContainer inv =
                    InventoryComponent.getCombined(store, ref, InventoryComponent.EVERYTHING);
            return inv != null && inv.canAddItemStack(stack);
        } catch (Throwable ignored) {
            return false;
        }
    }
}

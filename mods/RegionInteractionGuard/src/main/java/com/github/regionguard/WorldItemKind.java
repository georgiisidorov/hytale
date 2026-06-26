package com.github.regionguard;

import com.hypixel.hytale.component.ComponentType;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.modules.entity.DespawnComponent;
import com.hypixel.hytale.server.core.modules.entity.component.Interactable;
import com.hypixel.hytale.server.core.modules.entity.item.ItemComponent;
import com.hypixel.hytale.server.core.modules.entity.item.PickupItemComponent;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

/**
 * Различие «дроп» vs «положенный» предмет в мире (item entity).
 * <p>
 * Обычный лут с пола создаётся через {@link com.hypixel.hytale.server.core.modules.entity.item.ItemComponent#generateItemDrop}
 * и получает {@link DespawnComponent} (TTL). В процессе подбора движок может снять Despawn раньше, чем удалится сущность —
 * тогда нельзя считать предмет «положенным» только по отсутствию Despawn, если уже идёт анимация подбора без {@link Interactable}.
 */
final class WorldItemKind {

    private static final ComponentType<EntityStore, ItemComponent> ITEM =
        ItemComponent.getComponentType();
    private static final ComponentType<EntityStore, Interactable> INTERACTABLE =
        Interactable.getComponentType();
    private static final ComponentType<EntityStore, DespawnComponent> DESPAWN =
        DespawnComponent.getComponentType();
    private static final ComponentType<EntityStore, PickupItemComponent> PICKUP_ANIM =
        PickupItemComponent.getComponentType();

    private WorldItemKind() {}

    /** Явный ванильный дроп (есть Despawn, нет Interactable). */
    static boolean isVanillaDropLoot(Store<EntityStore> store, Ref<EntityStore> ref) {
        if (store == null || ref == null || !ref.isValid()) return false;
        if (store.getComponent(ref, ITEM) == null) return false;
        if (store.getComponent(ref, INTERACTABLE) != null) return false;
        return store.getComponent(ref, DESPAWN) != null;
    }

    /**
     * Блокировать подбор / превью в защищённой зоне: положенные декорации.
     * Не блокировать обычный лут и не трогать лут в момент подбора (есть {@link PickupItemComponent}, нет Interactable).
     */
    static boolean shouldBlockWorldItemPickupInZone(Store<EntityStore> store, Ref<EntityStore> ref) {
        if (store == null || ref == null || !ref.isValid()) return false;
        if (store.getComponent(ref, ITEM) == null) return false;
        if (store.getComponent(ref, INTERACTABLE) != null) {
            return true;
        }
        if (store.getComponent(ref, DESPAWN) != null) {
            return false;
        }
        // Нет Despawn: при «положенном без Interactable» на земле компонента анимации подбора ещё нет.
        // Если анимация уже есть без Interactable — скорее всего лут, у которого сняли Despawn во время подбора.
        return store.getComponent(ref, PICKUP_ANIM) == null;
    }

    /** Стандартный дроп с пола (есть TTL деспавна, без Interactable). */
    static boolean isDroppedGroundItem(Store<EntityStore> store, Ref<EntityStore> ref) {
        return isVanillaDropLoot(store, ref);
    }
}

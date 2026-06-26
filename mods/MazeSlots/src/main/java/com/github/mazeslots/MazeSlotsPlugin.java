package com.github.mazeslots;

import com.hypixel.hytale.component.ComponentAccessor;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.event.EventPriority;
import com.hypixel.hytale.math.vector.Rotation3f;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.event.events.player.AddPlayerToWorldEvent;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.modules.entity.teleport.Teleport;
import com.hypixel.hytale.server.core.permissions.PermissionsModule;
import com.hypixel.hytale.server.core.plugin.JavaPlugin;
import com.hypixel.hytale.server.core.plugin.JavaPluginInit;
import com.hypixel.hytale.server.core.prefab.PrefabStore;
import com.hypixel.hytale.server.core.prefab.selection.standard.BlockSelection;
import com.hypixel.hytale.server.core.prefab.selection.standard.FeedbackConsumer;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.WorldMapTracker;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.server.core.universe.world.worldmap.WorldMapManager;
import com.hypixel.hytale.server.core.universe.world.worldmap.provider.DisabledWorldMapProvider;
import org.joml.Vector3d;

import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

public class MazeSlotsPlugin extends JavaPlugin {
    private static final int SLOT_SIZE_XZ = 119;

    private static final String TARGET_WORLD = "maze";
    private static final String PREFAB_FILE = "maze.prefab.json";

    private final AtomicBoolean mapDisabled = new AtomicBoolean(false);

    public MazeSlotsPlugin(JavaPluginInit init) {
        super(init);
    }

    @Override
    protected void setup() {
        getEntityStoreRegistry().registerSystem(new MazeSlotsClampSystem());
    }

    @Override
    protected void start() {
        getEventRegistry().registerGlobal(EventPriority.LATE, AddPlayerToWorldEvent.class, event -> {
            if (!TARGET_WORLD.equals(event.getWorld().getName())) return;
            World world = event.getWorld();
            try {
                com.hypixel.hytale.component.Holder<EntityStore> holder = event.getHolder();
                PlayerRef playerRef = holder.getComponent(PlayerRef.getComponentType());
                if (playerRef == null || !playerRef.isValid()) return;
                scheduleOnWorld(world, () -> handleEnter(world, playerRef));
            } catch (Throwable ignored) {
            }
        });
    }

    private void disableWorldMap(World world) {
        if (mapDisabled.compareAndSet(false, true)) {
            try {
                WorldMapManager mgr = world.getWorldMapManager();
                if (mgr != null) {
                    mgr.setGenerator(new DisabledWorldMapProvider().getGenerator(world));
                    mgr.sendSettings();
                }
            } catch (Throwable ignored) {
            }
        }
    }

    private void handleEnter(World world, PlayerRef playerRef) {
        disableWorldMap(world);
        UUID uuid = playerRef.getUuid();
        MazeSlotAllocator.Slot slot = MazeSlotAllocator.assignIfAbsent(uuid);
        boolean isFirstEntry = !MazeSlotAllocator.isSlotBuilt(slot.index);

        if (isFirstEntry) {
            placePrefabAtSlot(world, playerRef, slot);
            MazeSlotAllocator.markSlotBuilt(slot.index);
            // Teleport immediately on first entry, then again after a short delay to handle
            // cases where the player position is not yet settled on world join.
            teleportPlayerToSlotSpawn(world, playerRef, slot);
            scheduleOnWorldDelayed(world, () -> {
                if (playerRef.isValid()) {
                    teleportPlayerToSlotSpawn(world, playerRef, slot);
                    MazeSlotAllocator.applyViewRadius(world, playerRef, slot, true);
                    disableMazeMapForNonOp(world, playerRef);
                }
            }, 500);
        } else {
            // Repeated entry — restore view radius and map settings only.
            // Hytale will restore the player's last saved position automatically.
            scheduleOnWorldDelayed(world, () -> {
                if (playerRef.isValid()) {
                    MazeSlotAllocator.applyViewRadius(world, playerRef, slot, true);
                    disableMazeMapForNonOp(world, playerRef);
                }
            }, 500);
        }
    }

    private void disableMazeMapForNonOp(World world, PlayerRef playerRef) {
        try {
            PermissionsModule perms = PermissionsModule.get();
            if (perms == null) return;

            Set<String> groups = perms.getGroupsForUser(playerRef.getUuid());
            boolean isOp = groups != null && (groups.contains("op") || groups.contains("OP"));
            if (isOp) return;

            Ref<EntityStore> entityRef = playerRef.getReference();
            if (entityRef == null || !entityRef.isValid()) return;
            Store<EntityStore> store = entityRef.getStore();
            Player player = store.getComponent(entityRef, Player.getComponentType());
            if (player == null) return;

            WorldMapTracker tracker = player.getWorldMapTracker();
            if (tracker == null) return;
            tracker.setViewRadiusOverride(0);
            tracker.sendSettings(world);

        } catch (Throwable ignored) {
        }
    }

    private void placePrefabAtSlot(World world, PlayerRef playerRef, MazeSlotAllocator.Slot slot) {
        PrefabStore prefabStore = PrefabStore.get();
        Path prefabPath = prefabStore.getServerPrefabsPath().resolve(PREFAB_FILE);

        BlockSelection selection;
        try {
            selection = prefabStore.getPrefab(prefabPath);
        } catch (Exception e) {
            getLogger().atSevere().withCause(e).log("Failed to load prefab: %s", prefabPath);
            return;
        }

        int dx = slot.gx * SLOT_SIZE_XZ;
        int dz = slot.gz * SLOT_SIZE_XZ;
        selection.setPosition(dx, 0, dz);

        Ref<EntityStore> entityRef = playerRef.getReference();
        if (entityRef == null || !entityRef.isValid()) return;
        Store<EntityStore> store = entityRef.getStore();
        ComponentAccessor<EntityStore> accessor = store;
        selection.placeNoReturn("maze_slots_place", playerRef, FeedbackConsumer.DEFAULT, world, accessor);
    }

    private void teleportPlayerToSlotSpawn(World world, PlayerRef playerRef, MazeSlotAllocator.Slot slot) {
        Ref<EntityStore> entityRef = playerRef.getReference();
        if (entityRef == null || !entityRef.isValid()) return;
        Store<EntityStore> store = entityRef.getStore();

        double spawnX = MazeSlotAllocator.spawnX(slot);
        double spawnY = MazeSlotAllocator.spawnY();
        double spawnZ = MazeSlotAllocator.spawnZ(slot);

        TransformComponent tc = store.getComponent(entityRef, TransformComponent.getComponentType());
        Rotation3f rot = tc != null ? new Rotation3f(tc.getRotation()) : new Rotation3f(Rotation3f.IDENTITY);

        Teleport teleport = Teleport.createExact(
            new Vector3d(spawnX, spawnY, spawnZ),
            rot
        ).withoutVelocityReset();

        store.addComponent(entityRef, Teleport.getComponentType(), teleport);
    }

    private void scheduleOnWorld(World world, Runnable task) {
        CompletableFuture.runAsync(task, world);
    }

    private void scheduleOnWorldDelayed(World world, Runnable task, long delayMs) {
        CompletableFuture.runAsync(() -> {
            try {
                Thread.sleep(delayMs);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
            CompletableFuture.runAsync(task, world);
        });
    }
}

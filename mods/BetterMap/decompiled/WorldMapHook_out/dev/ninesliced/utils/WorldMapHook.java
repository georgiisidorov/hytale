// 
// Decompiled by Procyon v0.6.0
// 

package dev.ninesliced.utils;

import com.hypixel.hytale.server.core.command.system.CommandSender;
import java.util.NoSuchElementException;
import dev.ninesliced.managers.MapExpansionManager;
import java.util.concurrent.ConcurrentHashMap;
import java.lang.reflect.Field;
import com.hypixel.hytale.component.Holder;
import dev.ninesliced.configs.PlayerConfig;
import dev.ninesliced.managers.PlayerConfigManager;
import com.hypixel.hytale.server.core.asset.type.gameplay.WorldMapConfig;
import com.hypixel.hytale.protocol.packets.worldmap.UpdateWorldMapSettings;
import java.lang.reflect.Method;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import java.util.function.Consumer;
import java.util.Objects;
import java.util.List;
import com.hypixel.hytale.protocol.ToClientPacket;
import com.hypixel.hytale.protocol.packets.worldmap.MapMarker;
import com.hypixel.hytale.protocol.packets.worldmap.UpdateWorldMap;
import com.hypixel.hytale.protocol.packets.worldmap.MapImage;
import java.util.Comparator;
import com.hypixel.hytale.protocol.packets.worldmap.MapChunk;
import dev.ninesliced.exploration.ExplorationTicker;
import com.hypixel.hytale.math.util.MathUtil;
import javax.annotation.Nullable;
import java.util.ArrayList;
import dev.ninesliced.managers.CaveModeManager;
import com.hypixel.hytale.server.core.universe.world.worldmap.WorldMapSettings;
import com.hypixel.hytale.server.core.universe.world.worldmap.WorldMapManager;
import dev.ninesliced.managers.WorldBorderManager;
import dev.ninesliced.configs.ModConfig;
import com.hypixel.hytale.math.vector.Vector3d;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import dev.ninesliced.managers.ChunkStreamingManager;
import com.hypixel.hytale.math.iterator.CircleSpiralIterator;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.universe.world.World;
import dev.ninesliced.exploration.ExplorationTracker;
import com.hypixel.hytale.server.core.universe.world.WorldMapTracker;
import com.hypixel.hytale.server.core.entity.entities.Player;
import java.util.Iterator;
import java.util.Collection;
import dev.ninesliced.managers.ExplorationManager;
import javax.annotation.Nonnull;
import java.util.Collections;
import java.util.HashSet;
import java.util.concurrent.ConcurrentLinkedQueue;
import dev.ninesliced.providers.CaveModeImageBuilder;
import java.util.concurrent.CompletableFuture;
import java.util.Set;
import java.util.Map;
import java.util.logging.Logger;

public class WorldMapHook
{
    private static final Logger LOGGER;
    private static final Map<String, Set<Long>> caveModeLoadedChunks;
    private static final Map<String, Set<Long>> caveModeFailedChunks;
    private static final Map<String, Set<Long>> caveModeTargetChunks;
    private static final Map<String, Set<Long>> caveModePendingChunks;
    private static final Map<String, CompletableFuture<CaveModeImageBuilder>> pendingCaveModeFutures;
    private static final Map<String, Integer> caveModeRetryCounter;
    private static final Map<String, Integer> caveModeLastSharedCount;
    private static final Map<String, Boolean> caveModeLastShareEnabled;
    private static final Map<String, Set<Long>> sharedCaveExploredChunks;
    private static final Map<String, ConcurrentLinkedQueue<Runnable>> pendingTrackerModifications;
    private static final Set<String> pendingJoinRefresh;
    
    private static Set<Long> getCaveModeLoadedChunks(final String playerName) {
        return WorldMapHook.caveModeLoadedChunks.computeIfAbsent(playerName, k -> Collections.synchronizedSet(new HashSet<Long>()));
    }
    
    private static Set<Long> getCaveModeFailedChunks(final String playerName) {
        return WorldMapHook.caveModeFailedChunks.computeIfAbsent(playerName, k -> Collections.synchronizedSet(new HashSet<Long>()));
    }
    
    private static Set<Long> getCaveModeTargetChunks(final String playerName) {
        return WorldMapHook.caveModeTargetChunks.computeIfAbsent(playerName, k -> Collections.synchronizedSet(new HashSet<Long>()));
    }
    
    private static Set<Long> getCaveModePendingChunks(final String playerName) {
        return WorldMapHook.caveModePendingChunks.computeIfAbsent(playerName, k -> Collections.synchronizedSet(new HashSet<Long>()));
    }
    
    private static Set<Long> getSharedCaveExploredChunks(@Nonnull final String worldName) {
        return WorldMapHook.sharedCaveExploredChunks.computeIfAbsent(worldName, k -> Collections.synchronizedSet(new HashSet<Long>()));
    }
    
    private static Set<Long> getHydratedSharedCaveExploredChunks(@Nonnull final String worldName) {
        final Set<Long> shared = getSharedCaveExploredChunks(worldName);
        if (shared.isEmpty()) {
            final Set<Long> allKnown = ExplorationManager.getInstance().getAllExploredCaveChunks(worldName);
            if (!allKnown.isEmpty()) {
                shared.addAll(allKnown);
            }
        }
        return shared;
    }
    
    public static void clearSharedCaveExplorationCache() {
        WorldMapHook.sharedCaveExploredChunks.clear();
    }
    
    public static void clearCaveModeLoadedChunks(final String playerName) {
        final Set<Long> chunks = WorldMapHook.caveModeLoadedChunks.get(playerName);
        if (chunks != null) {
            chunks.clear();
        }
        final Set<Long> failed = WorldMapHook.caveModeFailedChunks.get(playerName);
        if (failed != null) {
            failed.clear();
        }
        final Set<Long> targets = WorldMapHook.caveModeTargetChunks.get(playerName);
        if (targets != null) {
            targets.clear();
        }
        final Set<Long> pending = WorldMapHook.caveModePendingChunks.get(playerName);
        if (pending != null) {
            for (Long idx : pending) {
                WorldMapHook.pendingCaveModeFutures.remove(playerName + "_" + idx);
            }
            pending.clear();
        }
        WorldMapHook.caveModeRetryCounter.remove(playerName);
        WorldMapHook.caveModeLastSharedCount.remove(playerName);
        WorldMapHook.caveModeLastShareEnabled.remove(playerName);
        WorldMapHook.pendingTrackerModifications.remove(playerName);
        WorldMapHook.pendingJoinRefresh.remove(playerName);
    }
    
    public static void removeCaveModePlayer(final String playerName) {
        final Set<Long> pending = WorldMapHook.caveModePendingChunks.get(playerName);
        if (pending != null) {
            for (Long idx : pending) {
                WorldMapHook.pendingCaveModeFutures.remove(playerName + "_" + idx);
            }
        }
        WorldMapHook.caveModeLoadedChunks.remove(playerName);
        WorldMapHook.caveModeFailedChunks.remove(playerName);
        WorldMapHook.caveModeTargetChunks.remove(playerName);
        WorldMapHook.caveModePendingChunks.remove(playerName);
        WorldMapHook.caveModeRetryCounter.remove(playerName);
        WorldMapHook.caveModeLastSharedCount.remove(playerName);
        WorldMapHook.caveModeLastShareEnabled.remove(playerName);
        WorldMapHook.pendingTrackerModifications.remove(playerName);
        WorldMapHook.pendingJoinRefresh.remove(playerName);
    }
    
    public static void hookPlayerMapTracker(@Nonnull final Player player, @Nonnull final WorldMapTracker tracker) {
        try {
            ReflectionHelper.setFieldValueRecursive(tracker, "viewRadiusOverride", 999);
            final World world = player.getWorld();
            if (world != null) {
                sendMapSettingsToPlayer(player);
            }
            final ExplorationTracker.PlayerExplorationData explorationData = ExplorationTracker.getInstance().getOrCreatePlayerData(player);
            final RestrictedSpiralIterator customIterator = new RestrictedSpiralIterator(explorationData, tracker);
            ReflectionHelper.setFieldValueRecursive(tracker, "spiralIterator", customIterator);
            final String playerName = player.getDisplayName();
            WorldMapHook.pendingJoinRefresh.add(playerName);
            WorldMapHook.pendingTrackerModifications.computeIfAbsent(playerName, k -> new ConcurrentLinkedQueue<Runnable>()).add(() -> {
                WorldMapHook.LOGGER.info("[MAP REFRESH] Running queued join refresh for " + playerName);
                sendMapSettingsToPlayer(player);
            });
            try {
                ReflectionHelper.setFieldValueRecursive(tracker, "updateTimer", 0.0f);
            }
            catch (final Exception ex) {}
            WorldMapHook.LOGGER.info("Hooked map tracker for player: " + player.getDisplayName());
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.warning("Failed to hook WorldMapTracker for player " + player.getDisplayName() + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public static void unhookPlayerMapTracker(@Nonnull final Player player, @Nonnull final WorldMapTracker tracker) {
        try {
            final Object spiralIterator = ReflectionHelper.getFieldValueRecursive(tracker, "spiralIterator");
            if (spiralIterator instanceof final RestrictedSpiralIterator restrictedSpiralIterator) {
                restrictedSpiralIterator.stop();
            }
            int mapChunkX = 0;
            int mapChunkZ = 0;
            final Ref<EntityStore> ref = (Ref<EntityStore>)player.getReference();
            if (ref != null && ref.isValid()) {
                final TransformComponent tc = (TransformComponent)ref.getStore().getComponent((Ref)ref, TransformComponent.getComponentType());
                if (tc != null) {
                    final Vector3d pos = tc.getPosition();
                    mapChunkX = (int)Math.floor(pos.x) >> 5;
                    mapChunkZ = (int)Math.floor(pos.z) >> 5;
                }
            }
            final CircleSpiralIterator vanillaIterator = new CircleSpiralIterator();
            vanillaIterator.init(mapChunkX, mapChunkZ, 0, 999);
            ReflectionHelper.setFieldValueRecursive(tracker, "spiralIterator", vanillaIterator);
            ReflectionHelper.setFieldValueRecursive(tracker, "viewRadiusOverride", null);
            try {
                final Object pendingReloadFutures = ReflectionHelper.getFieldValueRecursive(tracker, "pendingReloadFutures");
                if (pendingReloadFutures instanceof final Map map) {
                    map.clear();
                }
            }
            catch (final Exception e) {
                WorldMapHook.LOGGER.fine("Could not clear pendingReloadFutures: " + e.getMessage());
            }
            try {
                final Object pendingReloadChunks = ReflectionHelper.getFieldValueRecursive(tracker, "pendingReloadChunks");
                if (pendingReloadChunks instanceof final Set set) {
                    set.clear();
                }
            }
            catch (final Exception e) {
                WorldMapHook.LOGGER.fine("Could not clear pendingReloadChunks: " + e.getMessage());
            }
            try {
                ReflectionHelper.setFieldValueRecursive(tracker, "updateTimer", 999.0f);
            }
            catch (final Exception ex) {}
            ChunkStreamingManager.getInstance().removeState(player.getDisplayName());
            WorldMapHook.LOGGER.info("Unhooked map tracker for player: " + player.getDisplayName() + " at map chunk (" + mapChunkX + ", " + mapChunkZ);
        }
        catch (final Exception e2) {
            WorldMapHook.LOGGER.warning("Error unhooking tracker for " + player.getDisplayName() + ": " + e2.getMessage());
        }
    }
    
    public static void restoreVanillaMapTracker(@Nonnull final Player player, @Nonnull final WorldMapTracker tracker) {
        try {
            final Object spiralIterator = ReflectionHelper.getFieldValueRecursive(tracker, "spiralIterator");
            if (spiralIterator instanceof final RestrictedSpiralIterator restrictedSpiralIterator) {
                restrictedSpiralIterator.stop();
            }
            ReflectionHelper.setFieldValueRecursive(tracker, "viewRadiusOverride", null);
            int mapChunkX = 0;
            int mapChunkZ = 0;
            final Ref<EntityStore> ref = (Ref<EntityStore>)player.getReference();
            if (ref != null && ref.isValid()) {
                final TransformComponent tc = (TransformComponent)ref.getStore().getComponent((Ref)ref, TransformComponent.getComponentType());
                if (tc != null) {
                    final Vector3d pos = tc.getPosition();
                    mapChunkX = (int)Math.floor(pos.x) >> 5;
                    mapChunkZ = (int)Math.floor(pos.z) >> 5;
                }
            }
            final CircleSpiralIterator vanillaIterator = new CircleSpiralIterator();
            vanillaIterator.init(mapChunkX, mapChunkZ, 0, 999);
            ReflectionHelper.setFieldValueRecursive(tracker, "spiralIterator", vanillaIterator);
            ReflectionHelper.setFieldValueRecursive(tracker, "updateTimer", 0.0f);
            WorldMapHook.LOGGER.info("Restored vanilla map tracker for player: " + player.getDisplayName() + " at map chunk (" + mapChunkX + ", " + mapChunkZ);
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.warning("Failed to restore vanilla tracker for " + player.getDisplayName() + ": " + e.getMessage());
        }
    }
    
    public static void hookWorldMapResolution(@Nonnull final World world) {
        try {
            WorldMapHook.LOGGER.info("Hooking WorldMap resolution for world: " + world.getName());
            final WorldMapManager manager = world.getWorldMapManager();
            WorldMapHook.LOGGER.info("Modifying WorldMapSettings for world: " + world.getName());
            final WorldMapSettings settings = manager.getWorldMapSettings();
            final ModConfig.MapQuality quality = ModConfig.getInstance().getActiveMapQuality();
            ReflectionHelper.setFieldValueRecursive(settings, "imageScale", quality.scale);
            manager.clearImages();
            WorldBorderManager.getInstance().hookWorldMapManager(world);
            WorldMapHook.LOGGER.info("Modified WorldMapSettings imageScale to " + quality.scale + " (" + String.valueOf(quality) + " quality) for world: " + world.getName());
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.warning("Failed to hook WorldMap resolution: " + e.getMessage());
        }
    }
    
    public static void updateExplorationState(@Nonnull final Player player, @Nonnull final WorldMapTracker tracker, final double x, final double z) {
        try {
            final ConcurrentLinkedQueue<Runnable> pendingMods = WorldMapHook.pendingTrackerModifications.get(player.getDisplayName());
            if (pendingMods != null) {
                Runnable mod;
                while ((mod = pendingMods.poll()) != null) {
                    try {
                        mod.run();
                    }
                    catch (final Exception e) {
                        WorldMapHook.LOGGER.fine("[CAVE] Error applying pending tracker mod: " + e.getMessage());
                    }
                }
            }
            final ExplorationTracker explorationTracker = ExplorationTracker.getInstance();
            ExplorationTracker.PlayerExplorationData explorationData = explorationTracker.getPlayerData(player);
            if (explorationData == null) {
                explorationData = explorationTracker.getOrCreatePlayerData(player);
                if (explorationData == null) {
                    WorldMapHook.LOGGER.warning("[DEBUG] Could not create exploration data for " + player.getDisplayName());
                    return;
                }
            }
            final World world = player.getWorld();
            if (world != null) {
                explorationData.setWorldName(world.getName());
            }
            final int playerChunkX = ChunkUtil.blockToChunkCoord(x);
            final int playerChunkZ = ChunkUtil.blockToChunkCoord(z);
            final boolean hasMoved = explorationData.hasMovedToNewChunk(playerChunkX, playerChunkZ);
            final Ref<EntityStore> playerRef = (Ref<EntityStore>)player.getReference();
            final TransformComponent transform = (playerRef != null && playerRef.isValid()) ? ((TransformComponent)playerRef.getStore().getComponent((Ref)playerRef, TransformComponent.getComponentType())) : null;
            final int playerY = (transform != null) ? ((int)transform.getPosition().y) : 100;
            final boolean hasCeiling = checkForCeiling(world, player, x, playerY, z);
            final CaveModeManager caveManager = CaveModeManager.getInstance();
            final boolean caveModeGloballyEnabled = ModConfig.getInstance().isCaveModeEnabled();
            boolean stateChanged = false;
            boolean isUnderground = false;
            if (caveModeGloballyEnabled) {
                stateChanged = caveManager.updateUndergroundState(player, playerY, hasCeiling);
                isUnderground = caveManager.isPlayerUnderground(player);
            }
            final boolean discoverSurfaceUnderground = ModConfig.getInstance().isDiscoverSurfaceUnderground();
            if (hasMoved && (!caveModeGloballyEnabled || !isUnderground || discoverSurfaceUnderground)) {
                final int explorationRadius = ModConfig.getInstance().getExplorationRadius();
                final int beforeCount = explorationData.getExploredChunks().getExploredCount();
                explorationData.getMapExpansion().updateBoundaries(playerChunkX, playerChunkZ, explorationRadius);
                explorationData.setLastChunkPosition(playerChunkX, playerChunkZ);
                final int afterCount = explorationData.getExploredChunks().getExploredCount();
                if (afterCount > beforeCount) {
                    WorldMapHook.LOGGER.info("[EXPLORATION] Added " + (afterCount - beforeCount) + " new surface chunks. Total: " + afterCount);
                }
            }
            if (caveModeGloballyEnabled) {
                if (stateChanged && world != null) {
                    final CaveModeManager.DynamicCaveModeState state = caveManager.getState(player);
                    final boolean fogOfWar = ModConfig.getInstance().isCaveFogOfWar();
                    if (isUnderground) {
                        WorldMapHook.LOGGER.info("[DYNAMIC CAVE] Activating cave overlay for " + player.getDisplayName() + " at layer " + state.getCurrentLayer() + "-" + (state.getCurrentLayer() + state.getLayerSize()));
                        if (fogOfWar) {
                            WorldMapHook.LOGGER.info("[DYNAMIC CAVE] Fog of war enabled - refreshing map for cave entry");
                            forceFullMapRefresh(player);
                        }
                    }
                    else {
                        WorldMapHook.LOGGER.info("[DYNAMIC CAVE] Deactivating cave overlay for " + player.getDisplayName());
                        if (fogOfWar) {
                            WorldMapHook.LOGGER.info("[DYNAMIC CAVE] Fog of war enabled - refreshing map for cave exit");
                            forceFullMapRefresh(player);
                        }
                        else {
                            clearCaveModeOverlay(player, world, tracker);
                        }
                    }
                }
                final boolean layerChanged = caveManager.didLayerChange(player);
                if (layerChanged && isUnderground && world != null) {
                    final CaveModeManager.DynamicCaveModeState state2 = caveManager.getState(player);
                    final int previousLayer = caveManager.getPreviousLayer(player);
                    final int currentLayer = state2.getCurrentLayer();
                    WorldMapHook.LOGGER.info("[DYNAMIC CAVE] Layer change: " + previousLayer + " -> " + currentLayer + ". Will regenerate cave images for new Y level.");
                    state2.setNeedsLayerRefresh(true);
                    final String playerName = player.getDisplayName();
                    for (Long pendingIdx : new ArrayList<Long>(state2.getPendingCaveChunks())) {
                        WorldMapHook.pendingCaveModeFutures.remove(playerName + "_" + pendingIdx);
                    }
                    state2.getPendingCaveChunks().clear();
                }
                if (isUnderground && world != null) {
                    final CaveModeManager.DynamicCaveModeState state2 = caveManager.getState(player);
                    scheduleCaveOverlayUpdate(player, world, tracker, x, z, state2);
                    return;
                }
            }
            if (hasMoved) {
                forceTrackerUpdate(player, tracker, x, z);
                final int mapChunkX = playerChunkX >> 1;
                final int mapChunkZ = playerChunkZ >> 1;
                manageLoadedChunks(player, tracker, mapChunkX, mapChunkZ);
            }
        }
        catch (final Exception e2) {
            WorldMapHook.LOGGER.warning("[DEBUG] Exception in updateExplorationState: " + e2.getMessage());
            e2.printStackTrace();
        }
    }
    
    private static boolean checkForCeiling(@Nullable final World world, @Nullable final Player player, final double x, final int y, final double z) {
        if (world == null) {
            return false;
        }
        int threshold = CaveModeManager.getConfigUndergroundThreshold();
        if (player != null) {
            final CaveModeManager.DynamicCaveModeState state = CaveModeManager.getInstance().getState(player);
            if (state != null) {
                threshold = state.getUndergroundThreshold();
            }
        }
        return y < threshold;
    }
    
    private static void scheduleCaveOverlayUpdate(@Nonnull final Player player, @Nonnull final World world, @Nonnull final WorldMapTracker tracker, final double playerX, final double playerZ, @Nonnull final CaveModeManager.DynamicCaveModeState state) {
        if (state.isCaveProcessingInProgress()) {
            return;
        }
        final boolean fogOfWar = ModConfig.getInstance().isCaveFogOfWar();
        final Object spiralIterator = ReflectionHelper.getFieldValueRecursive(tracker, "spiralIterator");
        if (spiralIterator instanceof final RestrictedSpiralIterator restrictedIterator) {
            restrictedIterator.setCaveModeActive(fogOfWar);
        }
        final WorldMapSettings settings = world.getWorldMapManager().getWorldMapSettings();
        final float imageScale = settings.getImageScale();
        final int imageSize = MathUtil.fastFloor(32.0f * imageScale);
        final Object loadedObj = ReflectionHelper.getFieldValueRecursive(tracker, "loaded");
        final Set<Long> trackerLoaded = (loadedObj instanceof Set) ? ((Set)loadedObj) : null;
        state.setCaveProcessingInProgress(true);
        ExplorationTicker.getInstance().scheduleUpdate(() -> {
            try {
                processCaveOverlayAsync(player, world, tracker, trackerLoaded, playerX, playerZ, state, imageSize);
            }
            finally {
                state.setCaveProcessingInProgress(false);
            }
        });
    }
    
    private static void processCaveOverlayAsync(@Nonnull final Player player, @Nonnull final World world, @Nonnull final WorldMapTracker tracker, @Nullable final Set<Long> trackerLoaded, final double playerX, final double playerZ, @Nonnull final CaveModeManager.DynamicCaveModeState state, final int imageSize) {
        try {
            final int playerMapChunkX = (int)Math.floor(playerX) >> 5;
            final int playerMapChunkZ = (int)Math.floor(playerZ) >> 5;
            final long nowMs = System.currentTimeMillis();
            final boolean movedMapChunk = playerMapChunkX != state.getLastOverlayMapChunkX() || playerMapChunkZ != state.getLastOverlayMapChunkZ();
            final boolean needsRefresh = state.needsLayerRefresh();
            final boolean hasPending = !state.getPendingCaveChunks().isEmpty();
            if (!movedMapChunk && !needsRefresh && !hasPending) {
                final long lastUpdate = state.getLastOverlayUpdateMs();
                if (nowMs - lastUpdate < 200L) {
                    return;
                }
            }
            state.setLastOverlayUpdateMs(nowMs);
            state.setLastOverlayMapChunk(playerMapChunkX, playerMapChunkZ);
            final int caveRadius = state.getCaveRadius();
            final int yLevel = state.getRenderYLevel();
            final int verticalRange = state.getVerticalRange();
            final int maxChunks = ModConfig.getInstance().getActiveMapQuality().maxChunks;
            final boolean shareCaves = ModConfig.getInstance().isShareAllExploration();
            final Set<Long> loadedCaveChunks = state.getLoadedCaveChunks();
            final Set<Long> pendingCaveChunks = state.getPendingCaveChunks();
            final Set<Long> exploredCaveChunks = state.getExploredCaveChunks();
            final Set<Long> sharedExplored = shareCaves ? getHydratedSharedCaveExploredChunks(world.getName()) : null;
            if (shareCaves && sharedExplored != null && !exploredCaveChunks.isEmpty()) {
                sharedExplored.addAll(exploredCaveChunks);
            }
            final String playerName = player.getDisplayName();
            final Set<Long> failedChunks = getCaveModeFailedChunks(playerName);
            final List<MapChunk> chunksToSend = new ArrayList<MapChunk>();
            final Set<Long> trackerToAdd = new HashSet<Long>();
            final Set<Long> trackerToRemove = new HashSet<Long>();
            boolean shareModeChanged = false;
            final Boolean previousShareEnabled = WorldMapHook.caveModeLastShareEnabled.get(playerName);
            if (previousShareEnabled == null || previousShareEnabled != shareCaves) {
                shareModeChanged = true;
            }
            WorldMapHook.caveModeLastShareEnabled.put(playerName, shareCaves);
            boolean sharedChanged = false;
            if (shareCaves && sharedExplored != null) {
                final int currentSharedCount = sharedExplored.size();
                final int previousSharedCount = WorldMapHook.caveModeLastSharedCount.getOrDefault(playerName, -1);
                sharedChanged = (previousSharedCount != currentSharedCount);
                WorldMapHook.caveModeLastSharedCount.put(playerName, currentSharedCount);
            }
            else {
                WorldMapHook.caveModeLastSharedCount.remove(playerName);
            }
            for (Long pendingIdx : new ArrayList<Long>(pendingCaveChunks)) {
                final CompletableFuture<CaveModeImageBuilder> future = WorldMapHook.pendingCaveModeFutures.get(playerName + "_" + pendingIdx);
                if (future == null) {
                    pendingCaveChunks.remove(pendingIdx);
                }
                else if (future.isDone()) {
                    pendingCaveChunks.remove(pendingIdx);
                    WorldMapHook.pendingCaveModeFutures.remove(playerName + "_" + pendingIdx);
                    final CaveModeImageBuilder builder = future.getNow(null);
                    if (builder != null && builder.getImage() != null && builder.getImage().data != null) {
                        final int mx = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)pendingIdx);
                        final int mz = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)pendingIdx);
                        chunksToSend.add(new MapChunk(mx, mz, builder.getImage()));
                        loadedCaveChunks.add(pendingIdx);
                        trackerToAdd.add(pendingIdx);
                        if (shareCaves && sharedExplored != null) {
                            sharedExplored.add(pendingIdx);
                        }
                        failedChunks.remove(pendingIdx);
                    }
                    else {
                        failedChunks.add(pendingIdx);
                    }
                }
                else {
                    if (!future.isCompletedExceptionally()) {
                        continue;
                    }
                    pendingCaveChunks.remove(pendingIdx);
                    WorldMapHook.pendingCaveModeFutures.remove(playerName + "_" + pendingIdx);
                    failedChunks.add(pendingIdx);
                }
            }
            final boolean needsTargetRecompute = movedMapChunk || needsRefresh || shareModeChanged || sharedChanged || state.getCachedTargetChunks() == null;
            long idx = 0L;
            Set<Long> targetCaveChunks;
            if (needsTargetRecompute) {
                final int caveRadiusSq = caveRadius * caveRadius;
                final int scanRadius = caveRadius + 2;
                final int scanRadiusSq = scanRadius * scanRadius;
                final Set<Long> candidateSet = new HashSet<Long>();
                final List<long[]> candidateChunksWithDist = new ArrayList<long[]>();
                for (int dx = -scanRadius; dx <= scanRadius; ++dx) {
                    for (int dz = -scanRadius; dz <= scanRadius; ++dz) {
                        final int dist2 = dx * dx + dz * dz;
                        if (dist2 <= scanRadiusSq) {
                            final int mx2 = playerMapChunkX + dx;
                            final int mz2 = playerMapChunkZ + dz;
                            idx = com.hypixel.hytale.math.util.ChunkUtil.indexChunk(mx2, mz2);
                            final boolean inImmediateRadius = dist2 <= caveRadiusSq;
                            final boolean explored = inImmediateRadius || exploredCaveChunks.contains(idx) || (shareCaves && sharedExplored != null && sharedExplored.contains(idx));
                            if (explored) {
                                candidateSet.add(idx);
                                candidateChunksWithDist.add(new long[] { idx, dist2 });
                                if (inImmediateRadius) {
                                    state.markCaveChunkExplored(idx);
                                    if (shareCaves && sharedExplored != null) {
                                        sharedExplored.add(idx);
                                    }
                                }
                            }
                        }
                    }
                }
                for (final Long exploredIdx : exploredCaveChunks) {
                    if (!candidateSet.contains(exploredIdx)) {
                        candidateSet.add(exploredIdx);
                        final int mx3 = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)exploredIdx);
                        final int mz3 = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)exploredIdx);
                        final long ddx = mx3 - (long)playerMapChunkX;
                        final long ddz = mz3 - (long)playerMapChunkZ;
                        candidateChunksWithDist.add(new long[] { exploredIdx, ddx * ddx + ddz * ddz });
                    }
                }
                if (shareCaves && sharedExplored != null) {
                    for (final Long sharedIdx : sharedExplored) {
                        if (!candidateSet.contains(sharedIdx)) {
                            candidateSet.add(sharedIdx);
                            final int mx3 = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)sharedIdx);
                            final int mz3 = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)sharedIdx);
                            final long ddx = mx3 - (long)playerMapChunkX;
                            final long ddz = mz3 - (long)playerMapChunkZ;
                            candidateChunksWithDist.add(new long[] { sharedIdx, ddx * ddx + ddz * ddz });
                        }
                    }
                }
                candidateChunksWithDist.sort(Comparator.comparingLong(a -> a[1]));
                final int caveChunksAllowed = maxChunks * 3 / 4;
                final int targetCount = Math.min(candidateChunksWithDist.size(), caveChunksAllowed);
                targetCaveChunks = new HashSet<Long>(targetCount * 2);
                final List<Long> sortedTargets = new ArrayList<Long>(targetCount);
                for (int i = 0; i < targetCount; ++i) {
                    final long chunkId = candidateChunksWithDist.get(i)[0];
                    targetCaveChunks.add(chunkId);
                    sortedTargets.add(chunkId);
                }
                state.setCachedTargetChunks(targetCaveChunks);
                state.setCachedTargetSorted(sortedTargets);
                state.setCachedTargetPosition(playerMapChunkX, playerMapChunkZ);
            }
            else {
                targetCaveChunks = state.getCachedTargetChunks();
            }
            List<Long> sortedTargets2 = state.getCachedTargetSorted();
            if (sortedTargets2 == null) {
                sortedTargets2 = new ArrayList<Long>(targetCaveChunks);
            }
            final List<MapChunk> chunksToUnload = new ArrayList<MapChunk>();
            for (final Long loadedIdx : new ArrayList<Long>(loadedCaveChunks)) {
                if (!targetCaveChunks.contains(loadedIdx)) {
                    loadedCaveChunks.remove(loadedIdx);
                    final int mx4 = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)loadedIdx);
                    final int mz4 = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)loadedIdx);
                    chunksToUnload.add(new MapChunk(mx4, mz4, (MapImage)null));
                    trackerToRemove.add(loadedIdx);
                }
            }
            if (needsRefresh) {
                WorldMapHook.LOGGER.info("[DYNAMIC CAVE] Refreshing chunks for new Y level: " + yLevel);
                for (Long chunkIdx : new ArrayList<Long>(loadedCaveChunks)) {
                    if (!targetCaveChunks.contains(chunkIdx)) {
                        continue;
                    }
                    if (pendingCaveChunks.contains(chunkIdx)) {
                        continue;
                    }
                    final CompletableFuture<CaveModeImageBuilder> future2 = CaveModeImageBuilder.build(chunkIdx, imageSize, imageSize, world, yLevel, verticalRange);
                    if (future2.isDone()) {
                        final CaveModeImageBuilder builder2 = future2.getNow(null);
                        if (builder2 == null || builder2.getImage() == null || builder2.getImage().data == null) {
                            continue;
                        }
                        final int mx5 = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)chunkIdx);
                        final int mz5 = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)chunkIdx);
                        chunksToSend.add(new MapChunk(mx5, mz5, builder2.getImage()));
                    }
                    else {
                        pendingCaveChunks.add(chunkIdx);
                        WorldMapHook.pendingCaveModeFutures.put(playerName + "_" + chunkIdx, future2);
                    }
                }
                state.setNeedsLayerRefresh(false);
            }
            final int MAX_PENDING_GENERATION = 20;
            final int currentPending = pendingCaveChunks.size();
            final int availableSlots = 20 - currentPending;
            if (availableSlots > 0) {
                int newGenerations = 0;
                int immediateLoads = 0;
                final int maxImmediateLoads = 4;
                for (Long chunkIdx2 : sortedTargets2) {
                    if (newGenerations >= availableSlots && immediateLoads >= maxImmediateLoads) {
                        break;
                    }
                    if (loadedCaveChunks.contains(chunkIdx2)) {
                        continue;
                    }
                    if (pendingCaveChunks.contains(chunkIdx2)) {
                        continue;
                    }
                    final CompletableFuture<CaveModeImageBuilder> future3 = CaveModeImageBuilder.build(chunkIdx2, imageSize, imageSize, world, yLevel, verticalRange);
                    if (future3.isDone() && immediateLoads < maxImmediateLoads) {
                        final CaveModeImageBuilder builder3 = future3.getNow(null);
                        if (builder3 != null && builder3.getImage() != null && builder3.getImage().data != null) {
                            final int mx6 = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)chunkIdx2);
                            final int mz6 = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)chunkIdx2);
                            chunksToSend.add(new MapChunk(mx6, mz6, builder3.getImage()));
                            loadedCaveChunks.add(chunkIdx2);
                            trackerToAdd.add(chunkIdx2);
                            if (shareCaves && sharedExplored != null) {
                                sharedExplored.add(chunkIdx2);
                            }
                            ++immediateLoads;
                            failedChunks.remove(chunkIdx2);
                        }
                        else {
                            failedChunks.add(chunkIdx2);
                        }
                    }
                    else {
                        if (future3.isDone() || newGenerations >= availableSlots) {
                            continue;
                        }
                        pendingCaveChunks.add(chunkIdx2);
                        WorldMapHook.pendingCaveModeFutures.put(playerName + "_" + chunkIdx2, future3);
                        ++newGenerations;
                    }
                }
            }
            Integer retryCounter = WorldMapHook.caveModeRetryCounter.get(playerName);
            if (retryCounter == null) {
                retryCounter = 0;
            }
            ++retryCounter;
            WorldMapHook.caveModeRetryCounter.put(playerName, retryCounter);
            if (retryCounter % 10 == 0 && !failedChunks.isEmpty()) {
                final int retryCount = Math.min(3, failedChunks.size());
                final Iterator<Long> failedIter = failedChunks.iterator();
                for (int i = 0; i < retryCount && failedIter.hasNext(); ++i) {
                    final Long failedIdx = failedIter.next();
                    if (targetCaveChunks.contains(failedIdx) && !loadedCaveChunks.contains(failedIdx) && !pendingCaveChunks.contains(failedIdx)) {
                        failedIter.remove();
                    }
                }
            }
            final Set<Long> globalTargetChunks = getCaveModeTargetChunks(playerName);
            globalTargetChunks.clear();
            globalTargetChunks.addAll(targetCaveChunks);
            final List<MapChunk> finalChunksToSend = chunksToSend;
            final List<MapChunk> finalChunksToUnload = chunksToUnload;
            final Set<Long> finalTrackerToAdd = trackerToAdd;
            final Set<Long> finalTrackerToRemove = trackerToRemove;
            if (trackerLoaded != null && (!finalTrackerToRemove.isEmpty() || !finalTrackerToAdd.isEmpty())) {
                final String pName = player.getDisplayName();
                final Set<Long> frozenCaveChunks = new HashSet<Long>(loadedCaveChunks);
                WorldMapHook.pendingTrackerModifications.computeIfAbsent(pName, k -> new ConcurrentLinkedQueue<Runnable>()).add(() -> {
                    for (final Long idx2 : finalTrackerToRemove) {
                        trackerLoaded.remove(idx2);
                    }
                    for (final Long idx3 : finalTrackerToAdd) {
                        trackerLoaded.add(idx3);
                    }
                    final int totalLoaded = trackerLoaded.size();
                    if (totalLoaded > maxChunks) {
                        final List<Long> surfaceToEvict = new ArrayList<Long>();
                        for (final Long idx4 : trackerLoaded) {
                            if (!frozenCaveChunks.contains(idx4)) {
                                surfaceToEvict.add(idx4);
                            }
                        }
                        surfaceToEvict.sort(Comparator.comparingLong(chunkIdx -> {
                            final int emx = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)chunkIdx);
                            final int emz = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)chunkIdx);
                            final long ddx2 = emx - (long)playerMapChunkX;
                            final long ddz2 = emz - (long)playerMapChunkZ;
                            return -(ddx2 * ddx2 + ddz2 * ddz2);
                        }));
                        for (int toRemove = totalLoaded - maxChunks, j = 0; j < toRemove && j < surfaceToEvict.size(); ++j) {
                            trackerLoaded.remove(surfaceToEvict.get(j));
                        }
                    }
                    return;
                });
            }
            if (!finalChunksToSend.isEmpty() || !finalChunksToUnload.isEmpty()) {
                world.execute(() -> {
                    try {
                        final Ref<EntityStore> ref = (Ref<EntityStore>)player.getReference();
                        if (ref != null && ref.isValid()) {
                            if (!finalChunksToUnload.isEmpty()) {
                                final UpdateWorldMap unloadPacket = new UpdateWorldMap((MapChunk[])finalChunksToUnload.toArray(new MapChunk[0]), (MapMarker[])null, (String[])null);
                                sendPacket(player, (ToClientPacket)unloadPacket);
                            }
                            if (!finalChunksToSend.isEmpty()) {
                                for (int batchSize = 15, k = 0; k < finalChunksToSend.size(); k += batchSize) {
                                    final int end = Math.min(k + batchSize, finalChunksToSend.size());
                                    final List<MapChunk> batch = finalChunksToSend.subList(k, end);
                                    final UpdateWorldMap packet = new UpdateWorldMap((MapChunk[])batch.toArray(new MapChunk[0]), (MapMarker[])null, (String[])null);
                                    sendPacket(player, (ToClientPacket)packet);
                                }
                            }
                        }
                    }
                    catch (final Exception e2) {
                        WorldMapHook.LOGGER.fine("[DYNAMIC CAVE] Error sending cave packets: " + e2.getMessage());
                    }
                });
            }
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.warning("[DYNAMIC CAVE] Error processing overlay async: " + e.getMessage());
        }
    }
    
    private static void clearCaveModeOverlay(@Nonnull final Player player, @Nonnull final World world, @Nonnull final WorldMapTracker tracker) {
        try {
            final CaveModeManager.DynamicCaveModeState state = CaveModeManager.getInstance().getState(player);
            if (state == null) {
                return;
            }
            final Set<Long> loadedCaveChunks = new HashSet<Long>(state.getLoadedCaveChunks());
            final String playerName = player.getDisplayName();
            for (Long pendingIdx : state.getPendingCaveChunks()) {
                WorldMapHook.pendingCaveModeFutures.remove(playerName + "_" + pendingIdx);
            }
            state.getPendingCaveChunks().clear();
            final Object loadedObj = ReflectionHelper.getFieldValueRecursive(tracker, "loaded");
            final Set<Long> trackerLoaded = (loadedObj instanceof Set) ? ((Set)loadedObj) : new HashSet<Long>();
            final List<MapChunk> chunksToUnload = new ArrayList<MapChunk>();
            for (final Long caveChunkIdx : loadedCaveChunks) {
                final int mx = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)caveChunkIdx);
                final int mz = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)caveChunkIdx);
                chunksToUnload.add(new MapChunk(mx, mz, (MapImage)null));
                trackerLoaded.remove(caveChunkIdx);
            }
            if (!chunksToUnload.isEmpty()) {
                for (int batchSize = 50, i = 0; i < chunksToUnload.size(); i += batchSize) {
                    final int end = Math.min(i + batchSize, chunksToUnload.size());
                    final List<MapChunk> batch = chunksToUnload.subList(i, end);
                    final UpdateWorldMap unloadPacket = new UpdateWorldMap((MapChunk[])batch.toArray(new MapChunk[0]), (MapMarker[])null, (String[])null);
                    sendPacket(player, (ToClientPacket)unloadPacket);
                }
                WorldMapHook.LOGGER.info("[DYNAMIC CAVE] Unloaded " + chunksToUnload.size() + " cave chunks for " + playerName);
            }
            state.clearLoadedCaveChunks();
            final Object spiralIterator = ReflectionHelper.getFieldValueRecursive(tracker, "spiralIterator");
            if (spiralIterator instanceof final RestrictedSpiralIterator restrictedIterator) {
                restrictedIterator.setCaveModeActive(false);
                restrictedIterator.resetState();
            }
            final Ref<EntityStore> playerRef = (Ref<EntityStore>)player.getReference();
            final TransformComponent transform = (playerRef != null && playerRef.isValid()) ? ((TransformComponent)playerRef.getStore().getComponent((Ref)playerRef, TransformComponent.getComponentType())) : null;
            if (transform != null) {
                final Vector3d pos = transform.getPosition();
                forceTrackerUpdate(player, tracker, pos.x, pos.z);
                final int playerChunkX = ChunkUtil.blockToChunkCoord(pos.x);
                final int playerChunkZ = ChunkUtil.blockToChunkCoord(pos.z);
                final int mapChunkX = playerChunkX >> 1;
                final int mapChunkZ = playerChunkZ >> 1;
                manageLoadedChunks(player, tracker, mapChunkX, mapChunkZ);
            }
            ReflectionHelper.setFieldValueRecursive(tracker, "updateTimer", 0.0f);
            WorldMapHook.LOGGER.info("[DYNAMIC CAVE] Cleared cave overlay and triggered normal map refresh for " + playerName);
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.warning("[DYNAMIC CAVE] Error clearing overlay: " + e.getMessage());
        }
    }
    
    private static void manageLoadedChunks(@Nonnull final Player player, @Nonnull final WorldMapTracker tracker, final int cx, final int cz) {
        try {
            final Object loadedObj = ReflectionHelper.getFieldValueRecursive(tracker, "loaded");
            if (!(loadedObj instanceof Set)) {
                return;
            }
            final Set<Long> loaded = (Set<Long>)loadedObj;
            final Object spiralIterator = ReflectionHelper.getFieldValueRecursive(tracker, "spiralIterator");
            if (!(spiralIterator instanceof RestrictedSpiralIterator)) {
                return;
            }
            final List<Long> targetChunks = ((RestrictedSpiralIterator)spiralIterator).getTargetMapChunks();
            final Set<Long> targetSet = new HashSet<Long>(targetChunks);
            final String playerName = player.getDisplayName();
            final ChunkStreamingManager streamingManager = ChunkStreamingManager.getInstance();
            final ChunkStreamingManager.ChunkDelta delta = streamingManager.computeDelta(playerName, targetSet, cx, cz);
            if (!delta.toLoad.isEmpty()) {
                streamingManager.queueChunksForLoading(playerName, delta.toLoad, cx, cz);
            }
            if (!delta.toUnload.isEmpty()) {
                streamingManager.queueChunksForUnloading(playerName, delta.toUnload);
            }
            streamingManager.processLoadQueue(player);
            final List<Long> loadedSnapshot = new ArrayList<Long>(loaded);
            final List<Long> toUnload = new ArrayList<Long>();
            final List<MapChunk> unloadPackets = new ArrayList<MapChunk>();
            for (final Long idx : loadedSnapshot) {
                if (!targetSet.contains(idx)) {
                    toUnload.add(idx);
                    final int mx = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)idx);
                    final int mz = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)idx);
                    unloadPackets.add(new MapChunk(mx, mz, (MapImage)null));
                }
            }
            if (toUnload.isEmpty()) {
                return;
            }
            final List<Long> list = toUnload;
            final Set<Long> obj = loaded;
            Objects.requireNonNull(obj);
            list.forEach(obj::remove);
            streamingManager.markChunksUnloaded(playerName, toUnload);
            final UpdateWorldMap packet = new UpdateWorldMap((MapChunk[])unloadPackets.toArray(new MapChunk[0]), (MapMarker[])null, (String[])null);
            sendPacket(player, (ToClientPacket)packet);
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.warning("Failed to manage loaded chunks: " + e.getMessage());
        }
    }
    
    private static void sendPacket(final Player player, final ToClientPacket packet) {
        if (player == null || packet == null) {
            return;
        }
        try {
            final Ref<EntityStore> ref = (Ref<EntityStore>)player.getReference();
            if (ref == null || !ref.isValid()) {
                return;
            }
            final Store<EntityStore> store = (Store<EntityStore>)ref.getStore();
            final PlayerRef playerRef = (PlayerRef)store.getComponent((Ref)ref, PlayerRef.getComponentType());
            if (playerRef == null) {
                return;
            }
            playerRef.getPacketHandler().write(packet);
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.warning("Failed to send world map packet to " + player.getDisplayName() + ": " + e.getMessage());
        }
    }
    
    private static void forceTrackerUpdate(@Nonnull final Player player, @Nonnull final WorldMapTracker tracker, final double x, final double z) {
        try {
            final Object spiralIterator = ReflectionHelper.getFieldValueRecursive(tracker, "spiralIterator");
            if (spiralIterator instanceof final RestrictedSpiralIterator restrictedIterator) {
                final int chunkX = (int)Math.floor(x) >> 5;
                final int chunkZ = (int)Math.floor(z) >> 5;
                restrictedIterator.init(chunkX, chunkZ, 0, 999);
            }
            ReflectionHelper.setFieldValueRecursive(tracker, "updateTimer", 0.0f);
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.warning("[DEBUG] Failed to force tracker update: " + e.getMessage());
        }
    }
    
    public static void forceFullMapRefresh(@Nonnull final Player player) {
        try {
            final World world = player.getWorld();
            if (world == null) {
                return;
            }
            final WorldMapTracker tracker = player.getWorldMapTracker();
            if (tracker == null) {
                return;
            }
            final CaveModeManager caveManager = CaveModeManager.getInstance();
            final boolean isUnderground = caveManager.isPlayerUnderground(player);
            final boolean fogOfWar = ModConfig.getInstance().isCaveFogOfWar();
            final boolean caveModeEnabled = ModConfig.getInstance().isCaveModeEnabled();
            WorldMapHook.LOGGER.info("[MAP REFRESH] Starting full map refresh for " + player.getDisplayName() + " (underground: " + isUnderground + ", fogOfWar: " + fogOfWar);
            final String playerName = player.getDisplayName();
            clearCaveModeLoadedChunks(playerName);
            final CaveModeManager.DynamicCaveModeState state = caveManager.getState(player);
            if (state != null) {
                state.clearLoadedCaveChunks();
                state.getPendingCaveChunks().clear();
            }
            try {
                final Object pendingReloadChunks = ReflectionHelper.getFieldValueRecursive(tracker, "pendingReloadChunks");
                if (pendingReloadChunks != null) {
                    final Method clearMethod = pendingReloadChunks.getClass().getMethod("clear", (Class<?>[])new Class[0]);
                    clearMethod.invoke(pendingReloadChunks, new Object[0]);
                    WorldMapHook.LOGGER.info("[MAP REFRESH] Cleared pendingReloadChunks");
                }
                final Object pendingReloadFutures = ReflectionHelper.getFieldValueRecursive(tracker, "pendingReloadFutures");
                if (pendingReloadFutures != null) {
                    final Method clearMethod2 = pendingReloadFutures.getClass().getMethod("clear", (Class<?>[])new Class[0]);
                    clearMethod2.invoke(pendingReloadFutures, new Object[0]);
                    WorldMapHook.LOGGER.info("[MAP REFRESH] Cleared pendingReloadFutures");
                }
            }
            catch (final Exception e) {
                WorldMapHook.LOGGER.fine("[MAP REFRESH] Could not clear pending reload state: " + e.getMessage());
            }
            try {
                final Object loadedObj = ReflectionHelper.getFieldValueRecursive(tracker, "loaded");
                if (loadedObj instanceof final Set loadedSet) {
                    loadedSet.clear();
                    WorldMapHook.LOGGER.info("[MAP REFRESH] Cleared loaded map chunk cache");
                }
            }
            catch (final Exception e) {
                WorldMapHook.LOGGER.fine("[MAP REFRESH] Could not clear loaded chunk cache: " + e.getMessage());
            }
            final Object spiralIterator = ReflectionHelper.getFieldValueRecursive(tracker, "spiralIterator");
            if (spiralIterator instanceof final RestrictedSpiralIterator restrictedIterator) {
                final boolean shouldBlockSurface = caveModeEnabled && isUnderground && fogOfWar;
                restrictedIterator.setCaveModeActive(shouldBlockSurface);
                restrictedIterator.resetState();
                WorldMapHook.LOGGER.info("[MAP REFRESH] Set RestrictedSpiralIterator cave mode to: " + shouldBlockSurface);
            }
            tracker.clear();
            WorldMapHook.LOGGER.info("[MAP REFRESH] Sent ClearWorldMap packet");
            final Ref<EntityStore> playerRef = (Ref<EntityStore>)player.getReference();
            final TransformComponent transform = (playerRef != null && playerRef.isValid()) ? ((TransformComponent)playerRef.getStore().getComponent((Ref)playerRef, TransformComponent.getComponentType())) : null;
            if (transform != null) {
                final Vector3d pos = transform.getPosition();
                final int chunkX = (int)Math.floor(pos.x) >> 5;
                final int chunkZ = (int)Math.floor(pos.z) >> 5;
                if (spiralIterator instanceof final RestrictedSpiralIterator restrictedIterator2) {
                    restrictedIterator2.init(chunkX, chunkZ, 0, 999);
                }
                ReflectionHelper.setFieldValueRecursive(tracker, "updateTimer", 0.0f);
                forceTrackerUpdate(player, tracker, pos.x, pos.z);
                manageLoadedChunks(player, tracker, chunkX, chunkZ);
                if (caveModeEnabled && isUnderground && state != null) {
                    WorldMapHook.LOGGER.info("[MAP REFRESH] Starting cave overlay at layer " + state.getCurrentLayer());
                    scheduleCaveOverlayUpdate(player, world, tracker, pos.x, pos.z, state);
                }
                WorldMapHook.LOGGER.info("[MAP REFRESH] Re-initialized map at chunk " + chunkX + ", " + chunkZ);
            }
            WorldMapHook.LOGGER.info("[MAP REFRESH] Completed for " + player.getDisplayName());
        }
        catch (final Exception e2) {
            WorldMapHook.LOGGER.warning("Failed to force full map refresh for " + player.getDisplayName() + ": " + e2.getMessage());
            e2.printStackTrace();
        }
    }
    
    private static int generateCaveModeImagesProgressive(@Nonnull final Player player, @Nonnull final World world, @Nonnull final WorldMapTracker tracker, final double playerX, final double playerZ, final int yLevel, final int range, int maxGeneration) {
        try {
            final WorldMapSettings settings = world.getWorldMapManager().getWorldMapSettings();
            final float imageScale = settings.getImageScale();
            final int imageSize = MathUtil.fastFloor(32.0f * imageScale);
            final int playerMapChunkX = (int)Math.floor(playerX) >> 5;
            final int playerMapChunkZ = (int)Math.floor(playerZ) >> 5;
            final Object loadedObj = ReflectionHelper.getFieldValueRecursive(tracker, "loaded");
            final Set<Long> loaded = (loadedObj instanceof Set) ? ((Set)loadedObj) : new HashSet<Long>();
            final String playerName = player.getDisplayName();
            final Set<Long> caveModeLoaded = getCaveModeLoadedChunks(playerName);
            final Set<Long> caveModeFailed = getCaveModeFailedChunks(playerName);
            final Set<Long> caveModeTarget = getCaveModeTargetChunks(playerName);
            final Set<Long> caveModePending = getCaveModePendingChunks(playerName);
            final ExplorationTracker.PlayerExplorationData explorationData = ExplorationTracker.getInstance().getPlayerData(player);
            if (explorationData == null) {
                return maxGeneration;
            }
            final CaveModeManager.DynamicCaveModeState state = CaveModeManager.getInstance().getState(player);
            final boolean shareCaves = ModConfig.getInstance().isShareAllExploration();
            Set<Long> exploredWorldChunks;
            if (state != null) {
                exploredWorldChunks = new HashSet<Long>(state.getExploredCaveChunks());
                if (shareCaves) {
                    exploredWorldChunks.addAll(getHydratedSharedCaveExploredChunks(world.getName()));
                }
            }
            else if (shareCaves) {
                exploredWorldChunks = getHydratedSharedCaveExploredChunks(world.getName());
            }
            else {
                exploredWorldChunks = Collections.emptySet();
            }
            if (exploredWorldChunks.isEmpty()) {
                return maxGeneration;
            }
            final Set<Long> mapChunksSet = new HashSet<Long>();
            for (final Long chunkIdx : exploredWorldChunks) {
                final int wx = ChunkUtil.indexToChunkX(chunkIdx);
                final int wz = ChunkUtil.indexToChunkZ(chunkIdx);
                final int mx = wx >> 1;
                final int mz = wz >> 1;
                final long mapChunkIdx = com.hypixel.hytale.math.util.ChunkUtil.indexChunk(mx, mz);
                mapChunksSet.add(mapChunkIdx);
            }
            final List<Long> sortedChunks = new ArrayList<Long>(mapChunksSet);
            sortedChunks.sort(Comparator.comparingLong(idx -> {
                final int mx3 = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)idx);
                final int mz3 = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)idx);
                final long dx = mx3 - (long)playerMapChunkX;
                final long dz = mz3 - (long)playerMapChunkZ;
                return dx * dx + dz * dz;
            }));
            caveModeTarget.clear();
            caveModeTarget.addAll(mapChunksSet);
            final List<Long> completedPending = new ArrayList<Long>();
            final List<MapChunk> chunksToSend = new ArrayList<MapChunk>();
            for (Long pendingIdx : new ArrayList<Long>(caveModePending)) {
                final CompletableFuture<CaveModeImageBuilder> future = WorldMapHook.pendingCaveModeFutures.get(playerName + "_" + pendingIdx);
                if (future != null && future.isDone()) {
                    completedPending.add(pendingIdx);
                    caveModePending.remove(pendingIdx);
                    WorldMapHook.pendingCaveModeFutures.remove(playerName + "_" + pendingIdx);
                    final CaveModeImageBuilder builder = future.getNow(null);
                    if (builder != null) {
                        final MapImage image = builder.getImage();
                        if (image != null && image.data != null) {
                            final int mx2 = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)pendingIdx);
                            final int mz2 = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)pendingIdx);
                            chunksToSend.add(new MapChunk(mx2, mz2, image));
                            loaded.add(pendingIdx);
                            caveModeLoaded.add(pendingIdx);
                            caveModeFailed.remove(pendingIdx);
                        }
                        else {
                            caveModeFailed.add(pendingIdx);
                        }
                    }
                    else {
                        caveModeFailed.add(pendingIdx);
                    }
                }
            }
            for (Long chunkIdx2 : sortedChunks) {
                if (maxGeneration <= 0) {
                    break;
                }
                if (caveModeLoaded.contains(chunkIdx2)) {
                    continue;
                }
                if (caveModePending.contains(chunkIdx2)) {
                    continue;
                }
                final CompletableFuture<CaveModeImageBuilder> future = CaveModeImageBuilder.build(chunkIdx2, imageSize, imageSize, world, yLevel, range);
                if (future.isDone()) {
                    final CaveModeImageBuilder builder = future.getNow(null);
                    if (builder != null) {
                        final MapImage image = builder.getImage();
                        if (image != null && image.data != null) {
                            final int mx2 = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)chunkIdx2);
                            final int mz2 = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)chunkIdx2);
                            chunksToSend.add(new MapChunk(mx2, mz2, image));
                            loaded.add(chunkIdx2);
                            caveModeLoaded.add(chunkIdx2);
                            caveModeFailed.remove(chunkIdx2);
                        }
                        else {
                            caveModeFailed.add(chunkIdx2);
                        }
                    }
                    else {
                        caveModeFailed.add(chunkIdx2);
                    }
                }
                else {
                    caveModePending.add(chunkIdx2);
                    WorldMapHook.pendingCaveModeFutures.put(playerName + "_" + chunkIdx2, future);
                    --maxGeneration;
                }
            }
            if (!chunksToSend.isEmpty()) {
                for (int batchSize = 25, i = 0; i < chunksToSend.size(); i += batchSize) {
                    final int end = Math.min(i + batchSize, chunksToSend.size());
                    final List<MapChunk> batch = chunksToSend.subList(i, end);
                    final UpdateWorldMap packet = new UpdateWorldMap((MapChunk[])batch.toArray(new MapChunk[0]), (MapMarker[])null, (String[])null);
                    sendPacket(player, (ToClientPacket)packet);
                }
                WorldMapHook.LOGGER.fine("[CAVE MODE] Sent " + chunksToSend.size() + " chunks (pending: " + caveModePending.size());
            }
            return maxGeneration;
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.warning("[CAVE MODE] Error in progressive generation: " + e.getMessage());
            return maxGeneration;
        }
    }
    
    public static void updateWorldMapConfigs(@Nonnull final World world) {
        try {
            final WorldMapSettings settings = world.getWorldMapManager().getWorldMapSettings();
            final UpdateWorldMapSettings packet = (UpdateWorldMapSettings)ReflectionHelper.getFieldValue(settings, "settingsPacket");
            final ModConfig config = ModConfig.getInstance();
            final WorldMapConfig worldMapConfig = world.getGameplayConfig().getWorldMapConfig();
            final boolean allowNativeMarkerCreation = config.isAllowNativeMapMarkerCreation();
            if (packet != null) {
                packet.minScale = config.getMinScale();
                packet.maxScale = config.getMaxScale();
                packet.allowTeleportToMarkers = false;
                packet.allowCreatingMapMarkers = allowNativeMarkerCreation;
                packet.allowRemovingOtherPlayersMarkers = false;
            }
            if (worldMapConfig != null && worldMapConfig.getUserMapMarkerConfig() != null) {
                ReflectionHelper.setFieldValueRecursive(worldMapConfig.getUserMapMarkerConfig(), "allowCreatingMarkers", allowNativeMarkerCreation);
                ReflectionHelper.setFieldValueRecursive(worldMapConfig.getUserMapMarkerConfig(), "allowDeleteOtherPlayersSharedMarkers", false);
            }
            ReflectionHelper.setFieldValueRecursive(settings, "minScale", config.getMinScale());
            ReflectionHelper.setFieldValueRecursive(settings, "maxScale", config.getMaxScale());
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.warning("Failed to update world map configs: " + e.getMessage());
        }
    }
    
    public static void broadcastMapSettings(@Nonnull final World world) {
        try {
            final Object mapManager = world.getWorldMapManager();
            final Method sendSettings = mapManager.getClass().getMethod("sendSettings", (Class<?>[])new Class[0]);
            sendSettings.invoke(mapManager, new Object[0]);
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.fine("Could not invoke mapManager.sendSettings(): " + e.getMessage());
        }
    }
    
    public static void sendMapSettingsToPlayer(@Nonnull final Player player) {
        try {
            final World world = player.getWorld();
            if (world == null) {
                return;
            }
            updateWorldMapConfigs(world);
            final WorldMapSettings settings = world.getWorldMapManager().getWorldMapSettings();
            final UpdateWorldMapSettings basePacket = (UpdateWorldMapSettings)ReflectionHelper.getFieldValue(settings, "settingsPacket");
            if (basePacket == null) {
                return;
            }
            final UpdateWorldMapSettings packet = basePacket.clone();
            final PlayerConfig playerConfig = PlayerConfigManager.getInstance().getPlayerConfig(((CommandSender)player).getUuid());
            if (playerConfig != null) {
                packet.minScale = playerConfig.getMinScale();
                packet.maxScale = playerConfig.getMaxScale();
            }
            final WorldMapTracker tracker = player.getWorldMapTracker();
            ReflectionHelper.setFieldValueRecursive(tracker, "allowTeleportToMarkers", false);
            packet.allowTeleportToCoordinates = tracker.isAllowTeleportToCoordinates();
            packet.allowTeleportToMarkers = false;
            final WorldMapConfig worldMapConfig = world.getGameplayConfig().getWorldMapConfig();
            packet.allowCreatingMapMarkers = ModConfig.getInstance().isAllowNativeMapMarkerCreation() && PermissionsUtil.canCreateMarkers(player);
            packet.allowRemovingOtherPlayersMarkers = false;
            packet.allowShowOnMapToggle = worldMapConfig.canTogglePlayersInMap();
            packet.allowCompassTrackingToggle = worldMapConfig.canTrackPlayersInCompass();
            sendPacket(player, (ToClientPacket)packet);
            if (WorldMapHook.pendingJoinRefresh.remove(player.getDisplayName())) {
                WorldMapHook.LOGGER.info("[MAP REFRESH] Running delayed join refresh for " + player.getDisplayName());
                forceFullMapRefresh(player);
            }
            WorldMapHook.LOGGER.fine("Sent custom map settings to " + player.getDisplayName());
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.warning("Failed to send map settings to player: " + e.getMessage());
        }
    }
    
    public static void refreshTrackers(@Nonnull final World world) {
        for (PlayerRef playerRef : world.getPlayerRefs()) {
            final Holder<EntityStore> holder = (Holder<EntityStore>)playerRef.getHolder();
            if (holder == null) {
                continue;
            }
            final Player player = (Player)holder.getComponent(Player.getComponentType());
            if (player == null) {
                continue;
            }
            try {
                final Ref<EntityStore> ref = (Ref<EntityStore>)playerRef.getReference();
                if (ref == null || !ref.isValid()) {
                    continue;
                }
                final TransformComponent tc = (TransformComponent)ref.getStore().getComponent((Ref)ref, TransformComponent.getComponentType());
                if (tc == null) {
                    continue;
                }
                final Vector3d pos = tc.getPosition();
                forceTrackerUpdate(player, player.getWorldMapTracker(), pos.x, pos.z);
                updateExplorationState(player, player.getWorldMapTracker(), pos.x, pos.z);
            }
            catch (final Exception e) {
                WorldMapHook.LOGGER.warning("Failed to refresh tracker for " + player.getDisplayName() + ": " + e.getMessage());
            }
        }
    }
    
    public static void clearMarkerCaches(@Nonnull final World world) {
        for (PlayerRef playerRef : world.getPlayerRefs()) {
            final Holder<EntityStore> holder = (Holder<EntityStore>)playerRef.getHolder();
            if (holder == null) {
                continue;
            }
            final Player player = (Player)holder.getComponent(Player.getComponentType());
            if (player == null) {
                continue;
            }
            try {
                clearMarkerCaches(player.getWorldMapTracker());
            }
            catch (final Exception e) {
                WorldMapHook.LOGGER.fine("Failed to clear marker cache for " + player.getDisplayName() + ": " + e.getMessage());
            }
        }
    }
    
    public static void clearPlayerMarkerCache(@Nonnull final Player player) {
        try {
            clearMarkerCaches(player.getWorldMapTracker());
        }
        catch (final Exception e) {
            WorldMapHook.LOGGER.fine("Failed to clear marker cache for " + player.getDisplayName() + ": " + e.getMessage());
        }
    }
    
    private static void clearMarkerCaches(@Nonnull final WorldMapTracker tracker) {
        final Object markerTracker = findMarkerTracker(tracker);
        if (markerTracker == null) {
            return;
        }
        clearCollections(markerTracker);
        ReflectionHelper.invokeMethod(markerTracker, "clear", new Class[0], new Object[0]);
        ReflectionHelper.invokeMethod(markerTracker, "reset", new Class[0], new Object[0]);
    }
    
    private static Object findMarkerTracker(@Nonnull final WorldMapTracker tracker) {
        for (Class<?> current = tracker.getClass(); current != null; current = current.getSuperclass()) {
            for (final Field field : current.getDeclaredFields()) {
                try {
                    field.setAccessible(true);
                    final Class<?> type = field.getType();
                    final String typeName = type.getName();
                    if ("MapMarkerTracker".equals(type.getSimpleName()) || typeName.endsWith(".MapMarkerTracker")) {
                        final Object value = field.get(tracker);
                        if (value != null) {
                            return value;
                        }
                    }
                }
                catch (final IllegalAccessException ex) {}
            }
        }
        return null;
    }
    
    private static void clearCollections(@Nonnull final Object target) {
        for (Class<?> current = target.getClass(); current != null; current = current.getSuperclass()) {
            for (final Field field : current.getDeclaredFields()) {
                try {
                    field.setAccessible(true);
                    final Object value = field.get(target);
                    if (value instanceof Map) {
                        final Map<?, ?> map = (Map<?, ?>)value;
                        map.clear();
                    }
                    else if (value instanceof Collection) {
                        final Collection<?> collection = (Collection<?>)value;
                        collection.clear();
                    }
                }
                catch (final IllegalAccessException ex) {}
            }
        }
    }
    
    static {
        LOGGER = Logger.getLogger(WorldMapHook.class.getName());
        caveModeLoadedChunks = new ConcurrentHashMap<String, Set<Long>>();
        caveModeFailedChunks = new ConcurrentHashMap<String, Set<Long>>();
        caveModeTargetChunks = new ConcurrentHashMap<String, Set<Long>>();
        caveModePendingChunks = new ConcurrentHashMap<String, Set<Long>>();
        pendingCaveModeFutures = new ConcurrentHashMap<String, CompletableFuture<CaveModeImageBuilder>>();
        caveModeRetryCounter = new ConcurrentHashMap<String, Integer>();
        caveModeLastSharedCount = new ConcurrentHashMap<String, Integer>();
        caveModeLastShareEnabled = new ConcurrentHashMap<String, Boolean>();
        sharedCaveExploredChunks = new ConcurrentHashMap<String, Set<Long>>();
        pendingTrackerModifications = new ConcurrentHashMap<String, ConcurrentLinkedQueue<Runnable>>();
        pendingJoinRefresh = Collections.synchronizedSet(new HashSet<String>());
    }
    
    public static class RestrictedSpiralIterator extends CircleSpiralIterator
    {
        private final ExplorationTracker.PlayerExplorationData data;
        private final WorldMapTracker tracker;
        private volatile Iterator<Long> currentIterator;
        private volatile List<Long> targetMapChunks;
        private volatile int currentGoalRadius;
        private volatile boolean stopped;
        private volatile boolean initialized;
        private volatile boolean caveModeActive;
        private volatile int centerX;
        private volatile int centerZ;
        private volatile int currentRadius;
        private int cleanupTimer;
        private int pendingReloadCleanupTimer;
        private final Object lock;
        private volatile List<Long> cachedRankedChunks;
        private volatile int cachedCenterX;
        private volatile int cachedCenterZ;
        private volatile long cachedExploredVersion;
        private volatile Set<Long> cachedBoundaryChunks;
        private volatile Set<Long> cachedMapChunks;
        private volatile long cachedMapChunksVersion;
        private static final int RESORT_DISTANCE_THRESHOLD = 4;
        private static final int PENDING_RELOAD_CLEANUP_INTERVAL = 20;
        
        public RestrictedSpiralIterator(final ExplorationTracker.PlayerExplorationData data, final WorldMapTracker tracker) {
            this.targetMapChunks = new ArrayList<Long>();
            this.stopped = false;
            this.initialized = false;
            this.caveModeActive = false;
            this.cleanupTimer = 0;
            this.pendingReloadCleanupTimer = 0;
            this.lock = new Object();
            this.cachedRankedChunks = null;
            this.cachedCenterX = Integer.MIN_VALUE;
            this.cachedCenterZ = Integer.MIN_VALUE;
            this.cachedExploredVersion = -1L;
            this.cachedBoundaryChunks = null;
            this.cachedMapChunks = null;
            this.cachedMapChunksVersion = -1L;
            super.init(0, 0, 0, 1);
            this.data = data;
            this.tracker = tracker;
            this.currentIterator = Collections.emptyIterator();
            this.initialized = true;
        }
        
        public void setCaveModeActive(final boolean active) {
            synchronized (this.lock) {
                this.caveModeActive = active;
                if (active) {
                    this.currentIterator = Collections.emptyIterator();
                }
            }
        }
        
        public boolean isCaveModeActive() {
            return this.caveModeActive;
        }
        
        public void stop() {
            synchronized (this.lock) {
                this.stopped = true;
                this.currentIterator = Collections.emptyIterator();
                this.cachedRankedChunks = null;
                this.cachedCenterX = Integer.MIN_VALUE;
                this.cachedCenterZ = Integer.MIN_VALUE;
                this.cachedExploredVersion = -1L;
                this.cachedBoundaryChunks = null;
                this.cachedMapChunks = null;
                this.cachedMapChunksVersion = -1L;
                try {
                    super.init(0, 0, 0, 1);
                }
                catch (final Exception ex) {}
            }
        }
        
        public void resetState() {
            synchronized (this.lock) {
                this.stopped = false;
                this.initialized = true;
                this.currentIterator = Collections.emptyIterator();
                this.targetMapChunks = new ArrayList<Long>();
                this.currentGoalRadius = 0;
                this.currentRadius = 0;
                this.cleanupTimer = 0;
                this.pendingReloadCleanupTimer = 0;
            }
        }
        
        public List<Long> getTargetMapChunks() {
            return this.targetMapChunks;
        }
        
        private Set<Long> getOrBuildMapChunks() {
            final long currentVersion = this.data.getExploredChunks().getVersion();
            final Set<Long> cached = this.cachedMapChunks;
            if (cached != null && this.cachedMapChunksVersion == currentVersion) {
                return cached;
            }
            final Set<Long> mapChunks = new HashSet<Long>(1024);
            this.data.getExploredChunks().forEachExploredChunk(chunkIdx -> {
                final int wx = ChunkUtil.indexToChunkX(chunkIdx);
                final int wz = ChunkUtil.indexToChunkZ(chunkIdx);
                final int mx = wx >> 1;
                final int mz = wz >> 1;
                final long mapChunkIdx = com.hypixel.hytale.math.util.ChunkUtil.indexChunk(mx, mz);
                mapChunks.add(mapChunkIdx);
                return;
            });
            this.cachedMapChunks = mapChunks;
            this.cachedMapChunksVersion = currentVersion;
            return mapChunks;
        }
        
        public void init(final int cx, final int cz, final int startRadius, final int endRadius) {
            try {
                super.init(cx, cz, startRadius, endRadius);
            }
            catch (final Exception ex) {}
            synchronized (this.lock) {
                if (this.stopped || this.caveModeActive) {
                    this.currentIterator = Collections.emptyIterator();
                    this.initialized = true;
                    return;
                }
                this.centerX = cx;
                this.centerZ = cz;
                this.currentRadius = startRadius;
                this.currentGoalRadius = endRadius;
                try {
                    final Player player = this.tracker.getPlayer();
                    if (this.data == null) {
                        this.currentIterator = Collections.emptyIterator();
                        this.initialized = true;
                        return;
                    }
                    long currentExploredVersion;
                    Set<Long> mapChunksSet;
                    if (ModConfig.getInstance().isShareAllExploration()) {
                        final World world = player.getWorld();
                        final String worldName = (world != null) ? world.getName() : "world";
                        Set<Long> exploredWorldChunks = ExplorationManager.getInstance().getAllExploredChunks(worldName);
                        currentExploredVersion = exploredWorldChunks.size();
                        if (exploredWorldChunks.isEmpty()) {
                            this.bootstrapExploration(cx, cz);
                            exploredWorldChunks = ExplorationManager.getInstance().getAllExploredChunks(worldName);
                            currentExploredVersion = exploredWorldChunks.size();
                        }
                        mapChunksSet = new HashSet<Long>(exploredWorldChunks.size() / 2);
                        for (final Long chunkIdx : exploredWorldChunks) {
                            final int wx = ChunkUtil.indexToChunkX(chunkIdx);
                            final int wz = ChunkUtil.indexToChunkZ(chunkIdx);
                            final long mapChunkIdx = com.hypixel.hytale.math.util.ChunkUtil.indexChunk(wx >> 1, wz >> 1);
                            mapChunksSet.add(mapChunkIdx);
                        }
                    }
                    else {
                        currentExploredVersion = this.data.getExploredChunks().getVersion();
                        if (this.data.getExploredChunks().getExploredCount() == 0) {
                            this.bootstrapExploration(cx, cz);
                            currentExploredVersion = this.data.getExploredChunks().getVersion();
                        }
                        mapChunksSet = this.getOrBuildMapChunks();
                    }
                    if (mapChunksSet.isEmpty()) {
                        this.currentIterator = Collections.emptyIterator();
                        this.initialized = true;
                        return;
                    }
                    final int distanceFromCachedCenter = (this.cachedCenterX == Integer.MIN_VALUE) ? Integer.MAX_VALUE : (Math.abs(cx - this.cachedCenterX) + Math.abs(cz - this.cachedCenterZ));
                    final MapExpansionManager.MapBoundaries bounds = this.data.getMapExpansion().getCurrentBoundaries();
                    final Set<Long> boundaryChunks = new HashSet<Long>(4);
                    if (bounds.minX != Integer.MAX_VALUE) {
                        boundaryChunks.add(com.hypixel.hytale.math.util.ChunkUtil.indexChunk(bounds.minX >> 1, bounds.minZ >> 1));
                        boundaryChunks.add(com.hypixel.hytale.math.util.ChunkUtil.indexChunk(bounds.maxX >> 1, bounds.minZ >> 1));
                        boundaryChunks.add(com.hypixel.hytale.math.util.ChunkUtil.indexChunk(bounds.minX >> 1, bounds.maxZ >> 1));
                        boundaryChunks.add(com.hypixel.hytale.math.util.ChunkUtil.indexChunk(bounds.maxX >> 1, bounds.maxZ >> 1));
                    }
                    final boolean boundaryChunksChanged = this.cachedBoundaryChunks == null || !boundaryChunks.equals(this.cachedBoundaryChunks);
                    final boolean needsResort = this.cachedRankedChunks == null || distanceFromCachedCenter > 4 || currentExploredVersion != this.cachedExploredVersion || boundaryChunksChanged;
                    List<Long> rankedChunks;
                    if (needsResort) {
                        rankedChunks = new ArrayList<Long>(mapChunksSet.size());
                        for (final Long chunk : mapChunksSet) {
                            if (!boundaryChunks.contains(chunk)) {
                                rankedChunks.add(chunk);
                            }
                        }
                        final int sortCenterX = cx;
                        final int sortCenterZ = cz;
                        rankedChunks.sort(Comparator.comparingLong(idx -> {
                            final int mx = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)idx);
                            final int mz = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)idx);
                            final long dx = mx - (long)sortCenterX;
                            final long dz = mz - (long)sortCenterZ;
                            return dx * dx + dz * dz;
                        }));
                        this.cachedRankedChunks = rankedChunks;
                        this.cachedCenterX = cx;
                        this.cachedCenterZ = cz;
                        this.cachedExploredVersion = currentExploredVersion;
                        this.cachedBoundaryChunks = new HashSet<Long>(boundaryChunks);
                    }
                    else {
                        rankedChunks = this.cachedRankedChunks;
                    }
                    final int maxChunks = ModConfig.getInstance().getActiveMaxChunksToLoad();
                    int searchLimit = maxChunks - boundaryChunks.size();
                    if (searchLimit < 0) {
                        searchLimit = 0;
                    }
                    List<Long> limitedRankedChunks;
                    if (rankedChunks.size() > searchLimit) {
                        limitedRankedChunks = new ArrayList<Long>(searchLimit);
                        for (int i = 0; i < searchLimit; ++i) {
                            limitedRankedChunks.add(rankedChunks.get(i));
                        }
                    }
                    else {
                        limitedRankedChunks = rankedChunks;
                    }
                    (this.targetMapChunks = new ArrayList<Long>(boundaryChunks.size() + limitedRankedChunks.size())).addAll(boundaryChunks);
                    this.targetMapChunks.addAll(limitedRankedChunks);
                    this.currentIterator = limitedRankedChunks.iterator();
                    this.initialized = true;
                    if (++this.cleanupTimer > 100) {
                        this.cleanupTimer = 0;
                        this.cleanupFarChunks(limitedRankedChunks);
                    }
                    if (++this.pendingReloadCleanupTimer > 20) {
                        this.pendingReloadCleanupTimer = 0;
                        this.cleanupStalePendingReloads(this.targetMapChunks);
                    }
                }
                catch (final Exception e) {
                    WorldMapHook.LOGGER.warning("Error in RestrictedSpiralIterator.init(): " + e.getMessage());
                    this.currentIterator = Collections.emptyIterator();
                    this.initialized = true;
                }
            }
        }
        
        private void bootstrapExploration(final int cx, final int cz) {
            final int worldChunkX = this.mapChunkToWorldChunk(cx);
            final int worldChunkZ = this.mapChunkToWorldChunk(cz);
            final int bootstrapRadius = Math.max(0, ModConfig.getInstance().getExplorationRadius());
            final Set<Long> bootstrapChunks = ChunkUtil.getChunksInCircularArea(worldChunkX, worldChunkZ, bootstrapRadius);
            this.data.getExploredChunks().markChunksExplored(bootstrapChunks);
            this.data.getMapExpansion().updateBoundaries(worldChunkX, worldChunkZ, bootstrapRadius);
            WorldMapHook.LOGGER.info("Bootstrapped " + bootstrapChunks.size() + " exploration chunks around (" + worldChunkX + ", " + worldChunkZ);
        }
        
        private int mapChunkToWorldChunk(final int mapChunkCoord) {
            final long worldChunk = (long)mapChunkCoord << 1;
            if (worldChunk > 2147483647L) {
                return Integer.MAX_VALUE;
            }
            if (worldChunk < -2147483648L) {
                return Integer.MIN_VALUE;
            }
            return (int)worldChunk;
        }
        
        private void cleanupStalePendingReloads(final List<Long> currentTargetChunks) {
            try {
                final Object pendingReloadChunksObj = ReflectionHelper.getFieldValueRecursive(this.tracker, "pendingReloadChunks");
                final Object pendingReloadFuturesObj = ReflectionHelper.getFieldValueRecursive(this.tracker, "pendingReloadFutures");
                boolean b = false;
                Label_0050: {
                    if (pendingReloadChunksObj instanceof Set) {
                        final Set<?> pendingSet = (Set<?>)pendingReloadChunksObj;
                        if (!pendingSet.isEmpty()) {
                            b = true;
                            break Label_0050;
                        }
                    }
                    b = false;
                }
                final boolean hasPendingChunks = b;
                boolean b2 = false;
                Label_0080: {
                    if (pendingReloadFuturesObj instanceof Map) {
                        final Map<?, ?> futuresMap = (Map<?, ?>)pendingReloadFuturesObj;
                        if (!futuresMap.isEmpty()) {
                            b2 = true;
                            break Label_0080;
                        }
                    }
                    b2 = false;
                }
                final boolean hasPendingFutures = b2;
                if (!hasPendingChunks && !hasPendingFutures) {
                    return;
                }
                final Set<Long> currentTargetSet = new HashSet<Long>(currentTargetChunks);
                int removedChunks = 0;
                int removedFutures = 0;
                if (pendingReloadChunksObj instanceof Set) {
                    final Set<?> pendingSet2 = (Set<?>)pendingReloadChunksObj;
                    final Iterator<?> it = pendingSet2.iterator();
                    while (it.hasNext()) {
                        final Object obj = it.next();
                        if (obj instanceof final Long idx) {
                            if (currentTargetSet.contains(idx)) {
                                continue;
                            }
                            it.remove();
                            ++removedChunks;
                        }
                    }
                }
                if (pendingReloadFuturesObj instanceof Map) {
                    final Map<?, ?> futuresMap2 = (Map<?, ?>)pendingReloadFuturesObj;
                    final Iterator<? extends Map.Entry<?, ?>> it2 = futuresMap2.entrySet().iterator();
                    while (it2.hasNext()) {
                        final Map.Entry<?, ?> entry = (Map.Entry<?, ?>)it2.next();
                        final Object key = entry.getKey();
                        if (key instanceof final Long idx) {
                            if (currentTargetSet.contains(idx)) {
                                continue;
                            }
                            it2.remove();
                            ++removedFutures;
                        }
                    }
                }
                if (removedChunks > 0 || removedFutures > 0) {
                    WorldMapHook.LOGGER.fine("Cleaned up stale pending reloads: " + removedChunks + " chunks, " + removedFutures + " futures");
                }
            }
            catch (final Exception e) {
                WorldMapHook.LOGGER.warning("Failed to cleanup stale pending reloads: " + e.getMessage());
            }
        }
        
        private void cleanupFarChunks(final List<Long> keepChunks) {
            try {
                final Object loadedObj = ReflectionHelper.getFieldValue(this.tracker, "loaded");
                if (loadedObj instanceof Set) {
                    final Set<?> loadedSet = (Set<?>)loadedObj;
                    if (loadedSet.size() > 20000) {
                        final Set<Long> keepSet = new HashSet<Long>(keepChunks);
                        final List<MapChunk> toRemovePackets = new ArrayList<MapChunk>();
                        final Iterator<?> it = loadedSet.iterator();
                        while (it.hasNext()) {
                            final Object obj = it.next();
                            if (obj instanceof final Long idx) {
                                if (keepSet.contains(idx)) {
                                    continue;
                                }
                                it.remove();
                                final int mx = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex((long)idx);
                                final int mz = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex((long)idx);
                                toRemovePackets.add(new MapChunk(mx, mz, (MapImage)null));
                            }
                        }
                        if (!toRemovePackets.isEmpty()) {
                            final UpdateWorldMap packet = new UpdateWorldMap((MapChunk[])toRemovePackets.toArray(new MapChunk[0]), (MapMarker[])null, (String[])null);
                            WorldMapHook.sendPacket(this.tracker.getPlayer(), (ToClientPacket)packet);
                        }
                    }
                }
            }
            catch (final Exception e) {
                WorldMapHook.LOGGER.warning("Failed to cleanup far chunks: " + e.getMessage());
            }
        }
        
        public boolean hasNext() {
            if (this.stopped || this.caveModeActive) {
                return false;
            }
            final Iterator<Long> iter = this.currentIterator;
            return iter != null && iter.hasNext();
        }
        
        public long next() {
            final Iterator<Long> iter = this.currentIterator;
            if (this.stopped || iter == null || !iter.hasNext()) {
                return 0L;
            }
            try {
                final long next = iter.next();
                final int mx = com.hypixel.hytale.math.util.ChunkUtil.xOfChunkIndex(next);
                final int mz = com.hypixel.hytale.math.util.ChunkUtil.zOfChunkIndex(next);
                final long dx = mx - (long)this.centerX;
                final long dz = mz - (long)this.centerZ;
                final long distSquared = dx * dx + dz * dz;
                this.currentRadius = fastSqrt(distSquared);
                return next;
            }
            catch (final NoSuchElementException e) {
                return 0L;
            }
        }
        
        private static int fastSqrt(final long n) {
            if (n <= 0L) {
                return 0;
            }
            if (n == 1L) {
                return 1;
            }
            long x = n;
            for (long y = x + 1L >> 1; y < x; x = y, y = x + n / x >> 1) {}
            return (int)x;
        }
        
        public int getCompletedRadius() {
            return (this.stopped || this.caveModeActive) ? this.currentGoalRadius : this.currentRadius;
        }
    }
}

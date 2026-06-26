// 
// Decompiled by Procyon v0.6.0
// 

package dev.ninesliced.providers;

import com.hypixel.hytale.server.core.command.system.CommandSender;
import java.util.concurrent.ConcurrentHashMap;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.server.core.universe.world.WorldMapTracker;
import com.hypixel.hytale.protocol.ToClientPacket;
import com.hypixel.hytale.protocol.packets.worldmap.MapChunk;
import com.hypixel.hytale.protocol.packets.worldmap.UpdateWorldMap;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.worldmap.markers.MapMarkerTracker;
import dev.ninesliced.utils.ReflectionHelper;
import com.hypixel.hytale.protocol.packets.worldmap.ContextMenuItem;
import com.hypixel.hytale.protocol.packets.worldmap.PlacedByMarkerComponent;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.protocol.packets.worldmap.MapMarkerComponent;
import com.hypixel.hytale.protocol.packets.worldmap.TintComponent;
import com.hypixel.hytale.server.core.universe.world.worldmap.markers.MapMarkerBuilder;
import com.hypixel.hytale.math.vector.Transform;
import dev.ninesliced.managers.WaypointManager;
import com.hypixel.hytale.protocol.packets.worldmap.MapMarker;
import java.util.Iterator;
import com.hypixel.hytale.server.core.entity.entities.player.data.PlayerWorldData;
import dev.ninesliced.configs.PlayerConfig;
import com.hypixel.hytale.server.core.universe.world.worldmap.markers.worldstore.WorldMarkersResource;
import com.hypixel.hytale.server.core.universe.world.worldmap.markers.user.UserMapMarker;
import dev.ninesliced.utils.WorldMapHook;
import dev.ninesliced.managers.PlayerConfigManager;
import dev.ninesliced.utils.PermissionsUtil;
import dev.ninesliced.configs.ModConfig;
import com.hypixel.hytale.server.core.universe.world.worldmap.markers.MarkersCollector;
import com.hypixel.hytale.server.core.entity.entities.Player;
import javax.annotation.Nonnull;
import com.hypixel.hytale.server.core.universe.world.World;
import java.util.UUID;
import java.util.Map;
import java.util.logging.Logger;
import com.hypixel.hytale.server.core.universe.world.worldmap.WorldMapManager;

public class UserMarkerContextMenuProvider implements WorldMapManager.MarkerProvider
{
    public static final UserMarkerContextMenuProvider INSTANCE;
    private static final Logger LOGGER;
    private static final Map<UUID, Boolean> TELEPORT_MENU_STATE;
    private static final Map<UUID, Boolean> SHARED_EDIT_MENU_STATE;
    
    private UserMarkerContextMenuProvider() {
    }
    
    public void update(@Nonnull final World world, @Nonnull final Player player, @Nonnull final MarkersCollector collector) {
        final boolean allowWaypointTeleport = ModConfig.getInstance().isAllowWaypointTeleports();
        final boolean allowContextMenuTeleport = ModConfig.getInstance().isAllowContextMenuWaypointTeleports();
        final boolean hasTeleportPermission = PermissionsUtil.canTeleport(player);
        final boolean isPrivileged = PermissionsUtil.isAdmin(player);
        final boolean showTeleport = allowWaypointTeleport && hasTeleportPermission && (allowContextMenuTeleport || isPrivileged);
        final boolean canEditAnyShared = PermissionsUtil.canEditSharedWaypointByPermission(player) || ModConfig.getInstance().isAllowGlobalWaypointEditsForEveryone();
        final UUID playerId = ((CommandSender)player).getUuid();
        final PlayerConfig playerConfig = (playerId != null) ? PlayerConfigManager.getInstance().getPlayerConfig(playerId) : null;
        final boolean hidePersonalWaypoints = playerConfig != null && playerConfig.isHidePersonalWaypointsOnMap();
        boolean hideGlobalWaypoints = ModConfig.getInstance().isHideGlobalWaypointsOnMap();
        if (playerConfig != null) {
            if (playerConfig.isOverrideGlobalWaypointHide()) {
                hideGlobalWaypoints = playerConfig.isHideGlobalWaypointsOnMap();
            }
            else if (playerConfig.isHideGlobalWaypointsOnMap()) {
                hideGlobalWaypoints = true;
            }
        }
        if (playerId != null) {
            final Boolean previous = UserMarkerContextMenuProvider.TELEPORT_MENU_STATE.put(playerId, showTeleport);
            if (previous != null && previous != showTeleport) {
                this.scheduleResyncAllMarkers(world, player);
            }
            final Boolean previousSharedEdit = UserMarkerContextMenuProvider.SHARED_EDIT_MENU_STATE.put(playerId, canEditAnyShared);
            if (previousSharedEdit != null && previousSharedEdit != canEditAnyShared) {
                WorldMapHook.sendMapSettingsToPlayer(player);
                this.scheduleResyncAllMarkers(world, player);
            }
        }
        if (!hidePersonalWaypoints) {
            final PlayerWorldData perWorldData = player.getPlayerConfigData().getPerWorldData(world.getName());
            for (final UserMapMarker marker : perWorldData.getUserMapMarkers()) {
                collector.add(this.buildMarkerWithContextMenu(world, player, marker, showTeleport));
            }
        }
        if (!hideGlobalWaypoints) {
            final WorldMarkersResource worldMarkersResource = (WorldMarkersResource)world.getChunkStore().getStore().getResource(WorldMarkersResource.getResourceType());
            for (final UserMapMarker marker : worldMarkersResource.getUserMapMarkers()) {
                collector.add(this.buildMarkerWithContextMenu(world, player, marker, showTeleport));
            }
        }
    }
    
    private MapMarker buildMarkerWithContextMenu(@Nonnull final World world, @Nonnull final Player player, @Nonnull final UserMapMarker marker, final boolean showTeleport) {
        final double markerY = WaypointManager.getMarkerYOrDefault(world, player, marker.getId(), 100.0);
        final MapMarkerBuilder builder = new MapMarkerBuilder(marker.getId(), marker.getIcon(), new Transform((double)marker.getX(), markerY, (double)marker.getZ()));
        if (marker.getName() != null) {
            builder.withCustomName(marker.getName());
        }
        if (marker.getColorTint() != null) {
            builder.withComponent((MapMarkerComponent)new TintComponent(marker.getColorTint()));
        }
        if (marker.getCreatedByName() != null) {
            builder.withComponent((MapMarkerComponent)new PlacedByMarkerComponent(Message.raw(marker.getCreatedByName()).getFormattedMessage(), marker.getCreatedByUuid()));
        }
        if (showTeleport) {
            builder.withContextMenuItem(new ContextMenuItem("Teleport", "bettermap waypoint teleport " + marker.getId()));
        }
        final String markerId = marker.getId();
        final boolean isShared = markerId != null && markerId.startsWith("user_shared_");
        final boolean canEditShared = PermissionsUtil.canEditSharedWaypoint(player, marker);
        final boolean isOwner = marker.getCreatedByUuid() != null && marker.getCreatedByUuid().equals(player.getUuid());
        if (!isShared || canEditShared) {
            builder.withContextMenuItem(new ContextMenuItem("Edit", "bettermap waypoint edit " + marker.getId()));
        }
        if (isShared && canEditShared && !isOwner) {
            builder.withContextMenuItem(new ContextMenuItem("Remove Marker", "bettermap waypoint delete " + marker.getId()));
        }
        return builder.build();
    }
    
    private void forceResyncAllMarkers(@Nonnull final Player player) {
        try {
            final WorldMapTracker tracker = player.getWorldMapTracker();
            if (tracker == null) {
                return;
            }
            final Object markerTrackerObj = ReflectionHelper.getFieldValueRecursive(tracker, "markerTracker");
            if (!(markerTrackerObj instanceof MapMarkerTracker)) {
                return;
            }
            final MapMarkerTracker markerTracker = (MapMarkerTracker)markerTrackerObj;
            final Map<String, MapMarker> sentMarkers = markerTracker.getSentMarkers();
            if (sentMarkers == null || sentMarkers.isEmpty()) {
                return;
            }
            final String[] ids = sentMarkers.keySet().toArray(String[]::new);
            sentMarkers.clear();
            final Ref<EntityStore> ref = (Ref<EntityStore>)player.getReference();
            if (ref == null || !ref.isValid()) {
                return;
            }
            final Store<EntityStore> store = (Store<EntityStore>)ref.getStore();
            final PlayerRef playerRef = (PlayerRef)store.getComponent((Ref)ref, PlayerRef.getComponentType());
            if (playerRef == null) {
                return;
            }
            playerRef.getPacketHandler().writeNoCache((ToClientPacket)new UpdateWorldMap((MapChunk[])null, (MapMarker[])null, ids));
            ReflectionHelper.setFieldValueRecursive(markerTracker, "smallMovementsTimer", 0.0f);
        }
        catch (final Exception e) {
            UserMarkerContextMenuProvider.LOGGER.warning("Failed to refresh marker context menu: " + e.getMessage());
        }
    }
    
    private void scheduleResyncAllMarkers(@Nonnull final World world, @Nonnull final Player player) {
        try {
            if (!world.isAlive()) {
                return;
            }
            world.execute(() -> this.forceResyncAllMarkers(player));
        }
        catch (final Exception e) {
            UserMarkerContextMenuProvider.LOGGER.warning("Failed to schedule marker context menu refresh: " + e.getMessage());
        }
    }
    
    static {
        INSTANCE = new UserMarkerContextMenuProvider();
        LOGGER = Logger.getLogger(UserMarkerContextMenuProvider.class.getName());
        TELEPORT_MENU_STATE = new ConcurrentHashMap<UUID, Boolean>();
        SHARED_EDIT_MENU_STATE = new ConcurrentHashMap<UUID, Boolean>();
    }
}

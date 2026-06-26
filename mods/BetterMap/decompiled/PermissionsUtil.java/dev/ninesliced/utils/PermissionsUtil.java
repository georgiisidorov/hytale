// 
// Decompiled by Procyon v0.6.0
// 

package dev.ninesliced.utils;

import com.hypixel.hytale.server.core.command.system.CommandSender;
import com.hypixel.hytale.server.core.universe.world.worldmap.markers.user.UserMapMarker;
import com.hypixel.hytale.server.core.universe.world.World;
import dev.ninesliced.configs.ModConfig;
import com.hypixel.hytale.protocol.GameMode;
import java.util.Set;
import java.util.UUID;
import com.hypixel.hytale.server.core.permissions.PermissionsModule;
import javax.annotation.Nonnull;
import com.hypixel.hytale.server.core.entity.entities.Player;

public final class PermissionsUtil
{
    private static final String ADMIN_PERMISSION = "bettermap.admin";
    private static final String ADMIN_COMMAND_PERMISSION = "bettermap.command.admin";
    private static final String TELEPORT_PERMISSION = "bettermap.command.teleport";
    private static final String GLOBAL_WAYPOINT_PERMISSION = "bettermap.command.waypoint.global";
    private static final String EDIT_GLOBAL_WAYPOINT_PERMISSION = "bettermap.command.waypoint.editglobal";
    private static final String OVERRIDE_PLAYERS_PERMISSION = "bettermap.command.override.players";
    private static final String OVERRIDE_WARPS_PERMISSION = "bettermap.command.override.warps";
    private static final String OVERRIDE_UNEXPLORED_WARPS_PERMISSION = "bettermap.command.override.unexploredwarps";
    private static final String OVERRIDE_POI_PERMISSION = "bettermap.command.override.poi";
    private static final String OVERRIDE_UNEXPLORED_POI_PERMISSION = "bettermap.command.override.unexploredpoi";
    private static final String OVERRIDE_SPAWN_PERMISSION = "bettermap.command.override.spawn";
    private static final String OVERRIDE_DEATH_PERMISSION = "bettermap.command.override.death";
    private static final String OVERRIDE_WAYPOINTS_PERMISSION = "bettermap.command.override.waypoints";
    private static final String CONFIG_PERMISSION = "bettermap.command.config";
    
    private PermissionsUtil() {
    }
    
    public static boolean isAdmin(@Nonnull final Player player) {
        final UUID uuid = ((CommandSender)player).getUuid();
        final PermissionsModule perms = PermissionsModule.get();
        if (perms == null) {
            return false;
        }
        final Set<String> groups = perms.getGroupsForUser(uuid);
        return (groups != null && groups.contains("OP")) || perms.hasPermission(uuid, "bettermap.admin") || perms.hasPermission(uuid, "bettermap.command.admin");
    }
    
    public static boolean canTeleport(@Nonnull final Player player) {
        final PermissionsModule perms = PermissionsModule.get();
        if (perms == null) {
            return false;
        }
        final UUID uuid = ((CommandSender)player).getUuid();
        final Set<String> groups = perms.getGroupsForUser(uuid);
        return (groups != null && groups.contains("OP")) || perms.hasPermission(uuid, "bettermap.command.teleport");
    }
    
    public static boolean hasNativeCreativeOpMarkerTeleport(@Nonnull final Player player) {
        if (player.getGameMode() != GameMode.Creative) {
            return false;
        }
        final PermissionsModule perms = PermissionsModule.get();
        if (perms == null) {
            return false;
        }
        final UUID uuid = ((CommandSender)player).getUuid();
        final Set<String> groups = perms.getGroupsForUser(uuid);
        return groups != null && groups.contains("OP");
    }
    
    public static boolean canUseGlobalWaypoints(@Nonnull final Player player) {
        final World world = player.getWorld();
        if (world == null) {
            return false;
        }
        try {
            final int maxShared = ModConfig.getInstance().getMaxSharedMarkersPerPlayer();
            return maxShared != 0;
        }
        catch (final Exception e) {
            return false;
        }
    }
    
    public static boolean canEditSharedWaypoint(@Nonnull final Player player, @Nonnull final UserMapMarker marker) {
        if (!isSharedWaypointMarker(marker)) {
            return true;
        }
        final UUID playerUuid = ((CommandSender)player).getUuid();
        final UUID creatorUuid = marker.getCreatedByUuid();
        return (creatorUuid != null && creatorUuid.equals(playerUuid)) || hasPermission(player, "bettermap.command.waypoint.editglobal") || ModConfig.getInstance().isAllowGlobalWaypointEditsForEveryone();
    }
    
    public static boolean canEditSharedWaypointByPermission(@Nonnull final Player player) {
        return hasPermission(player, "bettermap.command.waypoint.editglobal");
    }
    
    public static boolean canAccessConfig(@Nonnull final Player player) {
        final PermissionsModule perms = PermissionsModule.get();
        if (perms == null) {
            return false;
        }
        final UUID uuid = ((CommandSender)player).getUuid();
        final Set<String> groups = perms.getGroupsForUser(uuid);
        return (groups != null && groups.contains("OP")) || perms.hasPermission(uuid, "bettermap.command.config");
    }
    
    public static boolean canOverridePlayers(@Nonnull final Player player) {
        return hasOverridePermission(player, "bettermap.command.override.players");
    }
    
    public static boolean canOverrideWarps(@Nonnull final Player player) {
        return hasOverridePermission(player, "bettermap.command.override.warps");
    }
    
    public static boolean canOverrideUnexploredWarps(@Nonnull final Player player) {
        return hasOverridePermission(player, "bettermap.command.override.unexploredwarps");
    }
    
    public static boolean canOverridePoi(@Nonnull final Player player) {
        return hasOverridePermission(player, "bettermap.command.override.poi");
    }
    
    public static boolean canOverrideUnexploredPoi(@Nonnull final Player player) {
        return hasOverridePermission(player, "bettermap.command.override.unexploredpoi");
    }
    
    public static boolean canOverrideSpawn(@Nonnull final Player player) {
        return hasOverridePermission(player, "bettermap.command.override.spawn");
    }
    
    public static boolean canOverrideDeath(@Nonnull final Player player) {
        return hasOverridePermission(player, "bettermap.command.override.death");
    }
    
    public static boolean canOverrideWaypoints(@Nonnull final Player player) {
        return hasOverridePermission(player, "bettermap.command.override.waypoints");
    }
    
    private static boolean hasOverridePermission(@Nonnull final Player player, final String permission) {
        return hasPermission(player, permission);
    }
    
    private static boolean hasPermission(@Nonnull final Player player, final String permission) {
        final PermissionsModule perms = PermissionsModule.get();
        if (perms == null) {
            return false;
        }
        final UUID uuid = ((CommandSender)player).getUuid();
        return perms.hasPermission(uuid, permission);
    }
    
    private static boolean isSharedWaypointMarker(@Nonnull final UserMapMarker marker) {
        final String id = marker.getId();
        return id != null && id.startsWith("user_shared_");
    }
}

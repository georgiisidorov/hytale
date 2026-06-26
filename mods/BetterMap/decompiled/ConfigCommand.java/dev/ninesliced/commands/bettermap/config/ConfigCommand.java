// 
// Decompiled by Procyon v0.6.0
// 

package dev.ninesliced.commands.bettermap.config;

import com.hypixel.hytale.server.core.command.system.AbstractCommand;
import com.hypixel.hytale.server.core.command.system.basecommands.AbstractCommandCollection;

public class ConfigCommand extends AbstractCommandCollection
{
    public static final String CONFIG_PERMISSION = "bettermap.command.config";
    
    public ConfigCommand() {
        super("config", "Manage global BetterMap configuration");
        this.requirePermission("bettermap.command.config");
        this.addSubCommand((AbstractCommand)new MapMinScaleCommand());
        this.addSubCommand((AbstractCommand)new MapMaxScaleCommand());
        this.addSubCommand((AbstractCommand)new MapExplorationRadiusCommand());
        this.addSubCommand((AbstractCommand)new DebugCommand());
        this.addSubCommand((AbstractCommand)new MapQualityCommand());
        this.addSubCommand((AbstractCommand)new LocationCommand());
        this.addSubCommand((AbstractCommand)new ShareAllExplorationCommand());
        this.addSubCommand((AbstractCommand)new MaxChunksToLoadCommand());
        this.addSubCommand((AbstractCommand)new RadarToggleCommand());
        this.addSubCommand((AbstractCommand)new RadarRangeCommand());
        this.addSubCommand((AbstractCommand)new HidePlayersCommand());
        this.addSubCommand((AbstractCommand)new HideAllWarpsCommand());
        this.addSubCommand((AbstractCommand)new HideOtherWarpsCommand());
        this.addSubCommand((AbstractCommand)new HideUnexploredWarpsCommand());
        this.addSubCommand((AbstractCommand)new HideAllPoiCommand());
        this.addSubCommand((AbstractCommand)new HideUnexploredPoiCommand());
        this.addSubCommand((AbstractCommand)new HideSpawnCommand());
        this.addSubCommand((AbstractCommand)new HideDeathMarkerCommand());
        this.addSubCommand((AbstractCommand)new HideGlobalWaypointsCommand());
        this.addSubCommand((AbstractCommand)new GlobalWaypointEditCommand());
        this.addSubCommand((AbstractCommand)new HiddenPoiCommand());
        this.addSubCommand((AbstractCommand)new WaypointTeleportCommand());
        this.addSubCommand((AbstractCommand)new WaypointContextMenuTeleportCommand());
        this.addSubCommand((AbstractCommand)new MarkerTeleportCommand());
        this.addSubCommand((AbstractCommand)new MapMarkerCreationCommand());
        this.addSubCommand((AbstractCommand)new TrackWorldCommand());
        this.addSubCommand((AbstractCommand)new UntrackWorldCommand());
        this.addSubCommand((AbstractCommand)new AutoSaveIntervalCommand());
        this.addSubCommand((AbstractCommand)new MarkerLimitCommand());
        this.addSubCommand((AbstractCommand)new WorldBorderToggleCommand());
        this.addSubCommand((AbstractCommand)new WorldBorderRadiusCommand());
        this.addSubCommand((AbstractCommand)new WorldBorderOffsetCommand());
        this.addSubCommand((AbstractCommand)new CaveModeToggleCommand());
        this.addSubCommand((AbstractCommand)new CaveModeLayerCommand());
        this.addSubCommand((AbstractCommand)new CaveModeThresholdCommand());
        this.addSubCommand((AbstractCommand)new CaveModeRadiusCommand());
        this.addSubCommand((AbstractCommand)new DiscoverSurfaceCommand());
        this.addSubCommand((AbstractCommand)new CaveFogOfWarCommand());
    }
    
    protected String generatePermissionNode() {
        return "config";
    }
    
    protected boolean canGeneratePermission() {
        return false;
    }
}

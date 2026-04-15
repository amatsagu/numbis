import { log, debug, shouldManage } from "./util";
import { MasterLayout } from "./engine/master_layout";

log("INITIALIZING...");

workspace.windowAdded.connect((window: KWinWindow) => {
    debug(`Event: Window Added: "${window.caption}"`);
    if (shouldManage(window)) {
        MasterLayout.apply();
    }
});

workspace.windowRemoved.connect((window: KWinWindow) => {
    debug(`Event: Window Removed: "${window.caption}"`);
    if (shouldManage(window)) {
        MasterLayout.apply();
    }
});

workspace.windowActivated.connect((window: KWinWindow | null) => {
    if (window && shouldManage(window)) {
        debug(`Event: Window Activated: "${window.caption}"`);
    }
});

workspace.currentDesktopChanged.connect(() => {
    log("Event: Desktop Changed");
    MasterLayout.apply();
});

registerShortcut("NumbisRetile", "Numbis: Force Retile", "Meta+Alt+R", () => {
    log("Shortcut: Force Retile Triggered");
    MasterLayout.apply();
});

MasterLayout.apply();
log("INITIALIZED");

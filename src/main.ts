import { applyTiling } from "./layout";
import { initShortcuts } from "./shortcuts";
import { log, shouldManageWindow, clearWindowState } from "./util";

function init() {
    log("Requested initialization. Preparing...")

    initShortcuts();

    workspace.windowAdded.connect((window: KWinWindow) => {
        log(`[Event] Detected creation of \"${window.caption}\" window.`)
        if (shouldManageWindow(window)) applyTiling();
    });

    workspace.windowRemoved.connect((window: KWinWindow) => {
        log(`[Event] Detected removal of \"${window.caption}\" window.`)
        clearWindowState(window);
        applyTiling();
    });

    workspace.windowActivated.connect((window: KWinWindow | null) => {
        if (window && shouldManageWindow(window)) {
            log(`[Event] Detected activation/focus of \"${window.caption}\" window.`)
        }
    });

    workspace.currentDesktopChanged.connect(() => {
        log("[Event] Detected change of desktop view.")
        applyTiling(); // force reload
    });

    applyTiling(); // force first reload after enabling script
    log("Successfully started Numbis tiling window manager script.")
}

init();
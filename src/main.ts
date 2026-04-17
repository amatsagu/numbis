import { applyTiling } from "./layout";
import { initShortcuts } from "./shortcuts";
import { 
    log, 
    shouldManageWindow, 
    clearWindowState, 
    selectManagedWindows, 
    windowOrder,
    masterLayoutActive,
    masterRatios,
    MaximizeArea
} from "./util";

function connectWindow(window: KWinWindow) {
    if (!shouldManageWindow(window)) return;

    window.quickTileModeChanged.connect(() => {
        log(`[Event] QuickTileMode changed for \"${window.caption}\"`);
        applyTiling();
    });

    window.frameGeometryChanged.connect(() => {
        if (window.moveResized) {
            // Real-time updates while user is dragging/resizing
            applyTiling();
        }
    });

    window.moveResizedChanged.connect(() => {
        if (!window.moveResized) {
            log(`[Event] User finished moving/resizing \"${window.caption}\"`);
            
            const currentDesktop = workspace.currentDesktop;
            
            // Finalize reordering if in Master Layout
            if (masterLayoutActive.get(currentDesktop)) {
                const windows = selectManagedWindows();
                if (windows.length > 0 && window !== windows[0]) {
                    updateWindowOrder(window);
                }
            }
            
            applyTiling();
        }
    });

    window.desktopsChanged.connect(() => {
        applyTiling();
    });
}

/**
 * Reorder windows based on their horizontal center when master layout is active.
 * This allows "drag to swap" between master and stack.
 */
function updateWindowOrder(draggedWindow: KWinWindow) {
    const currentDesktop = workspace.currentDesktop;
    const windows = selectManagedWindows();
    if (windows.length <= 1) return;

    // Sort windows: Master (left) comes first, then Stack (right) top-to-bottom.
    const sorted = windows.slice().sort((a, b) => {
        const centerAx = a.frameGeometry.x + a.frameGeometry.width / 2;
        const centerBx = b.frameGeometry.x + b.frameGeometry.width / 2;
        
        // If they are on the same vertical column (roughly), sort by Y
        if (Math.abs(centerAx - centerBx) < 80) {
            const centerAy = a.frameGeometry.y + a.frameGeometry.height / 2;
            const centerBy = b.frameGeometry.y + b.frameGeometry.height / 2;
            return centerAy - centerBy;
        }
        
        return centerAx - centerBx;
    });

    // Check if the order actually changed
    let changed = false;
    for (let i = 0; i < windows.length; i++) {
        if (windows[i] !== sorted[i]) {
            changed = true;
            break;
        }
    }

    if (changed) {
        log("Window order updated based on manual move.");
        windowOrder.set(currentDesktop, sorted);
    }
}

function init() {
    log("Requested initialization. Preparing...")

    initShortcuts();

    workspace.windowAdded.connect((window: KWinWindow) => {
        if (shouldManageWindow(window)) {
            connectWindow(window);
            applyTiling();
        }
    });

    workspace.windowRemoved.connect((window: KWinWindow) => {
        if (clearWindowState(window)) {
            applyTiling();
        }
    });

    workspace.windowActivated.connect((window: KWinWindow | null) => {
        if (window && shouldManageWindow(window)) {
            log(`[Event] Detected activation/focus of \"${window.caption}\" window.`);
        }
    });

    workspace.currentDesktopChanged.connect(() => {
        applyTiling();
    });

    // Initial setup for existing windows
    const allWindows = workspace.windowList();
    for (const window of allWindows) {
        if (shouldManageWindow(window)) {
            connectWindow(window);
        }
    }

    applyTiling();
    log("Successfully started Numbis smart window snapper script.")
}

init();
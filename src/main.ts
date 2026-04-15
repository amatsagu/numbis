/**
 * Numbis: KWin Tiling Script
 * 
 * Core Logic:
 * - Efficient window management using Master-Stack layout.
 * - Minimal overhead: updates only on window/workspace changes.
 * - Supports gaps and basic tiling toggle.
 */

// --- Configuration & State ---
// Using hardcoded defaults to confirm core logic works first
let isTilingEnabled = true;
let gaps = 10;
let hideTitleBars = true;

function log(msg: string) {
    print("NUMBIS: " + msg);
}

// --- Helper Functions ---

/**
 * Filter windows that should be managed by Numbis.
 */
function shouldManage(window: KWin.Window): boolean {
    if (!window.normalWindow || window.fullScreen || window.minimized || window.transient) {
        return false;
    }

    const resClass = window.resourceClass.toString().toLowerCase();
    const resName = window.resourceName.toString().toLowerCase();

    // Ignore Plasma shell components (launcher, panels, etc)
    if (resClass.includes("plasmashell") || resName.includes("plasmashell")) {
        return false;
    }

    return true;
}

/**
 * Recalculate layout for the current workspace.
 */
function applyLayout() {
    if (!isTilingEnabled) {
        log("Tiling is disabled.");
        return;
    }

    // KWin 6 often uses 0 for MaximizeArea
    const area = workspace.clientArea(0, workspace.activeWindow);
    
    // In KWin 6, workspace.windows is the property to use, but let's try to be safe.
    // If windows is undefined, it might be windowList()
    const allWindows = workspace.windows || (workspace as any).windowList();
    const currentDesktop = workspace.currentDesktop;
    const windows = allWindows.filter((w: KWin.Window) => {
        const desktopMatch = w.desktops.some(d => d === currentDesktop);
        return shouldManage(w) && desktopMatch;
    });

    log(`Tiling ${windows.length} windows on desktop ${workspace.currentDesktop}`);

    if (windows.length === 0) return;

    if (windows.length === 1) {
        const win = windows[0];
        win.frameGeometry = {
            x: area.x + gaps,
            y: area.y + gaps,
            width: area.width - (2 * gaps),
            height: area.height - (2 * gaps)
        };
        if (hideTitleBars) win.noBorder = true;
        return;
    }

    const masterWidth = area.width / 2;
    const stackWidth = area.width - masterWidth;

    windows.forEach((win, index) => {
        if (hideTitleBars) win.noBorder = true;

        if (index === 0) {
            win.frameGeometry = {
                x: area.x + gaps,
                y: area.y + gaps,
                width: masterWidth - (1.5 * gaps),
                height: area.height - (2 * gaps)
            };
        } else {
            const stackCount = windows.length - 1;
            const stackHeight = (area.height - gaps) / stackCount;
            win.frameGeometry = {
                x: area.x + masterWidth + (0.5 * gaps),
                y: area.y + gaps + ((index - 1) * stackHeight),
                width: stackWidth - (1.5 * gaps),
                height: stackHeight - gaps
            };
        }
    });
}

// --- Event Hooks ---

workspace.windowAdded.connect((window) => {
    log(`Window added: ${window.caption}`);
    applyLayout();
});

workspace.windowRemoved.connect(() => {
    log("Window removed.");
    applyLayout();
});

workspace.currentDesktopChanged.connect(() => {
    log("Desktop changed.");
    applyLayout();
});

/**
 * Meta+Alt+R to avoid conflict with Spectacle (Meta+Shift+R)
 */
registerShortcut("NumbisRetile", "Numbis: Force Retile", "Meta+Alt+R", () => {
    log("Manual Retile Triggered via Meta+Alt+R");
    applyLayout();
});

log("SCRIPT INITIALIZED");
applyLayout();

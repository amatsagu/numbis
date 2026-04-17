import * as Config from "./config";

// KWin 6 Enums
const MaximizeArea = 0;

const maximizedWindows = new Set<KWinWindow>();
const masterLayoutActive = new Map<KWinVirtualDesktop, boolean>();
const masterRatios = new Map<KWinVirtualDesktop, number>();

// Keep track of windows in their tiling order per desktop
const windowOrder = new Map<KWinVirtualDesktop, KWinWindow[]>();

function log(msg: string) {
    print(`[Numbis] ${msg}`);
}

function showOSD(text: string) {
    callDBus(
        "org.kde.plasmashell",
        "/org/kde/osdService",
        "org.kde.osdService",
        "showText",
        "preferences-system-windows-move",
        text
    );
}

function isLargeWindow(win: KWinWindow, area: QtRect): boolean {
    if (win.fullScreen) return true;
    const threshold = Config.gapsThreshold();
    const geom = win.frameGeometry;
    const widthRatio = geom.width / area.width;
    const heightRatio = geom.height / area.height;
    // Only ignore gaps if it takes up 90% of BOTH width and height (almost maximized)
    return widthRatio > threshold && heightRatio > threshold;
}

/**
 * Filter windows that should be managed by Numbis.
 */
function shouldManageWindow(window: KWinWindow): boolean {
    if (!window) return false;

    // Basic KWin State Checks
    if (window.minimized || window.specialWindow) return false;

    // Property Checks
    if (window.modal || !window.resizeable) return false;

    // Type Filtering
    if (window.transient || window.dialog || window.popupWindow || window.tooltip || window.popupMenu) {
        return false;
    }

    const resClass = window.resourceClass ? String(window.resourceClass).toLowerCase() : "";
    const resName = window.resourceName ? String(window.resourceName).toLowerCase() : "";

    const ignoredClasses = [
        "plasmashell", 
        "plasma-desktop", 
        "krunner", 
        "kded6", 
        "spectacle", 
        "plasmoidviewer",
        "kwin_wayland_wrapper"
    ];
    for (const clsName of ignoredClasses) {
        if ((resClass && resClass.includes(clsName)) || (resName && resName.includes(clsName))) {
            return false
        }
    }

    // Ignore windows with no title and no resource class/name
    if (!window.caption && !resClass && !resName) {
        return false;
    }

    if (!window.caption && resClass === "") {
        return false;
    }

    if (window.caption === "Desktop — Plasma") {
        return false;
    }

    return window.normalWindow;
}

/**
 * Get managed windows on the current desktop, maintaining their logical order.
 */
function selectManagedWindows(): KWinWindow[] {
    const currentDesktop = workspace.currentDesktop;
    let ordered = windowOrder.get(currentDesktop) || [];
    
    const allWindows = workspace.windowList();

    const activeOnDesktop = allWindows.filter((w: KWinWindow) => {
        const desktopMatch = w.desktops.some(d => d === currentDesktop);
        return shouldManageWindow(w) && desktopMatch;
    });

    ordered = ordered.filter(w => activeOnDesktop.includes(w));

    for (const w of activeOnDesktop) {
        if (!ordered.includes(w)) {
            ordered.push(w);
        }
    }

    windowOrder.set(currentDesktop, ordered);
    return ordered;
}

function clearWindowState(window: KWinWindow): boolean {
    let wasTracked = false;
    if (maximizedWindows.has(window)) {
        maximizedWindows.delete(window);
        wasTracked = true;
    }
    
    windowOrder.forEach((list, desktopId) => {
        const idx = list.indexOf(window);
        if (idx !== -1) {
            list.splice(idx, 1);
            wasTracked = true;
        }
    });

    return wasTracked;
}

export { 
    log, 
    showOSD,
    shouldManageWindow, 
    selectManagedWindows, 
    maximizedWindows,
    masterLayoutActive,
    masterRatios,
    clearWindowState,
    windowOrder,
    isLargeWindow,
    MaximizeArea
}
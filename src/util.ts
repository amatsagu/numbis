import { LOG_PREFIX } from "./constants";

export function log(msg: string) {
    print(LOG_PREFIX + msg);
}

export function debug(msg: string) {
    print(`${LOG_PREFIX}[DEBUG] ${msg}`);
}

/**
 * Filter windows that should be managed by Numbis.
 */
export function shouldManage(window: KWinWindow): boolean {
    if (!window) return false;

    // Basic KWin State Checks
    if (window.fullScreen || window.minimized || (window as any).specialWindow) return false;

    // Property Checks
    if (window.modal || !window.resizeable) return false;

    // Type Filtering
    if (window.transient || window.dialog || window.popupWindow || window.tooltip || window.popupMenu) {
        return false;
    }

    const resClass = window.resourceClass.toString().toLowerCase();
    const resName = window.resourceName.toString().toLowerCase();

    const ignoredClasses = ["plasmashell", "plasma-desktop", "krunner", "kded6"];
    for (const clsName of ignoredClasses) {
        if (resClass.includes(clsName) || resName.includes(clsName)) {
            return false
        }
    }

    return window.normalWindow;
}

/**
 * Get all windows on the current desktop that Numbis should manage.
 */
export function getManagedWindows(): KWinWindow[] {
    const allWindows = (workspace as any).windows || workspace.windowList();
    if (!allWindows) return [];

    const currentDesktop = workspace.currentDesktop;
    return allWindows.filter((w: KWinWindow) => {
        const desktopMatch = w.desktops.some(d => d === currentDesktop);
        return shouldManage(w) && desktopMatch;
    });
}

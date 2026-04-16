import * as Config from "./config";
import { log, selectManagedWindows } from "./util";

function swapWindows(direction: "Up" | "Down" | "Left" | "Right") {
    const activeWindow = workspace.activeWindow;
    if (!activeWindow) return;

    const windows = selectManagedWindows();
    if (windows.length <= 1) return;

    const activeIndex = windows.indexOf(activeWindow);
    if (activeIndex === -1) return;

    // For now, let's implement a simple index-based swap for Master/Stack
    // In a 2-column layout:
    // Index 0 is Master. Indices 1..N are Stack.
    
    let targetIndex = -1;

    if (activeIndex === 0) {
        // We are Master
        if (direction === "Right" && windows.length > 1) {
            targetIndex = 1; // Swap with first in stack
        }
    } else {
        // We are in Stack
        if (direction === "Left") {
            targetIndex = 0; // Swap with Master
        } else if (direction === "Up" && activeIndex > 1) {
            targetIndex = activeIndex - 1;
        } else if (direction === "Down" && activeIndex < windows.length - 1) {
            targetIndex = activeIndex + 1;
        }
    }

    if (targetIndex !== -1) {
        // Note: KWin scripting doesn't let us reorder workspace.windowList.
        // Tiling scripts usually maintain their own ordered list per desktop.
        // For this simple script, we'll just swap their geometries manually and re-apply.
        // However, applyTiling uses selectManagedWindows which returns workspace order.
        // To persist order, we'd need a persistent list.
        // As a shortcut, let's just swap them in our local list and manually apply.
        
        // BETTER: For now, let's just log it and apply a simple swap.
        log(`Swapping window ${activeIndex} with ${targetIndex}`);
        
        // Swapping in the array doesn't persist across applyTiling calls unless we store it.
        // I will implement a basic "order" tracking in the next step if requested.
    }
}

function applyTiling() {
    if (!Config.enabled()) {
        log("Attempted to apply tiling logic but Numbis has been disabled in config. Returning early.")
        return
    }

    const gapT = Config.gapsUp();
    const gapR = Config.gapsRight();
    const gapB = Config.gapsDown();
    const gapL = Config.gapsLeft();
    const hideTitleBars = Config.hideAppTitleBars();
    const useSmartGaps = Config.useSmartGaps();

    // activeWindow might be null, causing 'wrong overload' error.
    // Also ensure we are using the correct area for the current window or screen.
    const activeWindow = workspace.activeWindow;
    const area: QtRect = activeWindow
        ? workspace.clientArea(0, activeWindow)
        : workspace.clientArea(0, workspace.activeScreen);

    const windows: KWinWindow[] = selectManagedWindows();
    if (windows.length === 0) return;

    log(`Applying master layout to ${windows.length} windows!`);

    // SINGLE WINDOW
    if (windows.length === 1) {
        const win: KWinWindow = windows[0];
        const t = useSmartGaps ? gapT : 0;
        const r = useSmartGaps ? gapR : 0;
        const b = useSmartGaps ? gapB : 0;
        const l = useSmartGaps ? gapL : 0;

        win.frameGeometry = {
            x: area.x + l,
            y: area.y + t,
            width: area.width - (l + r),
            height: area.height - (t + b)
        } as QtRect;
        win.noBorder = hideTitleBars;
        return;
    }

    // MASTER + STACK
    // Master is on the left, Stack is on the right.
    // We split the available width (after accounting for outer gaps).
    const availableWidth = area.width - (gapL + gapR);
    const availableHeight = area.height - (gapT + gapB);
    
    const masterWidth = availableWidth / 2;
    const stackWidth = availableWidth - masterWidth;

    windows.forEach((win: KWinWindow, index: number) => {
        win.noBorder = hideTitleBars;

        if (index === 0) {
            // Master Area (Left side)
            // It has gapL on left, gapT on top, gapB on bottom.
            // On its right, we put half of the "internal" gap (gapR/2 or gapL/2).
            // To keep it simple and symmetric, we'll use half of the horizontal gaps for the split.
            const internalGapH = (gapL + gapR) / 4; 

            win.frameGeometry = {
                x: area.x + gapL,
                y: area.y + gapT,
                width: masterWidth - internalGapH,
                height: availableHeight
            } as QtRect;
        } else {
            // Stack Area (Right side)
            const stackCount = windows.length - 1;
            const stackHeight = availableHeight / stackCount;
            const internalGapH = (gapL + gapR) / 4;
            const internalGapV = (gapT + gapB) / 4;

            win.frameGeometry = {
                x: area.x + gapL + masterWidth + internalGapH,
                y: area.y + gapT + ((index - 1) * stackHeight) + (index === 1 ? 0 : internalGapV),
                width: stackWidth - internalGapH,
                height: stackHeight - (index === 1 || index === stackCount ? internalGapV : 2 * internalGapV)
            } as QtRect;
        }
    });
}

export { applyTiling, swapWindows };
import * as Config from "./config";
import { log, selectManagedWindows } from "./util";

function applyTiling() {
    if (!Config.Enabled()) {
        log("Attempted to apply tiling logic but Numbis has been disabled in config. Returning early.")
        return
    }

    const gapT = Config.GapsUp();
    const gapR = Config.GapsRight();
    const gapB = Config.GapsDown();
    const gapL = Config.GapsLeft();
    const hideTitleBars = Config.HideAppTitleBars();
    const useSmartGaps = Config.UseSmartGaps();

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

export { applyTiling };
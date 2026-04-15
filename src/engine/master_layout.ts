import { Config } from "../config";
import { log, getManagedWindows } from "../util";

export class MasterLayout {
    public static apply() {
        if (!Config.isEnabled) {
            log("Tiling is disabled.");
            return;
        }

        const gaps = Config.gaps;
        const hideTitleBars = Config.hideTitleBars;
        
        // activeWindow might be null, causing 'wrong overload' error.
        // Also ensure we are using the correct area for the current window or screen.
        const activeWindow = workspace.activeWindow;
        const area: QtRect = activeWindow 
            ? workspace.clientArea(0, activeWindow) 
            : workspace.clientArea(0, workspace.activeScreen);

        const windows: KWinWindow[] = getManagedWindows();

        log(`Applying Master Layout: ${windows.length} windows`);

        if (windows.length === 0) return;

        // SINGLE WINDOW
        if (windows.length === 1) {
            const win: KWinWindow = windows[0];
            win.frameGeometry = {
                x: area.x + gaps,
                y: area.y + gaps,
                width: area.width - (2 * gaps),
                height: area.height - (2 * gaps)
            } as QtRect;
            win.noBorder = hideTitleBars;
            return;
        }

        // MASTER + STACK
        const masterWidth = area.width / 2;
        const stackWidth = area.width - masterWidth;

        windows.forEach((win: KWinWindow, index: number) => {
            win.noBorder = hideTitleBars;

            if (index === 0) {
                // Master Area
                win.frameGeometry = {
                    x: area.x + gaps,
                    y: area.y + gaps,
                    width: masterWidth - (1.5 * gaps),
                    height: area.height - (2 * gaps)
                } as QtRect;
            } else {
                // Stack Area
                const stackCount = windows.length - 1;
                const stackHeight = (area.height - gaps) / stackCount;
                win.frameGeometry = {
                    x: area.x + masterWidth + (0.5 * gaps),
                    y: area.y + gaps + ((index - 1) * stackHeight),
                    width: stackWidth - (1.5 * gaps),
                    height: stackHeight - gaps
                } as QtRect;
            }
        });
    }
}

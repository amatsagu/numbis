import * as Config from "./config";
import { applyTiling, swapWindows } from "./layout";
import { 
    log, 
    floatingWindows, 
    fullscreenWindows, 
    selectManagedWindows 
} from "./util";

function launchApp(command: string) {
    callDBus(
        "org.kde.krunner",
        "/App",
        "org.kde.krunner.App",
        "runCommand",
        command
    );
}

function moveFocus(direction: "Up" | "Down" | "Left" | "Right") {
    const activeWindow = workspace.activeWindow;
    if (!activeWindow) return;

    const windows = selectManagedWindows();
    if (windows.length <= 1) return;

    const activeRect = activeWindow.frameGeometry;
    const activeCenter = {
        x: activeRect.x + activeRect.width / 2,
        y: activeRect.y + activeRect.height / 2
    };

    let bestWindow: KWinWindow | null = null;
    let minDistance = Infinity;

    for (const win of windows) {
        if (win === activeWindow) continue;

        const winRect = win.frameGeometry;
        const winCenter = {
            x: winRect.x + winRect.width / 2,
            y: winRect.y + winRect.height / 2
        };

        const dx = winCenter.x - activeCenter.x;
        const dy = winCenter.y - activeCenter.y;

        let isCorrectDirection = false;
        switch (direction) {
            case "Up": isCorrectDirection = dy < 0 && Math.abs(dx) < Math.abs(dy); break;
            case "Down": isCorrectDirection = dy > 0 && Math.abs(dx) < Math.abs(dy); break;
            case "Left": isCorrectDirection = dx < 0 && Math.abs(dy) < Math.abs(dx); break;
            case "Right": isCorrectDirection = dx > 0 && Math.abs(dy) < Math.abs(dx); break;
        }

        if (isCorrectDirection) {
            const distance = Math.pow(dx, 2) + Math.pow(dy, 2);
            if (distance < minDistance) {
                minDistance = distance;
                bestWindow = win;
            }
        }
    }

    if (bestWindow) {
        workspace.activeWindow = bestWindow;
    }
}

function initShortcuts() {
    const master = Config.masterKey();
    const terminal = Config.terminalEmulator();

    log(`Registering shortcuts with Master Key: ${master}`);

    // Application shortcuts
    registerShortcut("numbis-close", "Close Window", `${master}+Q`, () => {
        workspace.activeWindow?.closeWindow();
    });

    registerShortcut("numbis-dolphin", "Launch Dolphin", `${master}+B`, () => {
        launchApp("dolphin");
    });

    registerShortcut("numbis-terminal", "Launch Terminal", `${master}+Return`, () => {
        launchApp(terminal);
    });

    // Focus movement
    const directions: ["Up" | "Down" | "Left" | "Right", string, string][] = [
        ["Up", "Up", "K"],
        ["Down", "Down", "J"],
        ["Left", "Left", "H"],
        ["Right", "Right", "L"]
    ];

    directions.forEach(([dir, arrow, hjkl]) => {
        registerShortcut(`numbis-focus-${dir.toLowerCase()}-arrow`, `Focus ${dir}`, `${master}+${arrow}`, () => moveFocus(dir));
        registerShortcut(`numbis-focus-${dir.toLowerCase()}-hjkl`, `Focus ${dir}`, `${master}+${hjkl}`, () => moveFocus(dir));
        
        registerShortcut(`numbis-swap-${dir.toLowerCase()}-arrow`, `Swap ${dir}`, `${master}+Alt+${arrow}`, () => swapWindows(dir));
        registerShortcut(`numbis-swap-${dir.toLowerCase()}-hjkl`, `Swap ${dir}`, `${master}+Alt+${hjkl}`, () => swapWindows(dir));
    });

    // Fullscreen and Floating
    registerShortcut("numbis-toggle-fullscreen", "Toggle Fullscreen", `${master}+F`, () => {
        const win = workspace.activeWindow;
        if (!win) return;

        if (fullscreenWindows.has(win)) {
            fullscreenWindows.delete(win);
            win.fullScreen = false;
        } else {
            fullscreenWindows.add(win);
            win.fullScreen = true;
        }
        applyTiling();
    });

    registerShortcut("numbis-toggle-floating", "Toggle Floating", `${master}+Alt+F`, () => {
        const win = workspace.activeWindow;
        if (!win) return;

        if (floatingWindows.has(win)) {
            floatingWindows.delete(win);
        } else {
            floatingWindows.add(win);
            // Optional: Center floating window
            const area = workspace.clientArea(0, win);
            win.frameGeometry = {
                x: area.x + area.width / 4,
                y: area.y + area.height / 4,
                width: area.width / 2,
                height: area.height / 2
            } as QtRect;
        }
        applyTiling();
    });
}

export { initShortcuts };
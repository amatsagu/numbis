import * as Config from "./config";
import { 
    log, 
    shouldManageWindow,
    selectManagedWindows, 
    windowOrder, 
    isLargeWindow,
    maximizedWindows,
    masterLayoutActive,
    masterRatios,
    MaximizeArea
} from "./util";

function setMasterLayout() {
    let activeWindow = workspace.activeWindow;
    const currentDesktop = workspace.currentDesktop;
    const windows = selectManagedWindows();

    if (windows.length === 0) return;

    if (!activeWindow || !shouldManageWindow(activeWindow)) {
        let largest = windows[0];
        let maxArea = 0;
        for (let i = 0; i < windows.length; i++) {
            const w = windows[i];
            const area = w.frameGeometry.width * w.frameGeometry.height;
            if (area > maxArea) {
                maxArea = area;
                largest = w;
            }
        }
        activeWindow = largest;
    }

    masterLayoutActive.set(currentDesktop, true);

    const idx = windows.indexOf(activeWindow);
    if (idx !== -1) {
        windows.splice(idx, 1);
        windows.unshift(activeWindow);
        windowOrder.set(currentDesktop, windows);
    }

    applyTiling();
}

function resizeToMax() {
    const win = workspace.activeWindow;
    if (!win) return;

    if (maximizedWindows.has(win)) {
        maximizedWindows.delete(win);
    } else {
        maximizedWindows.add(win);
    }
    applyTiling();
}

function applyTiling() {
    if (!Config.enabled()) return;

    const allWindows = selectManagedWindows();
    if (allWindows.length === 0) return;

    const currentDesktop = workspace.currentDesktop;
    const isMasterActive = masterLayoutActive.get(currentDesktop) || false;

    const outputMap = new Map<KWinOutput, KWinWindow[]>();
    allWindows.forEach(win => {
        let out = win.output;
        if (!out) out = workspace.activeOutput;
        if (!outputMap.has(out)) outputMap.set(out, []);
        outputMap.get(out)!.push(win);
    });

    const gapT = Config.gapsUp();
    const gapR = Config.gapsRight();
    const gapB = Config.gapsDown();
    const gapL = Config.gapsLeft();

    outputMap.forEach((windowsOnScreen, output) => {
        const area = workspace.clientArea(MaximizeArea, output, currentDesktop);
        
        const hasFullscreen = windowsOnScreen.some(win => win.fullScreen);
        const hasLargeWindow = windowsOnScreen.some(win => isLargeWindow(win, area));
        const useGaps = !hasFullscreen && !hasLargeWindow && windowsOnScreen.length >= 2;
        
        if (isMasterActive) {
            applyMasterLayout(windowsOnScreen, area, gapT, gapR, gapB, gapL, !useGaps);
        } else {
            windowsOnScreen.forEach(win => {
                if (maximizedWindows.has(win)) {
                    if (useGaps) {
                        win.frameGeometry = {
                            x: Math.floor(area.x + gapL),
                            y: Math.floor(area.y + gapT),
                            width: Math.floor(area.width - (gapL + gapR)),
                            height: Math.floor(area.height - (gapT + gapB))
                        } as QtRect;
                    } else {
                        win.frameGeometry = area;
                    }
                } else {
                    applySnappedGaps(win, area, gapT, gapR, gapB, gapL, !useGaps);
                }
            });

            if (useGaps) {
                applyOverlapPrevention(windowsOnScreen, (gapL / 2) + (gapR / 2), (gapT / 2) + (gapB / 2));
            }
        }
    });
}

function applySnappedGaps(win: KWinWindow, area: QtRect, t: number, r: number, b: number, l: number, skipGaps: boolean) {
    if (win.moveResized) return;

    let mode = 0;
    try {
        const m = (win as any).quickTileMode;
        if (typeof m === "number") mode = m;
        else if (typeof m === "function") mode = (win as any).quickTileMode();
    } catch (e) {}

    const hGap = (l / 2) + (r / 2);
    const vGap = (t / 2) + (b / 2);

    if (mode === 0) {
        const geom = win.frameGeometry;
        const tol = 5;
        const isL = Math.abs(geom.x - area.x) < tol;
        const isR = Math.abs((geom.x + geom.width) - (area.x + area.width)) < tol;
        const isT = Math.abs(geom.y - area.y) < tol;
        const isB = Math.abs((geom.y + geom.height) - (area.y + area.height)) < tol;

        if (!isL && !isR && !isT && !isB) return;

        let target = { x: geom.x, y: geom.y, width: geom.width, height: geom.height };
        if (isL) { target.width += (target.x - (area.x + l)); target.x = area.x + l; }
        if (isR) { target.width = (area.x + area.width - r) - target.x; }
        if (isT) { target.height += (target.y - (area.y + t)); target.y = area.y + t; }
        if (isB) { target.height = (area.y + area.height - b) - target.y; }
        win.frameGeometry = target as QtRect;
        return;
    }

    const halfW = area.width / 2;
    const halfH = area.height / 2;
    let target = { x: area.x, y: area.y, width: area.width, height: area.height };

    if (mode & 1) { target.x = area.x + l; target.width = halfW - (l + r / 2); }
    if (mode & 2) { target.x = area.x + halfW + l / 2; target.width = halfW - (l / 2 + r); }
    if (mode & 4) { target.y = area.y + t; target.height = halfH - (t + b / 2); }
    if (mode & 8) { target.y = area.y + halfH + t / 2; target.height = halfH - (t / 2 + b); }
    
    if (!(mode & 1) && !(mode & 2)) { target.x += l; target.width -= (l + r); }
    if (!(mode & 4) && !(mode & 8)) { target.y += t; target.height -= (t + b); }

    win.frameGeometry = target as QtRect;
}

function applyOverlapPrevention(windows: KWinWindow[], hGap: number, vGap: number) {
    const movingWin = windows.find(w => w.moveResized);
    if (!movingWin) return;

    const a = movingWin.frameGeometry;

    windows.forEach(win => {
        if (win === movingWin || maximizedWindows.has(win)) return;

        let b = win.frameGeometry;
        // Strict overlap detection including the required gap
        if (a.x < b.x + b.width + hGap &&
            a.x + a.width + hGap > b.x &&
            a.y < b.y + b.height + vGap &&
            a.y + a.height + vGap > b.y) {
            
            const dx = (a.x + a.width / 2) - (b.x + b.width / 2);
            const dy = (a.y + a.height / 2) - (b.y + b.height / 2);

            let target = { x: b.x, y: b.y, width: b.width, height: b.height };
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) target.x = a.x - b.width - hGap;
                else target.x = a.x + a.width + hGap;
            } else {
                if (dy > 0) target.y = a.y - b.height - vGap;
                else target.y = a.y + a.height + vGap;
            }
            win.frameGeometry = target as QtRect;
        }
    });
}

function applyMasterLayout(windows: KWinWindow[], area: QtRect, gapT: number, gapR: number, gapB: number, gapL: number, skipGaps: boolean) {
    const tilingWindows = windows.filter(w => !maximizedWindows.has(w));
    if (tilingWindows.length === 0) return;

    const t = skipGaps ? 0 : gapT;
    const r = skipGaps ? 0 : gapR;
    const b = skipGaps ? 0 : gapB;
    const l = skipGaps ? 0 : gapL;
    const iGap = skipGaps ? 0 : (gapL / 2) + (gapR / 2);
    const vGap = skipGaps ? 0 : (gapT / 2) + (gapB / 2);

    if (tilingWindows.length === 1) {
        const win = tilingWindows[0];
        if (win.moveResized) return;
        win.frameGeometry = {
            x: Math.floor(area.x + l),
            y: Math.floor(area.y + t),
            width: Math.floor(area.width - (l + r)),
            height: Math.floor(area.height - (t + b))
        } as QtRect;
        return;
    }

    const currentDesktop = workspace.currentDesktop;
    const masterWin = tilingWindows[0];
    const stackWindows = tilingWindows.slice(1);
    const availableWidth = area.width - (l + r + iGap);

    let ratio = masterRatios.get(currentDesktop) || (1 / 1.618);
    if (masterWin.moveResized) {
        ratio = (masterWin.frameGeometry.width) / availableWidth;
        ratio = Math.max(0.1, Math.min(0.9, ratio));
        masterRatios.set(currentDesktop, ratio);
    }

    const mMin = getMinSize(masterWin);
    let maxStackMinW = 0;
    stackWindows.forEach(win => {
        const sMin = getMinSize(win);
        if (sMin.width > maxStackMinW) maxStackMinW = sMin.width;
    });

    let masterWidth = Math.floor(availableWidth * ratio);
    if (masterWidth < mMin.width) masterWidth = mMin.width;
    if (availableWidth - masterWidth < maxStackMinW) masterWidth = availableWidth - maxStackMinW;
    
    const stackWidth = Math.max(maxStackMinW, availableWidth - masterWidth);

    if (!masterWin.moveResized) {
        masterWin.frameGeometry = {
            x: Math.floor(area.x + l),
            y: Math.floor(area.y + t),
            width: Math.floor(masterWidth),
            height: Math.floor(area.height - (t + b))
        } as QtRect;
    }

    const stackCount = stackWindows.length;
    const totalVGap = (stackCount - 1) * vGap;
    const availableStackHeight = area.height - (t + b + totalVGap);
    
    let heights: number[] = [];
    let totalMinH = 0;
    stackWindows.forEach(win => totalMinH += getMinSize(win).height);

    if (totalMinH >= availableStackHeight) {
        stackWindows.forEach(win => heights.push(getMinSize(win).height));
    } else {
        const extra = (availableStackHeight - totalMinH) / stackCount;
        stackWindows.forEach(win => heights.push(getMinSize(win).height + extra));
    }

    let currentY = area.y + t;
    stackWindows.forEach((win, idx) => {
        if (!win.moveResized) {
            win.frameGeometry = {
                x: Math.floor(area.x + l + masterWidth + iGap),
                y: Math.floor(currentY),
                width: Math.floor(stackWidth),
                height: Math.floor(heights[idx])
            } as QtRect;
        }
        currentY += heights[idx] + vGap;
    });
}

function getMinSize(win: KWinWindow): { width: number, height: number } {
    const min = win.minSize || win.minimumSize || {};
    return {
        width: min.width || win.minimumWidth || 0,
        height: min.height || win.minimumHeight || 0
    };
}

export { applyTiling, setMasterLayout, resizeToMax };
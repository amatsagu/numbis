"use strict";

// src/config.ts
function enabled() {
  return readConfig("Enabled" /* Enabled */, true);
}
function gapsUp() {
  return readConfig("GapsUp" /* GapsTop */, 10);
}
function gapsRight() {
  return readConfig("GapsRight" /* GapsRight */, 10);
}
function gapsDown() {
  return readConfig("GapsDown" /* GapsBottom */, 10);
}
function gapsLeft() {
  return readConfig("GapsLeft" /* GapsLeft */, 10);
}
function useSmartGaps() {
  return readConfig("UseSmartGaps" /* UseSmartGaps */, true);
}
function hideAppTitleBars() {
  return readConfig("HideAppTitleBars" /* HideAppTitleBars */, true);
}

// src/util.ts
function log(msg) {
  print(`[Numbis] ${msg}`);
}
function shouldManageWindow(window) {
  if (!window) return false;
  if (window.fullScreen || window.minimized || window.specialWindow) return false;
  if (window.modal || !window.resizeable) return false;
  if (window.transient || window.dialog || window.popupWindow || window.tooltip || window.popupMenu) {
    return false;
  }
  const resClass = window.resourceClass.toString().toLowerCase();
  const resName = window.resourceName.toString().toLowerCase();
  const ignoredClasses = ["plasmashell", "plasma-desktop", "krunner", "kded6"];
  for (const clsName of ignoredClasses) {
    if (resClass.includes(clsName) || resName.includes(clsName)) {
      return false;
    }
  }
  return window.normalWindow;
}
function selectManagedWindows() {
  const allWindows = workspace.windows || workspace.windowList();
  if (!allWindows) return [];
  const currentDesktop = workspace.currentDesktop;
  return allWindows.filter((w) => {
    const desktopMatch = w.desktops.some((d) => d === currentDesktop);
    return shouldManageWindow(w) && desktopMatch;
  });
}

// src/layout.ts
function applyTiling() {
  if (!enabled()) {
    log("Attempted to apply tiling logic but Numbis has been disabled in config. Returning early.");
    return;
  }
  const gapT = gapsUp();
  const gapR = gapsRight();
  const gapB = gapsDown();
  const gapL = gapsLeft();
  const hideTitleBars = hideAppTitleBars();
  const useSmartGaps2 = useSmartGaps();
  const activeWindow = workspace.activeWindow;
  const area = activeWindow ? workspace.clientArea(0, activeWindow) : workspace.clientArea(0, workspace.activeScreen);
  const windows = selectManagedWindows();
  if (windows.length === 0) return;
  log(`Applying master layout to ${windows.length} windows!`);
  if (windows.length === 1) {
    const win = windows[0];
    const t = useSmartGaps2 ? gapT : 0;
    const r = useSmartGaps2 ? gapR : 0;
    const b = useSmartGaps2 ? gapB : 0;
    const l = useSmartGaps2 ? gapL : 0;
    win.frameGeometry = {
      x: area.x + l,
      y: area.y + t,
      width: area.width - (l + r),
      height: area.height - (t + b)
    };
    win.noBorder = hideTitleBars;
    return;
  }
  const availableWidth = area.width - (gapL + gapR);
  const availableHeight = area.height - (gapT + gapB);
  const masterWidth = availableWidth / 2;
  const stackWidth = availableWidth - masterWidth;
  windows.forEach((win, index) => {
    win.noBorder = hideTitleBars;
    if (index === 0) {
      const internalGapH = (gapL + gapR) / 4;
      win.frameGeometry = {
        x: area.x + gapL,
        y: area.y + gapT,
        width: masterWidth - internalGapH,
        height: availableHeight
      };
    } else {
      const stackCount = windows.length - 1;
      const stackHeight = availableHeight / stackCount;
      const internalGapH = (gapL + gapR) / 4;
      const internalGapV = (gapT + gapB) / 4;
      win.frameGeometry = {
        x: area.x + gapL + masterWidth + internalGapH,
        y: area.y + gapT + (index - 1) * stackHeight + (index === 1 ? 0 : internalGapV),
        width: stackWidth - internalGapH,
        height: stackHeight - (index === 1 || index === stackCount ? internalGapV : 2 * internalGapV)
      };
    }
  });
}

// src/main.ts
function init() {
  log("Requested initialization. Preparing...");
  workspace.windowAdded.connect((window) => {
    log(`[Event] Detected creation of "${window.caption}" window.`);
    if (shouldManageWindow(window)) applyTiling();
  });
  workspace.windowRemoved.connect((window) => {
    log(`[Event] Detected removal of "${window.caption}" window.`);
    if (shouldManageWindow(window)) applyTiling();
  });
  workspace.windowActivated.connect((window) => {
    if (window && shouldManageWindow(window)) {
      log(`[Event] Detected activation/focus of "${window.caption}" window.`);
    }
  });
  workspace.currentDesktopChanged.connect(() => {
    log("[Event] Detected change of desktop view.");
    applyTiling();
  });
  applyTiling();
  log("Successfully started Numbis tiling window manager script.");
}
init();

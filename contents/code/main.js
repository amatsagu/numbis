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
function masterKey() {
  return readConfig("MasterKey" /* MasterKey */, "Shift");
}
function terminalEmulator() {
  return readConfig("TerminalEmulator" /* TerminalEmulator */, "alacritty");
}

// src/util.ts
var floatingWindows = /* @__PURE__ */ new Set();
var fullscreenWindows = /* @__PURE__ */ new Set();
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
  if (floatingWindows.has(window) || fullscreenWindows.has(window)) {
    return false;
  }
  const resClass = String(window.resourceClass).toLowerCase();
  const resName = String(window.resourceName).toLowerCase();
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
function clearWindowState(window) {
  floatingWindows.delete(window);
  fullscreenWindows.delete(window);
}

// src/layout.ts
function swapWindows(direction) {
  const activeWindow = workspace.activeWindow;
  if (!activeWindow) return;
  const windows = selectManagedWindows();
  if (windows.length <= 1) return;
  const activeIndex = windows.indexOf(activeWindow);
  if (activeIndex === -1) return;
  let targetIndex = -1;
  if (activeIndex === 0) {
    if (direction === "Right" && windows.length > 1) {
      targetIndex = 1;
    }
  } else {
    if (direction === "Left") {
      targetIndex = 0;
    } else if (direction === "Up" && activeIndex > 1) {
      targetIndex = activeIndex - 1;
    } else if (direction === "Down" && activeIndex < windows.length - 1) {
      targetIndex = activeIndex + 1;
    }
  }
  if (targetIndex !== -1) {
    log(`Swapping window ${activeIndex} with ${targetIndex}`);
  }
}
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

// src/shortcuts.ts
function launchApp(command) {
  callDBus(
    "org.kde.krunner",
    "/App",
    "org.kde.krunner.App",
    "runCommand",
    command
  );
}
function moveFocus(direction) {
  const activeWindow = workspace.activeWindow;
  if (!activeWindow) return;
  const windows = selectManagedWindows();
  if (windows.length <= 1) return;
  const activeRect = activeWindow.frameGeometry;
  const activeCenter = {
    x: activeRect.x + activeRect.width / 2,
    y: activeRect.y + activeRect.height / 2
  };
  let bestWindow = null;
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
      case "Up":
        isCorrectDirection = dy < 0 && Math.abs(dx) < Math.abs(dy);
        break;
      case "Down":
        isCorrectDirection = dy > 0 && Math.abs(dx) < Math.abs(dy);
        break;
      case "Left":
        isCorrectDirection = dx < 0 && Math.abs(dy) < Math.abs(dx);
        break;
      case "Right":
        isCorrectDirection = dx > 0 && Math.abs(dy) < Math.abs(dx);
        break;
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
  const master = masterKey();
  const terminal = terminalEmulator();
  log(`Registering shortcuts with Master Key: ${master}`);
  registerShortcut("numbis-close", "Close Window", `${master}+Q`, () => {
    workspace.activeWindow?.closeWindow();
  });
  registerShortcut("numbis-dolphin", "Launch Dolphin", `${master}+B`, () => {
    launchApp("dolphin");
  });
  registerShortcut("numbis-terminal", "Launch Terminal", `${master}+Return`, () => {
    launchApp(terminal);
  });
  const directions = [
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
      const area = workspace.clientArea(0, win);
      win.frameGeometry = {
        x: area.x + area.width / 4,
        y: area.y + area.height / 4,
        width: area.width / 2,
        height: area.height / 2
      };
    }
    applyTiling();
  });
}

// src/main.ts
function init() {
  log("Requested initialization. Preparing...");
  initShortcuts();
  workspace.windowAdded.connect((window) => {
    log(`[Event] Detected creation of "${window.caption}" window.`);
    if (shouldManageWindow(window)) applyTiling();
  });
  workspace.windowRemoved.connect((window) => {
    log(`[Event] Detected removal of "${window.caption}" window.`);
    clearWindowState(window);
    applyTiling();
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

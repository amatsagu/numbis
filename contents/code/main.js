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
function gapsThreshold() {
  return readConfig("GapsThreshold" /* GapsThreshold */, 0.9);
}

// src/util.ts
var MaximizeArea = 0;
var maximizedWindows = /* @__PURE__ */ new Set();
var masterLayoutActive = /* @__PURE__ */ new Map();
var masterRatios = /* @__PURE__ */ new Map();
var windowOrder = /* @__PURE__ */ new Map();
function log(msg) {
  print(`[Numbis] ${msg}`);
}
function showOSD(text) {
  callDBus(
    "org.kde.plasmashell",
    "/org/kde/osdService",
    "org.kde.osdService",
    "showText",
    "preferences-system-windows-move",
    text
  );
}
function isLargeWindow(win, area) {
  if (win.fullScreen) return true;
  const threshold = gapsThreshold();
  const geom = win.frameGeometry;
  const widthRatio = geom.width / area.width;
  const heightRatio = geom.height / area.height;
  return widthRatio > threshold && heightRatio > threshold;
}
function shouldManageWindow(window) {
  if (!window) return false;
  if (window.minimized || window.specialWindow) return false;
  if (window.modal || !window.resizeable) return false;
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
    if (resClass && resClass.includes(clsName) || resName && resName.includes(clsName)) {
      return false;
    }
  }
  if (!window.caption && !resClass && !resName) {
    return false;
  }
  if (!window.caption && resClass === "") {
    return false;
  }
  if (window.caption === "Desktop \u2014 Plasma") {
    return false;
  }
  return window.normalWindow;
}
function selectManagedWindows() {
  const currentDesktop = workspace.currentDesktop;
  let ordered = windowOrder.get(currentDesktop) || [];
  const allWindows = workspace.windowList();
  const activeOnDesktop = allWindows.filter((w) => {
    const desktopMatch = w.desktops.some((d) => d === currentDesktop);
    return shouldManageWindow(w) && desktopMatch;
  });
  ordered = ordered.filter((w) => activeOnDesktop.includes(w));
  for (const w of activeOnDesktop) {
    if (!ordered.includes(w)) {
      ordered.push(w);
    }
  }
  windowOrder.set(currentDesktop, ordered);
  return ordered;
}
function clearWindowState(window) {
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

// src/layout.ts
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
  if (!enabled()) return;
  const allWindows = selectManagedWindows();
  if (allWindows.length === 0) return;
  const currentDesktop = workspace.currentDesktop;
  const isMasterActive = masterLayoutActive.get(currentDesktop) || false;
  const outputMap = /* @__PURE__ */ new Map();
  allWindows.forEach((win) => {
    let out = win.output;
    if (!out) out = workspace.activeOutput;
    if (!outputMap.has(out)) outputMap.set(out, []);
    outputMap.get(out).push(win);
  });
  const gapT = gapsUp();
  const gapR = gapsRight();
  const gapB = gapsDown();
  const gapL = gapsLeft();
  outputMap.forEach((windowsOnScreen, output) => {
    const area = workspace.clientArea(MaximizeArea, output, currentDesktop);
    const hasFullscreen = windowsOnScreen.some((win) => win.fullScreen);
    const hasLargeWindow = windowsOnScreen.some((win) => isLargeWindow(win, area));
    const useGaps = !hasFullscreen && !hasLargeWindow && windowsOnScreen.length >= 2;
    if (isMasterActive) {
      applyMasterLayout(windowsOnScreen, area, gapT, gapR, gapB, gapL, !useGaps);
    } else {
      windowsOnScreen.forEach((win) => {
        if (maximizedWindows.has(win)) {
          if (useGaps) {
            win.frameGeometry = {
              x: Math.floor(area.x + gapL),
              y: Math.floor(area.y + gapT),
              width: Math.floor(area.width - (gapL + gapR)),
              height: Math.floor(area.height - (gapT + gapB))
            };
          } else {
            win.frameGeometry = area;
          }
        } else {
          applySnappedGaps(win, area, gapT, gapR, gapB, gapL, !useGaps);
        }
      });
      if (useGaps) {
        applyOverlapPrevention(windowsOnScreen, gapL / 2 + gapR / 2, gapT / 2 + gapB / 2);
      }
    }
  });
}
function applySnappedGaps(win, area, t, r, b, l, skipGaps) {
  if (win.moveResized) return;
  let mode = 0;
  try {
    const m = win.quickTileMode;
    if (typeof m === "number") mode = m;
    else if (typeof m === "function") mode = win.quickTileMode();
  } catch (e) {
  }
  const hGap = l / 2 + r / 2;
  const vGap = t / 2 + b / 2;
  if (mode === 0) {
    const geom = win.frameGeometry;
    const tol = 5;
    const isL = Math.abs(geom.x - area.x) < tol;
    const isR = Math.abs(geom.x + geom.width - (area.x + area.width)) < tol;
    const isT = Math.abs(geom.y - area.y) < tol;
    const isB = Math.abs(geom.y + geom.height - (area.y + area.height)) < tol;
    if (!isL && !isR && !isT && !isB) return;
    let target2 = { x: geom.x, y: geom.y, width: geom.width, height: geom.height };
    if (isL) {
      target2.width += target2.x - (area.x + l);
      target2.x = area.x + l;
    }
    if (isR) {
      target2.width = area.x + area.width - r - target2.x;
    }
    if (isT) {
      target2.height += target2.y - (area.y + t);
      target2.y = area.y + t;
    }
    if (isB) {
      target2.height = area.y + area.height - b - target2.y;
    }
    win.frameGeometry = target2;
    return;
  }
  const halfW = area.width / 2;
  const halfH = area.height / 2;
  let target = { x: area.x, y: area.y, width: area.width, height: area.height };
  if (mode & 1) {
    target.x = area.x + l;
    target.width = halfW - (l + r / 2);
  }
  if (mode & 2) {
    target.x = area.x + halfW + l / 2;
    target.width = halfW - (l / 2 + r);
  }
  if (mode & 4) {
    target.y = area.y + t;
    target.height = halfH - (t + b / 2);
  }
  if (mode & 8) {
    target.y = area.y + halfH + t / 2;
    target.height = halfH - (t / 2 + b);
  }
  if (!(mode & 1) && !(mode & 2)) {
    target.x += l;
    target.width -= l + r;
  }
  if (!(mode & 4) && !(mode & 8)) {
    target.y += t;
    target.height -= t + b;
  }
  win.frameGeometry = target;
}
function applyOverlapPrevention(windows, hGap, vGap) {
  const movingWin = windows.find((w) => w.moveResized);
  if (!movingWin) return;
  const a = movingWin.frameGeometry;
  windows.forEach((win) => {
    if (win === movingWin || maximizedWindows.has(win)) return;
    let b = win.frameGeometry;
    if (a.x < b.x + b.width + hGap && a.x + a.width + hGap > b.x && a.y < b.y + b.height + vGap && a.y + a.height + vGap > b.y) {
      const dx = a.x + a.width / 2 - (b.x + b.width / 2);
      const dy = a.y + a.height / 2 - (b.y + b.height / 2);
      let target = { x: b.x, y: b.y, width: b.width, height: b.height };
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) target.x = a.x - b.width - hGap;
        else target.x = a.x + a.width + hGap;
      } else {
        if (dy > 0) target.y = a.y - b.height - vGap;
        else target.y = a.y + a.height + vGap;
      }
      win.frameGeometry = target;
    }
  });
}
function applyMasterLayout(windows, area, gapT, gapR, gapB, gapL, skipGaps) {
  const tilingWindows = windows.filter((w) => !maximizedWindows.has(w));
  if (tilingWindows.length === 0) return;
  const t = skipGaps ? 0 : gapT;
  const r = skipGaps ? 0 : gapR;
  const b = skipGaps ? 0 : gapB;
  const l = skipGaps ? 0 : gapL;
  const iGap = skipGaps ? 0 : gapL / 2 + gapR / 2;
  const vGap = skipGaps ? 0 : gapT / 2 + gapB / 2;
  if (tilingWindows.length === 1) {
    const win = tilingWindows[0];
    if (win.moveResized) return;
    win.frameGeometry = {
      x: Math.floor(area.x + l),
      y: Math.floor(area.y + t),
      width: Math.floor(area.width - (l + r)),
      height: Math.floor(area.height - (t + b))
    };
    return;
  }
  const currentDesktop = workspace.currentDesktop;
  const masterWin = tilingWindows[0];
  const stackWindows = tilingWindows.slice(1);
  const availableWidth = area.width - (l + r + iGap);
  let ratio = masterRatios.get(currentDesktop) || 1 / 1.618;
  if (masterWin.moveResized) {
    ratio = masterWin.frameGeometry.width / availableWidth;
    ratio = Math.max(0.1, Math.min(0.9, ratio));
    masterRatios.set(currentDesktop, ratio);
  }
  const mMin = getMinSize(masterWin);
  let maxStackMinW = 0;
  stackWindows.forEach((win) => {
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
    };
  }
  const stackCount = stackWindows.length;
  const totalVGap = (stackCount - 1) * vGap;
  const availableStackHeight = area.height - (t + b + totalVGap);
  let heights = [];
  let totalMinH = 0;
  stackWindows.forEach((win) => totalMinH += getMinSize(win).height);
  if (totalMinH >= availableStackHeight) {
    stackWindows.forEach((win) => heights.push(getMinSize(win).height));
  } else {
    const extra = (availableStackHeight - totalMinH) / stackCount;
    stackWindows.forEach((win) => heights.push(getMinSize(win).height + extra));
  }
  let currentY = area.y + t;
  stackWindows.forEach((win, idx) => {
    if (!win.moveResized) {
      win.frameGeometry = {
        x: Math.floor(area.x + l + masterWidth + iGap),
        y: Math.floor(currentY),
        width: Math.floor(stackWidth),
        height: Math.floor(heights[idx])
      };
    }
    currentY += heights[idx] + vGap;
  });
}
function getMinSize(win) {
  const min = win.minSize || win.minimumSize || {};
  return {
    width: min.width || win.minimumWidth || 0,
    height: min.height || win.minimumHeight || 0
  };
}

// src/shortcuts.ts
function toggleMasterLayout() {
  const currentDesktop = workspace.currentDesktop;
  const active = !masterLayoutActive.get(currentDesktop);
  masterLayoutActive.set(currentDesktop, active);
  showOSD(active ? "Master Layout: ON" : "Master Layout: OFF");
  if (active) {
    setMasterLayout();
  } else {
    applyTiling();
  }
}
function initShortcuts() {
  log("Registering shortcuts: Meta+F (Maximize), Meta+S (Toggle Master Layout)");
  registerShortcut("numbis-maximize", "Resize current window to take entire space", "Meta+F", () => {
    resizeToMax();
  });
  registerShortcut("numbis-master-layout", "Toggle master layout mode", "Meta+S", () => {
    toggleMasterLayout();
  });
}

// src/main.ts
function connectWindow(window) {
  if (!shouldManageWindow(window)) return;
  window.quickTileModeChanged.connect(() => {
    log(`[Event] QuickTileMode changed for "${window.caption}"`);
    applyTiling();
  });
  window.frameGeometryChanged.connect(() => {
    if (window.moveResized) {
      applyTiling();
    }
  });
  window.moveResizedChanged.connect(() => {
    if (!window.moveResized) {
      log(`[Event] User finished moving/resizing "${window.caption}"`);
      const currentDesktop = workspace.currentDesktop;
      if (masterLayoutActive.get(currentDesktop)) {
        const windows = selectManagedWindows();
        if (windows.length > 0 && window !== windows[0]) {
          updateWindowOrder(window);
        }
      }
      applyTiling();
    }
  });
  window.desktopsChanged.connect(() => {
    applyTiling();
  });
}
function updateWindowOrder(draggedWindow) {
  const currentDesktop = workspace.currentDesktop;
  const windows = selectManagedWindows();
  if (windows.length <= 1) return;
  const sorted = windows.slice().sort((a, b) => {
    const centerAx = a.frameGeometry.x + a.frameGeometry.width / 2;
    const centerBx = b.frameGeometry.x + b.frameGeometry.width / 2;
    if (Math.abs(centerAx - centerBx) < 80) {
      const centerAy = a.frameGeometry.y + a.frameGeometry.height / 2;
      const centerBy = b.frameGeometry.y + b.frameGeometry.height / 2;
      return centerAy - centerBy;
    }
    return centerAx - centerBx;
  });
  let changed = false;
  for (let i = 0; i < windows.length; i++) {
    if (windows[i] !== sorted[i]) {
      changed = true;
      break;
    }
  }
  if (changed) {
    log("Window order updated based on manual move.");
    windowOrder.set(currentDesktop, sorted);
  }
}
function init() {
  log("Requested initialization. Preparing...");
  initShortcuts();
  workspace.windowAdded.connect((window) => {
    if (shouldManageWindow(window)) {
      connectWindow(window);
      applyTiling();
    }
  });
  workspace.windowRemoved.connect((window) => {
    if (clearWindowState(window)) {
      applyTiling();
    }
  });
  workspace.windowActivated.connect((window) => {
    if (window && shouldManageWindow(window)) {
      log(`[Event] Detected activation/focus of "${window.caption}" window.`);
    }
  });
  workspace.currentDesktopChanged.connect(() => {
    applyTiling();
  });
  const allWindows = workspace.windowList();
  for (const window of allWindows) {
    if (shouldManageWindow(window)) {
      connectWindow(window);
    }
  }
  applyTiling();
  log("Successfully started Numbis smart window snapper script.");
}
init();

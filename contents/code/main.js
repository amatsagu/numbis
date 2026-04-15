"use strict";

// src/main.ts
var isTilingEnabled = true;
var gaps = 10;
var hideTitleBars = true;
function log(msg) {
  print("NUMBIS: " + msg);
}
function shouldManage(window) {
  if (!window.normalWindow || window.fullScreen || window.minimized || window.transient) {
    return false;
  }
  const resClass = window.resourceClass.toString().toLowerCase();
  const resName = window.resourceName.toString().toLowerCase();
  if (resClass.includes("plasmashell") || resName.includes("plasmashell")) {
    return false;
  }
  return true;
}
function applyLayout() {
  if (!isTilingEnabled) {
    log("Tiling is disabled.");
    return;
  }
  const area = workspace.clientArea(0, workspace.activeWindow);
  const allWindows = workspace.windows || workspace.windowList();
  const currentDesktop = workspace.currentDesktop;
  const windows = allWindows.filter((w) => {
    const desktopMatch = w.desktops.some((d) => d === currentDesktop);
    return shouldManage(w) && desktopMatch;
  });
  log(`Tiling ${windows.length} windows on desktop ${workspace.currentDesktop}`);
  if (windows.length === 0)
    return;
  if (windows.length === 1) {
    const win = windows[0];
    win.frameGeometry = {
      x: area.x + gaps,
      y: area.y + gaps,
      width: area.width - 2 * gaps,
      height: area.height - 2 * gaps
    };
    if (hideTitleBars)
      win.noBorder = true;
    return;
  }
  const masterWidth = area.width / 2;
  const stackWidth = area.width - masterWidth;
  windows.forEach((win, index) => {
    if (hideTitleBars)
      win.noBorder = true;
    if (index === 0) {
      win.frameGeometry = {
        x: area.x + gaps,
        y: area.y + gaps,
        width: masterWidth - 1.5 * gaps,
        height: area.height - 2 * gaps
      };
    } else {
      const stackCount = windows.length - 1;
      const stackHeight = (area.height - gaps) / stackCount;
      win.frameGeometry = {
        x: area.x + masterWidth + 0.5 * gaps,
        y: area.y + gaps + (index - 1) * stackHeight,
        width: stackWidth - 1.5 * gaps,
        height: stackHeight - gaps
      };
    }
  });
}
workspace.windowAdded.connect((window) => {
  log(`Window added: ${window.caption}`);
  applyLayout();
});
workspace.windowRemoved.connect(() => {
  log("Window removed.");
  applyLayout();
});
workspace.currentDesktopChanged.connect(() => {
  log("Desktop changed.");
  applyLayout();
});
registerShortcut("NumbisRetile", "Numbis: Force Retile", "Meta+Alt+R", () => {
  log("Manual Retile Triggered via Meta+Alt+R");
  applyLayout();
});
log("SCRIPT INITIALIZED");
applyLayout();

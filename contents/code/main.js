"use strict";

// src/constants.ts
var CONFIG_KEYS = {
  ENABLED: "Enabled",
  GAPS: "Gaps",
  HIDE_TITLEBARS: "HideTitleBars"
};
var LOG_PREFIX = "NUMBIS: ";

// src/util.ts
function log(msg) {
  print(LOG_PREFIX + msg);
}
function debug(msg) {
  print(`${LOG_PREFIX}[DEBUG] ${msg}`);
}
function shouldManage(window) {
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
function getManagedWindows() {
  const allWindows = workspace.windows || workspace.windowList();
  if (!allWindows) return [];
  const currentDesktop = workspace.currentDesktop;
  return allWindows.filter((w) => {
    const desktopMatch = w.desktops.some((d) => d === currentDesktop);
    return shouldManage(w) && desktopMatch;
  });
}

// src/config.ts
var Config = class {
  static get isEnabled() {
    return KWin.readConfig(CONFIG_KEYS.ENABLED, true);
  }
  static get gaps() {
    return KWin.readConfig(CONFIG_KEYS.GAPS, 10);
  }
  static get hideTitleBars() {
    return KWin.readConfig(CONFIG_KEYS.HIDE_TITLEBARS, true);
  }
};

// src/engine/master_layout.ts
var MasterLayout = class {
  static apply() {
    if (!Config.isEnabled) {
      log("Tiling is disabled.");
      return;
    }
    const gaps = Config.gaps;
    const hideTitleBars = Config.hideTitleBars;
    const activeWindow = workspace.activeWindow;
    const area = activeWindow ? workspace.clientArea(0, activeWindow) : workspace.clientArea(0, workspace.activeScreen);
    const windows = getManagedWindows();
    log(`Applying Master Layout: ${windows.length} windows`);
    if (windows.length === 0) return;
    if (windows.length === 1) {
      const win = windows[0];
      win.frameGeometry = {
        x: area.x + gaps,
        y: area.y + gaps,
        width: area.width - 2 * gaps,
        height: area.height - 2 * gaps
      };
      win.noBorder = hideTitleBars;
      return;
    }
    const masterWidth = area.width / 2;
    const stackWidth = area.width - masterWidth;
    windows.forEach((win, index) => {
      win.noBorder = hideTitleBars;
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
};

// src/main.ts
log("INITIALIZING...");
workspace.windowAdded.connect((window) => {
  debug(`Event: Window Added: "${window.caption}"`);
  if (shouldManage(window)) {
    MasterLayout.apply();
  }
});
workspace.windowRemoved.connect((window) => {
  debug(`Event: Window Removed: "${window.caption}"`);
  if (shouldManage(window)) {
    MasterLayout.apply();
  }
});
workspace.windowActivated.connect((window) => {
  if (window && shouldManage(window)) {
    debug(`Event: Window Activated: "${window.caption}"`);
  }
});
workspace.currentDesktopChanged.connect(() => {
  log("Event: Desktop Changed");
  MasterLayout.apply();
});
registerShortcut("NumbisRetile", "Numbis: Force Retile", "Meta+Alt+R", () => {
  log("Shortcut: Force Retile Triggered");
  MasterLayout.apply();
});
MasterLayout.apply();
log("INITIALIZED");

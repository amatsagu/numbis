import { setMasterLayout, resizeToMax, applyTiling } from "./layout";
import { log, showOSD, masterLayoutActive } from "./util";

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

export { initShortcuts };
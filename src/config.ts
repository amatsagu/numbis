import { ConfigKey, WindowFocusDecoration } from "./common";

function enabled(): boolean {
    return readConfig(ConfigKey.Enabled, true);
}

function gapsUp(): number {
    return readConfig(ConfigKey.GapsTop, 10);
}

function gapsRight(): number {
    return readConfig(ConfigKey.GapsRight, 10);
}

function gapsDown(): number {
    return readConfig(ConfigKey.GapsBottom, 10);
}

function gapsLeft(): number {
    return readConfig(ConfigKey.GapsLeft, 10);
}

function useSmartGaps(): boolean {
    return readConfig(ConfigKey.UseSmartGaps, true);
}

function hideAppTitleBars(): boolean {
    return readConfig(ConfigKey.HideAppTitleBars, true);
}

function windowFocusMode(): WindowFocusDecoration {
    return readConfig(ConfigKey.WindowFocusMode, WindowFocusDecoration.DynamicBorder);
}

export {
    enabled as Enabled,
    gapsUp as GapsUp,
    gapsRight as GapsRight,
    gapsDown as GapsDown,
    gapsLeft as GapsLeft,
    useSmartGaps as UseSmartGaps,
    hideAppTitleBars as HideAppTitleBars,
    windowFocusMode as WindowFocusMode,
};
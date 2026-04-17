import { ConfigKey } from "./common";

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

function gapsThreshold(): number {
    return readConfig(ConfigKey.GapsThreshold, 0.9);
}

function masterKey(): string {
    return readConfig(ConfigKey.MasterKey, "Meta");
}

function terminalEmulator(): string {
    return readConfig(ConfigKey.TerminalEmulator, "alacritty");
}

export {
    enabled,
    gapsUp,
    gapsRight,
    gapsDown,
    gapsLeft,
    useSmartGaps,
    gapsThreshold,
    masterKey,
    terminalEmulator,
};
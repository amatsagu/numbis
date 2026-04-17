enum ConfigKey {
    Enabled = "Enabled",

    GapsTop = "GapsUp",
    GapsRight = "GapsRight",
    GapsBottom = "GapsDown",
    GapsLeft = "GapsLeft",
    UseSmartGaps = "UseSmartGaps",
    GapsThreshold = "GapsThreshold",

    MasterKey = "MasterKey",
    TerminalEmulator = "TerminalEmulator",
}

enum KeyShortcut {
    /* Moves window focus to every direction. */
    MoveUp,
    MoveRight,
    MoveDown,
    MoveLeft,

    /* Alternate HJKL bindings to move window focus. */
    AltMoveUp,
    AltMoveRight,
    AltMoveDown,
    AltMoveLeft,
    
    /* Bindings to swap window position on screen. */
    SwapUp,
    SwapDown,
    SwapLeft,
    SwapRight,

    /* Special bindings to apply custom rules to focused window. */
    ToggleFloat,
    ToggleFullScreen,

    /* Application shortcuts */
    CloseWindow,
    LaunchFileExplorer,
    LaunchTerminal,
}

export { ConfigKey, KeyShortcut };
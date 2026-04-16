enum ConfigKey {
    Enabled = "Enabled",

    GapsTop = "GapsUp",
    GapsRight = "GapsRight",
    GapsBottom = "GapsDown",
    GapsLeft = "GapsLeft",
    UseSmartGaps = "UseSmartGaps", // 0 = disabled, 1 = enabled; whether to use gaps when there's only single window or in full screen mode.

    HideAppTitleBars = "HideAppTitleBars",
    WindowFocusMode = "WindowFocusMode", // 0 = disabled, 1 = dynamic border (window decoration), 2 = shrink inactive windows.
}

enum WindowFocusDecoration {
    NoDecoration,
    DynamicBorder,
    ShrinkInactive,
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

    // ShiftLeft,
    // ShiftRight,
    // ShiftUp,
    // ShiftDown,
    
    /* Bindings to swap window position on screen. */
    SwapUp,
    SwapDown,
    SwapLeft,
    SwapRight,

    /* Special bindings to apply custom rules to focused window. */
    ToggleFloat,
    ToggleFullScreen,
}

export { ConfigKey, WindowFocusDecoration, KeyShortcut };
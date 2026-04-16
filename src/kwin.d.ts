import type {
    KWin,
    Workspace as KWinWorkspace,
    Options,
    Window as KWinWindowBase,
    VirtualDesktop,
    Output,
    Tile,
    TileManager,
    TileModel,
    LayoutDirection,
    ClientAreaOption,
    Edge,
    MaximizeMode,
} from "kwin-api";

import type {
    DBusCall,
    ShortcutHandler,
} from "kwin-api/qml";

import type {
    QPoint,
    QRect,
    QSize,
    QIcon,
    QUuid,
    QTimer,
    Signal,
} from "kwin-api/qt";

declare global {
    /**
     * Global KWin object
     * Provides access to KWin-specific functions like registerShortcut, callDBus, etc.
     */
    const KWin: KWin;

    /**
     * Global workspace object
     * The main entry point for interacting with windows and desktops.
     */
    const workspace: Workspace;

    /**
     * Global options object
     * Provides access to KWin configuration options.
     */
    const options: Options;

    /**
     * Global print function for debugging
     * Outputs messages to the KWin log (viewable via journalctl -f).
     */
    function print(...args: any[]): void;

    /**
     * Registers a global shortcut.
     */
    function registerShortcut(name: string, text: string, keySequence: string, callback: () => void): void;

    /**
     * Reads value from ~/.config/kwinrc. Will return defaultValue if not found.
     */
    function readConfig<T>(property: string, defaultValue: T): T;

    /**
     * Calls a DBus method.
     */
    function callDBus(service: string, path: string, interfaceName: string, method: string, ...args: any[]): void;

    // --- Type Aliases for Convenience ---

    // Core KWin types
    type KWinWindow = Window;
    type KWinVirtualDesktop = VirtualDesktop;
    type KWinOutput = Output;
    type KWinTile = Tile;
    type KWinTileManager = TileManager;
    type KWinTileModel = TileModel;
    type KWinDBusCall = DBusCall;
    type KWinShortcutHandler = ShortcutHandler;

    // Enums
    type KWinLayoutDirection = LayoutDirection;
    type KWinClientAreaOption = ClientAreaOption;
    type KWinEdge = Edge;
    type KWinMaximizeMode = MaximizeMode;

    // Qt types
    type QtPoint = QPoint;
    type QtRect = QRect;
    type QtSize = QSize;
    type QtIcon = QIcon;
    type QtUuid = QUuid;
    type QtTimer = QTimer;
    type QtSignal<T> = Signal<T>;

    // Extended types from kwin-api
    interface Window extends KWinWindowBase {
        specialWindow: boolean;
        resourceClass: string | { toString(): string };
        resourceName: string | { toString(): string };
    }

    interface Workspace extends KWinWorkspace {
        windows: Window[];
        windowList(): Window[];
    }
}

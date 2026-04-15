import { CONFIG_KEYS } from "./constants";

export class Config {
    public static get isEnabled(): boolean {
        return readConfig(CONFIG_KEYS.ENABLED, true);
    }

    public static get gaps(): number {
        return readConfig(CONFIG_KEYS.GAPS, 10);
    }

    public static get hideTitleBars(): boolean {
        return readConfig(CONFIG_KEYS.HIDE_TITLEBARS, true);
    }
}

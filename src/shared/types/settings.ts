import type { Mode, Platform } from "./platform";

export interface Settings {
  mode: Mode;
  enabled: Record<Platform, boolean>;
  pages: {
    youtube: { watch: boolean; shorts: boolean };
    instagram: { feed: boolean; reels: boolean };
    facebook: { feed: boolean; reels: boolean };
  };
  normal: {
    totalMinutes: number;
  };
  cooldown: {
    watchMinutes: number;
    restMinutes: number;
  };
  custom: {
    platformMinutes: Record<Platform, number>;
  };
}

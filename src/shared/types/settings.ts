import type { Mode, Platform } from "./platform";

export interface Settings {
  mode: Mode;
  enabled: Record<Platform, boolean>;
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

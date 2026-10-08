import { advanceClock, defaultSettings, freshState, parseSettings } from "../shared/core";
import type { Settings, UsageState } from "../shared/types";

export function isUsageState(value: unknown): value is UsageState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<UsageState>;
  return (
    typeof state.dayKey === "string" &&
    typeof state.totalMs === "number" &&
    typeof state.cooldownUsedMs === "number" &&
    typeof state.platformMs === "object" &&
    state.platformMs !== null
  );
}

export async function loadState(now: number): Promise<{ settings: Settings; state: UsageState }> {
  const stored = await chrome.storage.local.get(["settings", "state"]);
  const settings = parseSettings(stored.settings) ?? defaultSettings();
  const state = advanceClock(isUsageState(stored.state) ? stored.state : freshState(now), now);
  return { settings, state };
}

export async function saveState(state: UsageState): Promise<void> {
  await chrome.storage.local.set({ state });
}

export async function saveSettingsAndState(settings: Settings, state: UsageState): Promise<void> {
  await chrome.storage.local.set({ settings, state });
}

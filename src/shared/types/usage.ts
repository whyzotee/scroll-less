import type { Platform } from "./platform";

export type CheckReason =
  | "counting"
  | "page-hidden"
  | "inactive-tab"
  | "window-unfocused"
  | "disabled"
  | "unrecognized"
  | "limit-reached"
  | "chatting";

export interface ActiveSession {
  tabId: number;
  platform: Platform;
  at: number;
}

export interface LastCheck {
  platform: Platform | null;
  at: number;
  reason: CheckReason;
}

export interface UsageState {
  dayKey: string;
  totalMs: number;
  platformMs: Record<Platform, number>;
  cooldownUsedMs: number;
  restUntil: number | null;
  active: ActiveSession | null;
  lastCheck?: LastCheck | null;
}

export type AccessReason = "daily-total" | "daily-platform" | "rest";

export interface Access {
  blocked: boolean;
  reason: AccessReason | null;
  remainingMs: number;
  availableAt: number | null;
}

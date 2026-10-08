export const TIME_MS = {
  SECOND: 1_000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
} as const;

export const LIMITS = {
  MIN_MINUTES: 1,
  MAX_MINUTES: 1_440, // 24 hours
} as const;

export const TRACKING = {
  HEARTBEAT_INTERVAL_MS: 1_000,
  POPUP_REFRESH_INTERVAL_MS: 1_000,
  MAX_CREDIT_ELAPSED_MS: 2_500,
  POPUP_FOCUS_WINDOW_MS: 2_000,
  STALE_CHECK_THRESHOLD_MS: 5_000,
  DEBUG_THROTTLE_MS: 5_000,
} as const;

export const EXTENSION = {
  OVERLAY_ID: "scrollless-overlay",
  PING_MESSAGE_TYPE: "scrollless-ping",
} as const;

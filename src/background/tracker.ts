import { TRACKING } from "../shared/constants";
import { accessFor, classifyPage, consume, isPageEnabled } from "../shared/core";
import type {
  Access,
  CheckReason,
  HandlerContext,
  HeartbeatMessage,
  Platform,
  Sender,
  Settings,
  Snapshot,
  UsageState,
} from "../shared/types";

let popupHeartbeat: { tabId: number; windowId: number; at: number } | null = null;
let lastDebugAt = 0;

export interface HeartbeatEvaluation {
  platform: Platform | null;
  canCount: boolean;
  windowFocused: boolean;
  popupFocused: boolean;
  reason: CheckReason;
}

export function recordPopupHeartbeat(tabId: number, windowId: number, at: number): void {
  popupHeartbeat = { tabId, windowId, at };
}

export function isPopupActive(tabId?: number, windowId?: number, now: number = Date.now()): boolean {
  return (
    popupHeartbeat !== null &&
    now - popupHeartbeat.at < TRACKING.POPUP_FOCUS_WINDOW_MS &&
    popupHeartbeat.tabId === tabId &&
    popupHeartbeat.windowId === windowId
  );
}

export function createSnapshot(settings: Settings, state: UsageState, now: number, platform?: Platform | null): Snapshot {
  return {
    settings,
    state,
    now,
    access: platform ? accessFor(state, settings, platform, now) : null,
  };
}

export function creditWatchTime(ctx: HandlerContext, tabId: number, platform: Platform): Access {
  const { state, settings, now } = ctx;
  if (state.active?.tabId === tabId && state.active.platform === platform) {
    const elapsed = Math.max(0, Math.min(now - state.active.at, TRACKING.MAX_CREDIT_ELAPSED_MS));
    Object.assign(state, consume(state, settings, platform, elapsed, now));
  }
  const access = accessFor(state, settings, platform, now);
  state.active = access.blocked ? null : { tabId, platform, at: now };
  return access;
}

export async function evaluateHeartbeat(message: HeartbeatMessage, sender: Sender, ctx: HandlerContext): Promise<HeartbeatEvaluation> {
  const { settings, now } = ctx;
  const page = classifyPage(message.url);
  const platform = page?.platform ?? null;
  const tab = sender.tab;
  const popupFocused = isPopupActive(tab?.id, tab?.windowId, now);

  if (!platform) {
    return {
      platform: null,
      canCount: false,
      windowFocused: false,
      popupFocused,
      reason: "unrecognized",
    };
  }

  if (page && !isPageEnabled(settings, page)) {
    return {
      platform,
      canCount: false,
      windowFocused: false,
      popupFocused,
      reason: "disabled",
    };
  }

  if (platform === "facebook" && message.chatActive === true) {
    return { platform, canCount: false, windowFocused: false, popupFocused, reason: "chatting" };
  }

  if (!tab?.active) {
    return {
      platform,
      canCount: false,
      windowFocused: false,
      popupFocused,
      reason: message.visible ? "inactive-tab" : "page-hidden",
    };
  }

  if (!message.visible && !popupFocused) {
    return {
      platform,
      canCount: false,
      windowFocused: false,
      popupFocused,
      reason: "page-hidden",
    };
  }

  let windowFocused = false;
  if (tab.windowId !== undefined) {
    try {
      const win = await chrome.windows.get(tab.windowId);
      windowFocused = win.focused === true;
    } catch {
      windowFocused = false;
    }
  }

  const canCount = windowFocused || popupFocused || message.pageFocused === true;
  const reason: CheckReason = canCount ? "counting" : "window-unfocused";

  return { platform, canCount, windowFocused, popupFocused, reason };
}

export function logTrackingDebug(
  evaluation: HeartbeatEvaluation,
  reason: CheckReason,
  message: HeartbeatMessage,
  sender: Sender,
  ctx: HandlerContext,
): void {
  const { state, now } = ctx;
  if (reason !== state.lastCheck?.reason || now - lastDebugAt >= TRACKING.DEBUG_THROTTLE_MS) {
    console.info("[ScrollLess background]", {
      platform: evaluation.platform,
      pageVisible: message.visible,
      pageFocused: message.pageFocused,
      chatActive: message.chatActive === true,
      tabActive: sender.tab?.active ?? false,
      windowFocused: evaluation.windowFocused,
      popupFocused: evaluation.popupFocused,
      reason,
      totalSeconds: Math.floor(state.totalMs / 1000),
      cooldownSeconds: Math.floor(state.cooldownUsedMs / 1000),
    });
    lastDebugAt = now;
  }
}

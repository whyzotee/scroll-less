import { LIMITS } from "../shared/constants";
import { classifyUrl, parseSettings } from "../shared/core";
import type { HandlerContext, HeartbeatMessage, SaveSettingsMessage, Sender, Snapshot, SnapshotMessage } from "../shared/types";
import { saveSettingsAndState, saveState } from "./storage";
import { createSnapshot, creditWatchTime, evaluateHeartbeat, logTrackingDebug, recordPopupHeartbeat } from "./tracker";

export async function handleSnapshot(message: SnapshotMessage, ctx: HandlerContext): Promise<Snapshot> {
  const { settings, state, now } = ctx;

  if (message.viewing && Number.isInteger(message.viewing.tabId) && Number.isInteger(message.viewing.windowId)) {
    try {
      const tab = await chrome.tabs.get(message.viewing.tabId);
      const platform = classifyUrl(tab.url || message.viewing.url);
      if (tab.active && tab.windowId === message.viewing.windowId && platform && settings.enabled[platform]) {
        recordPopupHeartbeat(tab.id!, tab.windowId, now);
        const access = creditWatchTime(ctx, tab.id!, platform);
        state.lastCheck = {
          platform,
          at: now,
          reason: access.blocked ? "limit-reached" : "counting",
        };
      }
    } catch (error) {
      console.warn("[ScrollLess background] popup tab check failed", error);
    }
  }

  await saveState(state);
  return createSnapshot(settings, state, now);
}

export async function handleSaveSettings(message: SaveSettingsMessage, ctx: HandlerContext): Promise<Snapshot> {
  const { settings, state, now } = ctx;
  const nextSettings = parseSettings(message.settings);
  if (!nextSettings) {
    throw new Error(`Enter a time limit between ${LIMITS.MIN_MINUTES} and ${LIMITS.MAX_MINUTES} minutes.`);
  }

  state.active = null;
  const cooldownChanged =
    settings.mode !== nextSettings.mode ||
    settings.cooldown.watchMinutes !== nextSettings.cooldown.watchMinutes ||
    settings.cooldown.restMinutes !== nextSettings.cooldown.restMinutes;

  if (cooldownChanged) {
    state.cooldownUsedMs = 0;
    state.restUntil = null;
  }

  await saveSettingsAndState(nextSettings, state);
  return createSnapshot(nextSettings, state, now);
}

export async function handleLeave(sender: Sender, ctx: HandlerContext): Promise<{ ok: boolean }> {
  const { state } = ctx;
  if (state.active?.tabId === sender.tab?.id) {
    state.active = null;
    await saveState(state);
  }
  return { ok: true };
}

export async function handleHeartbeat(message: HeartbeatMessage, sender: Sender, ctx: HandlerContext): Promise<Snapshot> {
  const { settings, state, now } = ctx;
  const evaluation = await evaluateHeartbeat(message, sender, ctx);
  let reason = evaluation.reason;
  const tabId = sender.tab?.id;

  if (evaluation.canCount && evaluation.platform && tabId !== undefined) {
    const access = creditWatchTime(ctx, tabId, evaluation.platform);
    if (access.blocked) {
      reason = "limit-reached";
    }
  } else if (state.active?.tabId === tabId) {
    state.active = null;
  }

  logTrackingDebug(evaluation, reason, message, sender, ctx);

  state.lastCheck = { platform: evaluation.platform, at: now, reason };
  await saveState(state);
  return createSnapshot(settings, state, now, evaluation.platform);
}

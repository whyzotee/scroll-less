import {
  accessFor,
  advanceClock,
  classifyUrl,
  consume,
  defaultSettings,
  freshState,
  parseSettings,
  type Platform,
  type Settings,
  type UsageState,
} from './core';

declare const chrome: any;

type Sender = { tab?: { id?: number; windowId: number; active: boolean } };
type Viewing = { tabId: number; windowId: number; url: string };
type Message =
  | { type: 'snapshot'; viewing?: Viewing }
  | { type: 'save-settings'; settings: unknown }
  | { type: 'heartbeat'; url: string; visible: boolean; pageFocused: boolean }
  | { type: 'leave' };

let popupHeartbeat: { tabId: number; windowId: number; at: number } | null = null;
let lastDebugAt = 0;

async function activateOpenTabs() {
  try {
    const tabs: { id?: number; url?: string }[] = await chrome.tabs.query({});
    await Promise.all(tabs.map(async (tab) => {
      if (tab.id === undefined || !tab.url?.startsWith('https://') || !classifyUrl(tab.url)) return;
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      } catch (error) {
        console.warn('[ScrollLess background] could not activate an open tab', tab.id, error);
      }
    }));
  } catch (error) {
    console.warn('[ScrollLess background] could not list open tabs', error);
  }
}

chrome.runtime.onInstalled.addListener(() => { void activateOpenTabs(); });
chrome.runtime.onStartup.addListener(() => { void activateOpenTabs(); });

function isUsageState(value: unknown): value is UsageState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<UsageState>;
  return typeof state.dayKey === 'string' && typeof state.totalMs === 'number' &&
    typeof state.cooldownUsedMs === 'number' && typeof state.platformMs === 'object' && state.platformMs !== null;
}

async function load(now: number): Promise<{ settings: Settings; state: UsageState }> {
  const stored = await chrome.storage.local.get(['settings', 'state']);
  const settings = parseSettings(stored.settings) ?? defaultSettings();
  const state = advanceClock(isUsageState(stored.state) ? stored.state : freshState(now), now);
  return { settings, state };
}

function snapshot(settings: Settings, state: UsageState, now: number, platform?: Platform | null) {
  return {
    settings,
    state,
    now,
    access: platform ? accessFor(state, settings, platform, now) : null,
  };
}

function credit(state: UsageState, settings: Settings, tabId: number, platform: Platform, now: number) {
  if (state.active?.tabId === tabId && state.active.platform === platform) {
    const elapsed = Math.max(0, Math.min(now - state.active.at, 2_500));
    Object.assign(state, consume(state, settings, platform, elapsed, now));
  }
  const access = accessFor(state, settings, platform, now);
  state.active = access.blocked ? null : { tabId, platform, at: now };
  return access;
}

async function handle(message: Message, sender: Sender) {
  const now = Date.now();
  const { settings, state } = await load(now);

  if (message.type === 'snapshot') {
    if (message.viewing && Number.isInteger(message.viewing.tabId) && Number.isInteger(message.viewing.windowId)) {
      try {
        const tab = await chrome.tabs.get(message.viewing.tabId);
        const platform = classifyUrl(tab.url || message.viewing.url);
        if (tab.active && tab.windowId === message.viewing.windowId && platform && settings.enabled[platform]) {
          popupHeartbeat = { tabId: tab.id, windowId: tab.windowId, at: now };
          const access = credit(state, settings, tab.id, platform, now);
          state.lastCheck = { platform, at: now, reason: access.blocked ? 'limit-reached' : 'counting' };
        }
      } catch (error) {
        console.warn('[ScrollLess background] popup tab check failed', error);
      }
    }
    await chrome.storage.local.set({ state });
    return snapshot(settings, state, now);
  }

  if (message.type === 'save-settings') {
    const nextSettings = parseSettings(message.settings);
    if (!nextSettings) throw new Error('Enter a time limit between 1 and 1440 minutes.');
    state.active = null;
    if (settings.mode !== nextSettings.mode ||
        settings.cooldown.watchMinutes !== nextSettings.cooldown.watchMinutes ||
        settings.cooldown.restMinutes !== nextSettings.cooldown.restMinutes) {
      state.cooldownUsedMs = 0;
      state.restUntil = null;
    }
    await chrome.storage.local.set({ settings: nextSettings, state });
    return snapshot(nextSettings, state, now);
  }

  if (message.type === 'leave') {
    if (state.active?.tabId === sender.tab?.id) {
      state.active = null;
      await chrome.storage.local.set({ state });
    }
    return { ok: true };
  }

  const platform = classifyUrl(message.url);
  const tab = sender.tab;
  let canCount = false;
  let windowFocused = false;
  const popupFocused = popupHeartbeat !== null && now - popupHeartbeat.at < 2_000 &&
    popupHeartbeat.tabId === tab?.id && popupHeartbeat.windowId === tab.windowId;
  let reason: NonNullable<UsageState['lastCheck']>['reason'] = 'unrecognized';
  if (platform) reason = settings.enabled[platform] ? 'inactive-tab' : 'disabled';
  if (platform && settings.enabled[platform] && !message.visible) reason = 'page-hidden';
  if (platform && settings.enabled[platform] && (message.visible || popupFocused) && tab?.id !== undefined && tab.active) {
    reason = 'window-unfocused';
    try {
      const window = await chrome.windows.get(tab.windowId);
      windowFocused = window.focused === true;
      canCount = windowFocused || popupFocused || message.pageFocused === true;
      if (canCount) reason = 'counting';
    } catch {
      canCount = popupFocused || message.pageFocused === true;
      if (canCount) reason = 'counting';
    }
  }

  if (canCount && platform && tab?.id !== undefined) {
    const access = credit(state, settings, tab.id, platform, now);
    if (access.blocked) reason = 'limit-reached';
  } else if (state.active?.tabId === tab?.id) {
    state.active = null;
  }

  if (reason !== state.lastCheck?.reason || now - lastDebugAt >= 5_000) {
    console.info('[ScrollLess background]', {
      platform,
      pageVisible: message.visible,
      pageFocused: message.pageFocused,
      tabActive: tab?.active ?? false,
      windowFocused,
      popupFocused,
      reason,
      totalSeconds: Math.floor(state.totalMs / 1000),
      cooldownSeconds: Math.floor(state.cooldownUsedMs / 1000),
    });
    lastDebugAt = now;
  }
  state.lastCheck = { platform, at: now, reason };
  await chrome.storage.local.set({ state });
  return snapshot(settings, state, now, platform);
}

let queue: Promise<unknown> = Promise.resolve();

chrome.runtime.onMessage.addListener((message: Message, sender: Sender, sendResponse: (value: unknown) => void) => {
  queue = queue.catch(() => undefined).then(() => handle(message, sender)).then(
    (result) => sendResponse({ ok: true, result }),
    (error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Something went wrong' }),
  );
  return true;
});

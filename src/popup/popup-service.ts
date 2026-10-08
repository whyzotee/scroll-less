import { EXTENSION } from "../shared/constants";
import { classifyUrl, PLATFORMS } from "../shared/core";
import type { MessageReply, Mode, Settings, Snapshot, Viewing } from "../shared/types";

type Reply<T> = MessageReply<T>;

export async function detectActiveViewingTab(): Promise<Viewing | undefined> {
  if (typeof chrome === "undefined" || !chrome.tabs) return undefined;

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id === undefined || !tab.url) return undefined;

  const platform = classifyUrl(tab.url);
  if (!platform) return undefined;

  const viewing: Viewing = {
    tabId: tab.id,
    windowId: tab.windowId,
    url: tab.url,
  };

  console.info("[ScrollLess popup] active tab", viewing);

  try {
    const reply = await chrome.tabs.sendMessage(tab.id, {
      type: EXTENSION.PING_MESSAGE_TYPE,
    });
    if (reply?.ok) return viewing;
  } catch {
    // An already-open tab may not have a live content script yet.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } catch (error) {
    console.warn("[ScrollLess popup] content script injection failed", error);
    throw error;
  }

  return viewing;
}

export async function fetchSnapshot(viewing?: Viewing): Promise<Snapshot> {
  if (typeof chrome === "undefined" || !chrome.runtime) {
    throw new Error("Chrome extension runtime is not available");
  }

  const reply: Reply<Snapshot> = await chrome.runtime.sendMessage({
    type: "snapshot",
    viewing,
  });

  if (!reply.ok || !reply.result) {
    throw new Error(reply.error ?? "Could not load status");
  }

  return reply.result;
}

export async function sendSaveSettings(settings: Settings): Promise<Snapshot> {
  if (typeof chrome === "undefined" || !chrome.runtime) {
    throw new Error("Chrome extension runtime is not available");
  }

  const reply: Reply<Snapshot> = await chrome.runtime.sendMessage({
    type: "save-settings",
    settings,
  });

  if (!reply.ok || !reply.result) {
    throw new Error(reply.error ?? "Could not save settings");
  }

  return reply.result;
}

export function extractSettingsFromForm(form: HTMLFormElement, currentSettings: Settings, mode: Mode): Settings {
  const data = new FormData(form);
  const number = (key: string) => Number(data.get(key));

  const settings: Settings = structuredClone(currentSettings);
  settings.mode = mode;
  settings.normal.totalMinutes = number("totalMinutes");
  settings.cooldown.watchMinutes = number("watchMinutes");
  settings.cooldown.restMinutes = number("restMinutes");

  for (const platform of PLATFORMS) {
    settings.enabled[platform] = data.has(`enabled-${platform}`);
    settings.custom.platformMinutes[platform] = number(`minutes-${platform}`);
  }

  return settings;
}

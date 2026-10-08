import type { HandlerContext, Message, Sender } from "../shared/types";
import { handleHeartbeat, handleLeave, handleSaveSettings, handleSnapshot } from "./handlers";
import { loadState } from "./storage";
import { activateOpenTabs } from "./tab-activator";

chrome.runtime.onInstalled.addListener(() => {
  void activateOpenTabs();
});

chrome.runtime.onStartup.addListener(() => {
  void activateOpenTabs();
});

async function dispatchMessage(message: Message, sender: Sender): Promise<unknown> {
  const now = Date.now();
  const { settings, state } = await loadState(now);
  const ctx: HandlerContext = { settings, state, now };

  switch (message.type) {
    case "snapshot":
      return handleSnapshot(message, ctx);
    case "save-settings":
      return handleSaveSettings(message, ctx);
    case "leave":
      return handleLeave(sender, ctx);
    case "heartbeat":
      return handleHeartbeat(message, sender, ctx);
  }
}

let messageQueue: Promise<unknown> = Promise.resolve();

chrome.runtime.onMessage.addListener((message: Message, sender: Sender, sendResponse: (value: unknown) => void) => {
  messageQueue = messageQueue
    .catch(() => undefined)
    .then(() => dispatchMessage(message, sender))
    .then(
      (result) => sendResponse({ ok: true, result }),
      (error: unknown) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Something went wrong",
        }),
    );
  return true;
});

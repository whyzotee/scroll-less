import { EXTENSION, TRACKING } from "../shared/constants";
import { classifyUrl } from "../shared/core";
import type { MessageReply, PingListener, Snapshot } from "../shared/types";
import { LimitOverlay } from "./components/limit-overlay";
import { FacebookChatActivity } from "./facebook-chat";

type Reply = MessageReply<Snapshot>;

interface ScrollLessGlobalScope {
  __scrolllessPingListener?: PingListener;
}

const contentScope = globalThis as typeof globalThis & ScrollLessGlobalScope;

function initContentScript(): void {
  const priorListener = contentScope.__scrolllessPingListener;
  if (priorListener && chrome.runtime.onMessage.hasListener(priorListener)) return;

  const overlay = new LimitOverlay();
  const facebookChat = new FacebookChatActivity();
  let lastUrl = "";
  let inFlight = false;
  let wasVisible = false;
  let previousReason = "";

  console.info("[ScrollLess content] loaded", location.href);

  document.addEventListener(
    "keydown",
    (event) => {
      if (!overlay.isVisible) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  async function tick() {
    if (inFlight) return;
    const url = location.href;
    const platform = classifyUrl(url);

    if (!platform) {
      overlay.clear();
      if (lastUrl) {
        void chrome.runtime.sendMessage({ type: "leave" }).catch(() => undefined);
      }
      lastUrl = "";
      wasVisible = false;
      return;
    }

    lastUrl = url;
    const chatActive = platform === "facebook" && facebookChat.isActive;
    const visible = document.visibilityState === "visible";
    if (!visible && !wasVisible) return;
    wasVisible = visible;
    inFlight = true;

    try {
      const reply: Reply = await chrome.runtime.sendMessage({
        type: "heartbeat",
        url,
        visible,
        pageFocused: document.hasFocus(),
        chatActive,
      });

      const reason = reply.result?.state?.lastCheck?.reason ?? (reply.ok ? "allowed" : "error");

      if (reason !== previousReason) {
        console.info("[ScrollLess content] status", { url, visible, reason, reply });
        previousReason = reason;
      }

      if (reply.ok && reply.result?.access?.blocked && !chatActive) {
        overlay.show(reply.result.access, platform);
      } else {
        overlay.clear();
      }
    } catch {
      overlay.clear();
    } finally {
      inFlight = false;
    }
  }

  void tick();
  setInterval(() => void tick(), TRACKING.HEARTBEAT_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => void tick());
  window.addEventListener("pageshow", () => void tick());
  window.addEventListener("popstate", () => void tick());

  const pingListener: PingListener = (incoming, _sender, sendResponse) => {
    if (incoming.type === EXTENSION.PING_MESSAGE_TYPE) sendResponse({ ok: true });
  };

  chrome.runtime.onMessage.addListener(pingListener);
  contentScope.__scrolllessPingListener = pingListener;
}

initContentScript();

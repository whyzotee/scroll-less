import { classifyUrl, type Access } from './core';
import { LimitOverlay } from './components/limit-overlay';

declare const chrome: any;

type Reply = { ok: boolean; result?: { access: Access | null }; error?: string };

type PingListener = (incoming: { type?: string }, sender: unknown, sendResponse: (reply: { ok: boolean }) => void) => void;
const contentScope = globalThis as typeof globalThis & { __scrolllessPingListener?: PingListener };
const priorListener = contentScope.__scrolllessPingListener;
if (!priorListener || !chrome.runtime.onMessage.hasListener(priorListener)) {

  const overlay = new LimitOverlay();
  let lastUrl = '';
  let inFlight = false;
  let wasVisible = false;
  let previousReason = '';

  console.info('[ScrollLess content] loaded', location.href);

  document.addEventListener('keydown', (event) => {
    if (!overlay.isVisible) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  async function tick() {
    if (inFlight) return;
    const url = location.href;
    const platform = classifyUrl(url);
    if (!platform) {
      overlay.clear();
      if (lastUrl) void chrome.runtime.sendMessage({ type: 'leave' }).catch(() => undefined);
      lastUrl = '';
      wasVisible = false;
      return;
    }
    lastUrl = url;
    const visible = document.visibilityState === 'visible';
    if (!visible && !wasVisible) return;
    wasVisible = visible;
    inFlight = true;
    try {
      const reply: Reply = await chrome.runtime.sendMessage({ type: 'heartbeat', url, visible, pageFocused: document.hasFocus() });
      const reason = reply.result?.access?.reason ?? (reply.ok ? 'allowed' : 'error');
      if (reason !== previousReason) {
        console.info('[ScrollLess content] status', { url, visible, reason, reply });
        previousReason = reason;
      }
      if (reply.ok && reply.result?.access?.blocked) overlay.show(reply.result.access, platform);
      else overlay.clear();
    } catch {
      overlay.clear();
    } finally {
      inFlight = false;
    }
  }

  void tick();
  setInterval(() => void tick(), 1_000);
  document.addEventListener('visibilitychange', () => void tick());
  window.addEventListener('pageshow', () => void tick());
  window.addEventListener('popstate', () => void tick());
  const pingListener: PingListener = (incoming, _sender, sendResponse) => {
    if (incoming.type === 'scrollless-ping') sendResponse({ ok: true });
  };
  chrome.runtime.onMessage.addListener(pingListener);
  contentScope.__scrolllessPingListener = pingListener;
}

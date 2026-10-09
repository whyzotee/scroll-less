import assert from "node:assert/strict";
import test from "node:test";

test("TikTok time decreases while the extension popup is open and the page is hidden", async () => {
  let listener;
  let onInstalled;
  let onStartup;
  const injected = [];
  let now = 1_780_000_000_000;
  const originalNow = Date.now;
  const originalChrome = globalThis.chrome;
  const originalInfo = console.info;
  const values = {};
  Date.now = () => now;
  console.info = () => undefined;
  globalThis.chrome = {
    storage: {
      local: {
        get: async () => ({ ...values }),
        set: async (items) => Object.assign(values, items),
      },
    },
    windows: { get: async () => ({ focused: false }) },
    tabs: {
      get: async (id) => ({ id, windowId: 2, active: true, url: "https://www.tiktok.com/th-TH/" }),
      query: async () => [
        { id: 7, url: "https://www.tiktok.com/th-TH/" },
        { id: 8, url: "https://www.youtube.com/shorts/abc" },
        { id: 9, url: "https://www.youtube.com/watch?v=abc" },
        { id: 10, url: "chrome://extensions" },
      ],
    },
    scripting: {
      executeScript: async (options) => {
        injected.push(options);
      },
    },
    runtime: {
      onMessage: {
        addListener: (callback) => {
          listener = callback;
        },
      },
      onInstalled: {
        addListener: (callback) => {
          onInstalled = callback;
        },
      },
      onStartup: {
        addListener: (callback) => {
          onStartup = callback;
        },
      },
    },
  };

  try {
    await import("../dist/background.js");
    onInstalled({ reason: "update" });
    await new Promise(setImmediate);
    assert.deepEqual(injected.map(({ target }) => target.tabId).sort(), [7, 8, 9]);
    assert.ok(injected.every(({ files }) => files.length === 1 && files[0] === "content.js"));
    onStartup();
    await new Promise(setImmediate);
    assert.equal(injected.length, 6);
    const send = (message, sender = {}) => new Promise((resolve) => listener(message, sender, resolve));
    const viewing = { tabId: 7, windowId: 2, url: "https://www.tiktok.com/th-TH/" };
    await send({ type: "snapshot", viewing });
    now += 1_000;
    let reply = await send({ type: "snapshot", viewing });
    assert.equal(reply.result.state.totalMs, 1_000);
    assert.equal(reply.result.state.lastCheck.reason, "counting");

    reply = await send(
      { type: "heartbeat", url: viewing.url, visible: false, pageFocused: false },
      { tab: { id: 7, windowId: 2, active: true } },
    );
    assert.equal(reply.result.state.lastCheck.reason, "counting");
    now += 1_000;
    reply = await send({ type: "snapshot", viewing });
    assert.equal(reply.result.state.totalMs, 2_000);

    now += 3_000;
    reply = await send(
      { type: "heartbeat", url: viewing.url, visible: false, pageFocused: false },
      { tab: { id: 7, windowId: 2, active: true } },
    );
    assert.equal(reply.result.state.lastCheck.reason, "page-hidden");
    assert.equal(reply.result.state.totalMs, 2_000);

    reply = await send(
      { type: "heartbeat", url: "https://www.facebook.com/", visible: true, pageFocused: true, chatActive: true },
      { tab: { id: 7, windowId: 2, active: true } },
    );
    assert.equal(reply.result.state.lastCheck.reason, "chatting");
    assert.equal(reply.result.state.active, null);
    assert.equal(reply.result.access, null);

    const settings = reply.result.settings;
    settings.pages.facebook.feed = false;
    await send({ type: "save-settings", settings });
    values.state.totalMs = settings.normal.totalMinutes * 60_000;
    reply = await send(
      { type: "heartbeat", url: "https://www.facebook.com/", visible: true, pageFocused: true, chatActive: false },
      { tab: { id: 7, windowId: 2, active: true } },
    );
    assert.equal(reply.result.state.lastCheck.reason, "disabled");
    assert.equal(reply.result.access, null);
    reply = await send(
      { type: "heartbeat", url: "https://www.facebook.com/reel/123", visible: true, pageFocused: true, chatActive: false },
      { tab: { id: 7, windowId: 2, active: true } },
    );
    assert.equal(reply.result.access.blocked, true);
  } finally {
    Date.now = originalNow;
    console.info = originalInfo;
    globalThis.chrome = originalChrome;
  }
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

test("content script starts once per live extension context and restarts after reload", () => {
  const script = readFileSync("dist/content.js", "utf8");
  const listeners = new Set();
  const intervals = [];
  let staleOverlay = {
    dataset: { previousBodyInert: "false" },
    remove() {
      staleOverlay = null;
    },
  };
  const body = { inert: true };
  const scope = {
    chrome: {
      runtime: {
        onMessage: {
          addListener: (listener) => listeners.add(listener),
          hasListener: (listener) => listeners.has(listener),
        },
        sendMessage: async () => ({ ok: true, result: { access: null } }),
      },
    },
    console: { info() {}, warn() {} },
    document: {
      addEventListener() {},
      getElementById: () => staleOverlay,
      body,
      visibilityState: "visible",
      hasFocus: () => true,
    },
    location: { href: "https://www.tiktok.com/" },
    setInterval: (callback) => intervals.push(callback),
    window: { addEventListener() {} },
  };

  runInNewContext(script, scope);
  assert.equal(staleOverlay, null);
  assert.equal(body.inert, false);
  runInNewContext(script, scope);
  assert.equal(intervals.length, 1);
  assert.equal(listeners.size, 1);

  listeners.clear();
  runInNewContext(script, scope);
  assert.equal(intervals.length, 2);
  assert.equal(listeners.size, 1);
});

test("Facebook chat activity pauses heartbeats and feed scrolling resumes them", async () => {
  const script = readFileSync("dist/content.js", "utf8");
  const listeners = new Map();
  const intervals = [];
  const heartbeats = [];

  class FakeElement {
    constructor(pane = null) {
      this.pane = pane;
      this.isConnected = true;
    }
    closest() {
      return this.pane;
    }
    getAttribute(name) {
      return name === "aria-label" ? "Chat with a friend" : null;
    }
  }

  const chatPane = new FakeElement();
  const chatTarget = new FakeElement(chatPane);
  const feedTarget = new FakeElement();
  const scope = {
    URL,
    Element: FakeElement,
    chrome: {
      runtime: {
        onMessage: { addListener() {}, hasListener: () => false },
        sendMessage: async (message) => {
          if (message.type === "heartbeat") heartbeats.push(message);
          return { ok: true, result: { access: null } };
        },
      },
    },
    console: { info() {}, warn() {} },
    document: {
      activeElement: null,
      addEventListener: (type, listener) => listeners.set(type, listener),
      getElementById: () => null,
      body: { inert: false },
      visibilityState: "visible",
      hasFocus: () => true,
    },
    location: { href: "https://www.facebook.com/" },
    setInterval: (callback) => intervals.push(callback),
    window: { addEventListener() {} },
  };

  runInNewContext(script, scope);
  await new Promise(setImmediate);
  assert.equal(heartbeats.at(-1).chatActive, false);

  listeners.get("pointerdown")({ composedPath: () => [chatTarget] });
  intervals[0]();
  await new Promise(setImmediate);
  assert.equal(heartbeats.at(-1).chatActive, true);

  listeners.get("wheel")({ composedPath: () => [feedTarget] });
  intervals[0]();
  await new Promise(setImmediate);
  assert.equal(heartbeats.at(-1).chatActive, false);
});

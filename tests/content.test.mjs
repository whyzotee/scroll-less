import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

test('content script starts once per live extension context and restarts after reload', () => {
  const script = readFileSync('dist/content.js', 'utf8');
  const listeners = new Set();
  const intervals = [];
  let staleOverlay = { dataset: { previousBodyInert: 'false' }, remove() { staleOverlay = null; } };
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
    document: { addEventListener() {}, getElementById: () => staleOverlay, body, visibilityState: 'visible', hasFocus: () => true },
    location: { href: 'https://www.tiktok.com/' },
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

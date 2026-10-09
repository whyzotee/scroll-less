import assert from "node:assert/strict";
import test from "node:test";
import {
  accessFor,
  advanceClock,
  classifyPage,
  classifyUrl,
  consume,
  defaultSettings,
  freshState,
  isPageEnabled,
  nextLocalMidnight,
  parseSettings,
} from "../src/shared/core.ts";

const minute = 60_000;

test("classifies selectable social pages without limiting unrelated pages", () => {
  assert.equal(classifyUrl("https://www.youtube.com/shorts/abc"), "youtube");
  assert.equal(classifyUrl("https://www.youtube.com/shorts"), "youtube");
  assert.equal(classifyUrl("https://www.instagram.com/reels/"), "instagram");
  assert.equal(classifyUrl("https://www.instagram.com/reel/abc/"), "instagram");
  assert.equal(classifyUrl("https://www.facebook.com/reel/123"), "facebook");
  assert.equal(classifyUrl("https://www.tiktok.com/"), "tiktok");
  assert.equal(classifyUrl("https://www.tiktok.com/th-TH/"), "tiktok");
  assert.equal(classifyUrl("https://www.tiktok.com/th-TH/foryou"), "tiktok");
  assert.equal(classifyUrl("https://www.tiktok.com/@person"), "tiktok");
  assert.equal(classifyUrl("https://www.tiktok.com/search?q=music"), "tiktok");
  assert.equal(classifyUrl("https://www.tiktok.com/@person/video/123456"), "tiktok");
  assert.deepEqual(classifyPage("https://www.youtube.com/watch?v=abc"), { platform: "youtube", kind: "watch" });
  assert.deepEqual(classifyPage("https://www.instagram.com/p/abc/"), { platform: "instagram", kind: "feed" });
  assert.deepEqual(classifyPage("https://www.instagram.com/explore/"), { platform: "instagram", kind: "feed" });
  assert.deepEqual(classifyPage("https://www.facebook.com/feed/"), { platform: "facebook", kind: "feed" });
  assert.equal(classifyUrl("https://www.facebook.com/messages/"), null);
  assert.equal(classifyUrl("https://www.instagram.com/direct/inbox/"), null);
  assert.equal(classifyUrl("https://www.youtube.com/"), null);
  assert.equal(classifyUrl("https://www.youtube.com/watch"), null);
  assert.equal(classifyUrl("https://business.tiktok.com/"), null);
  assert.equal(classifyUrl("https://www.youtube.com.evil.test/shorts/abc"), null);
  assert.equal(classifyUrl("http://www.youtube.com/shorts/abc"), null);
});

test("page choices are independent and saved settings retain them", () => {
  const settings = defaultSettings();
  assert.equal(isPageEnabled(settings, classifyPage("https://www.youtube.com/watch?v=abc")), false);
  assert.equal(isPageEnabled(settings, classifyPage("https://www.youtube.com/shorts/abc")), true);
  settings.pages.youtube.watch = true;
  settings.pages.instagram.feed = false;
  assert.equal(isPageEnabled(settings, classifyPage("https://www.youtube.com/watch?v=abc")), true);
  assert.equal(isPageEnabled(settings, classifyPage("https://www.instagram.com/")), false);
  assert.equal(isPageEnabled(settings, classifyPage("https://www.instagram.com/reel/abc/")), true);
  assert.deepEqual(parseSettings(settings)?.pages, settings.pages);
  assert.equal(parseSettings({ ...settings, pages: undefined })?.pages.youtube.watch, false);
  assert.equal(parseSettings({ ...settings, pages: undefined })?.pages.facebook.feed, false);
  assert.equal(parseSettings({ ...settings, pages: undefined })?.pages.instagram.reels, true);
});

test("normal mode shares one daily limit across enabled platforms", () => {
  const now = new Date(2026, 9, 8, 12).getTime();
  const settings = defaultSettings();
  settings.normal.totalMinutes = 40;
  let state = freshState(now);
  state = consume(state, settings, "youtube", 35 * minute, now);
  assert.equal(state.platformMs.youtube, 35 * minute);
  assert.equal(accessFor(state, settings, "youtube", now).blocked, false);
  assert.equal(accessFor(state, settings, "tiktok", now).blocked, false);
  state = consume(state, settings, "tiktok", 15 * minute, now);
  assert.equal(state.totalMs, 40 * minute);
  assert.equal(state.platformMs.tiktok, 5 * minute);
  assert.equal(accessFor(state, settings, "instagram", now).reason, "daily-total");
});

test("existing settings restore old per-platform limits in Custom", () => {
  const stored = {
    ...defaultSettings(),
    custom: undefined,
    normal: {
      totalMinutes: 40,
      platformMinutes: { youtube: 10, instagram: 20, tiktok: 30, facebook: 40 },
    },
  };
  const settings = parseSettings(stored);
  assert.deepEqual(settings?.normal, { totalMinutes: 40 });
  assert.equal(settings?.custom.platformMinutes.youtube, 10);
  assert.equal(accessFor(freshState(Date.now()), settings, "youtube", Date.now()).remainingMs, 40 * minute);
});

test("Custom has independent daily limits and resets each platform at midnight", () => {
  const now = new Date(2026, 9, 8, 12).getTime();
  const settings = defaultSettings();
  settings.mode = "custom";
  settings.custom.platformMinutes.youtube = 20;
  settings.custom.platformMinutes.tiktok = 40;
  let state = freshState(now);
  state = consume(state, settings, "youtube", 25 * minute, now);
  assert.equal(state.platformMs.youtube, 20 * minute);
  assert.equal(accessFor(state, settings, "youtube", now).reason, "daily-platform");
  assert.equal(accessFor(state, settings, "tiktok", now).blocked, false);
  state = consume(state, settings, "tiktok", 35 * minute, now);
  assert.equal(state.platformMs.tiktok, 35 * minute);
  assert.equal(state.totalMs, 55 * minute);
  state = advanceClock(state, nextLocalMidnight(now));
  assert.equal(state.platformMs.youtube, 0);
  assert.equal(accessFor(state, settings, "youtube", nextLocalMidnight(now)).remainingMs, 20 * minute);
});

test("daily use resets at local midnight while cooldown rest persists", () => {
  const now = new Date(2026, 9, 8, 23, 59, 59).getTime();
  const state = freshState(now);
  state.totalMs = 12 * minute;
  state.restUntil = now + 30 * minute;
  const next = advanceClock(state, nextLocalMidnight(now));
  assert.equal(next.totalMs, 0);
  assert.equal(next.restUntil, state.restUntil);
});

test("cooldown uses one shared watch period and unlocks after real elapsed rest time", () => {
  const now = new Date(2026, 9, 8, 12).getTime();
  const settings = defaultSettings();
  settings.mode = "cooldown";
  let state = freshState(now);
  state = consume(state, settings, "youtube", 10 * minute, now);
  state = consume(state, settings, "tiktok", 5 * minute, now);
  assert.equal(accessFor(state, settings, "instagram", now).reason, "rest");
  assert.equal(state.restUntil, now + 30 * minute);
  state = advanceClock(state, state.restUntil);
  assert.equal(accessFor(state, settings, "facebook", state.restUntil ?? now).blocked, false);
  assert.equal(state.cooldownUsedMs, 0);
});

test("disabled platforms do not use time", () => {
  const now = Date.now();
  const settings = defaultSettings();
  settings.enabled.youtube = false;
  const state = consume(freshState(now), settings, "youtube", minute, now);
  assert.equal(state.totalMs, 0);
  assert.equal(accessFor(state, settings, "youtube", now).blocked, false);
});

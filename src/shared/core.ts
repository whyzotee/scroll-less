import type {
  Access,
  AccessReason,
  ActiveSession,
  CheckReason,
  ClassifiedPage,
  LastCheck,
  Mode,
  Platform,
  Settings,
  UsageState,
} from "./types/index.ts";

import { LIMITS, TIME_MS } from "./constants.ts";

export const PLATFORMS = ["youtube", "instagram", "tiktok", "facebook"] as const;

export const PLATFORM_NAMES: Record<Platform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

export type { Access, AccessReason, ActiveSession, CheckReason, LastCheck, Mode, Platform, Settings, UsageState };

const minutes = (value: number) => value * TIME_MS.MINUTE;

export function defaultSettings(): Settings {
  return {
    mode: "normal",
    enabled: {
      youtube: true,
      instagram: true,
      tiktok: true,
      facebook: true,
    },
    pages: {
      youtube: { watch: false, shorts: true },
      instagram: { feed: true, reels: true },
      facebook: { feed: true, reels: true },
    },
    normal: {
      totalMinutes: 60,
    },
    cooldown: { watchMinutes: 15, restMinutes: 30 },
    custom: {
      platformMinutes: {
        youtube: 30,
        instagram: 30,
        tiktok: 30,
        facebook: 30,
      },
    },
  };
}

export function localDayKey(now: number): string {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function nextLocalMidnight(now: number): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

export function freshState(now: number): UsageState {
  return {
    dayKey: localDayKey(now),
    totalMs: 0,
    platformMs: { youtube: 0, instagram: 0, tiktok: 0, facebook: 0 },
    cooldownUsedMs: 0,
    restUntil: null,
    active: null,
    lastCheck: null,
  };
}

export function advanceClock(state: UsageState, now: number): UsageState {
  const next = structuredClone(state);

  if (next.dayKey !== localDayKey(now)) {
    next.dayKey = localDayKey(now);
    next.totalMs = 0;
    next.platformMs = { youtube: 0, instagram: 0, tiktok: 0, facebook: 0 };
    next.active = null;
  }

  if (next.restUntil !== null && now >= next.restUntil) {
    next.restUntil = null;
    next.cooldownUsedMs = 0;
    next.active = null;
  }

  return next;
}

export function classifyPage(rawUrl: string): ClassifiedPage | null {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();

  if (/^(www\.|m\.)?youtube\.com$/.test(host) && /^\/shorts(\/|$)/.test(path)) {
    return { platform: "youtube", kind: "shorts" };
  }
  if (/^(www\.|m\.)?youtube\.com$/.test(host) && path === "/watch" && url.searchParams.has("v")) {
    return { platform: "youtube", kind: "watch" };
  }
  if (/^(www\.)?instagram\.com$/.test(host)) {
    if (/^\/reels?(\/|$)/.test(path)) return { platform: "instagram", kind: "reels" };
    if (path === "/" || /^\/(explore|p)(\/|$)/.test(path)) return { platform: "instagram", kind: "feed" };
  }
  if (/^(www\.|m\.)?facebook\.com$/.test(host)) {
    if (/^\/reels?(\/|$)/.test(path)) return { platform: "facebook", kind: "reels" };
    if (path === "/" || path === "/home.php" || /^\/feed(\/|$)/.test(path)) {
      return { platform: "facebook", kind: "feed" };
    }
  }
  if (/^(www\.|m\.)?tiktok\.com$/.test(host)) return { platform: "tiktok", kind: "site" };
  return null;
}

export function classifyUrl(rawUrl: string): Platform | null {
  return classifyPage(rawUrl)?.platform ?? null;
}

export function isPageEnabled(settings: Settings, page: ClassifiedPage): boolean {
  if (!settings.enabled[page.platform]) return false;
  if (page.platform === "tiktok") return true;
  if (page.platform === "youtube") return settings.pages.youtube[page.kind as "watch" | "shorts"];
  return settings.pages[page.platform][page.kind as "feed" | "reels"];
}

export function accessFor(state: UsageState, settings: Settings, platform: Platform, now: number): Access {
  if (!settings.enabled[platform]) {
    return { blocked: false, reason: null, remainingMs: 0, availableAt: null };
  }

  if (settings.mode === "cooldown") {
    if (state.restUntil !== null && now < state.restUntil) {
      return { blocked: true, reason: "rest", remainingMs: 0, availableAt: state.restUntil };
    }

    return {
      blocked: false,
      reason: null,
      remainingMs: Math.max(0, minutes(settings.cooldown.watchMinutes) - state.cooldownUsedMs),
      availableAt: null,
    };
  }

  const availableAt = nextLocalMidnight(now);

  if (settings.mode === "custom") {
    const platformLeft = Math.max(0, minutes(settings.custom.platformMinutes[platform]) - state.platformMs[platform]);

    if (platformLeft === 0) {
      return { blocked: true, reason: "daily-platform", remainingMs: 0, availableAt };
    }

    return { blocked: false, reason: null, remainingMs: platformLeft, availableAt: null };
  }

  const totalLeft = Math.max(0, minutes(settings.normal.totalMinutes) - state.totalMs);

  if (totalLeft === 0) {
    return { blocked: true, reason: "daily-total", remainingMs: 0, availableAt };
  }

  return { blocked: false, reason: null, remainingMs: totalLeft, availableAt: null };
}

export function consume(state: UsageState, settings: Settings, platform: Platform, elapsedMs: number, now: number): UsageState {
  const next = advanceClock(state, now);

  if (!settings.enabled[platform] || elapsedMs <= 0) return next;

  const access = accessFor(next, settings, platform, now);

  if (access.blocked) return next;

  const used = Math.min(elapsedMs, access.remainingMs);

  if (settings.mode !== "cooldown") {
    next.totalMs += used;
    next.platformMs[platform] += used;
  } else {
    next.cooldownUsedMs += used;
    if (next.cooldownUsedMs >= minutes(settings.cooldown.watchMinutes)) {
      next.restUntil = now + minutes(settings.cooldown.restMinutes);
      next.active = null;
    }
  }

  return next;
}

export function parseSettings(value: unknown): Settings | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<Settings>;

  if (item.mode !== "normal" && item.mode !== "cooldown" && item.mode !== "custom") return null;

  if (!item.enabled || !item.normal || !item.cooldown) return null;

  const validMinutes = (number: unknown) =>
    Number.isInteger(number) && (number as number) >= LIMITS.MIN_MINUTES && (number as number) <= LIMITS.MAX_MINUTES;

  if (!validMinutes(item.normal.totalMinutes) || !validMinutes(item.cooldown.watchMinutes) || !validMinutes(item.cooldown.restMinutes)) {
    return null;
  }

  for (const platform of PLATFORMS) {
    if (typeof item.enabled[platform] !== "boolean") return null;
  }

  const defaults = defaultSettings().pages;
  const storedPages = item.pages;
  // Existing installs only tracked Reels and Shorts. Preserve that scope until
  // the user explicitly saves new page choices.
  const legacyFeed = storedPages === undefined ? false : defaults.instagram.feed;
  const pages: Settings["pages"] = {
    youtube: {
      watch: storedPages?.youtube?.watch ?? defaults.youtube.watch,
      shorts: storedPages?.youtube?.shorts ?? defaults.youtube.shorts,
    },
    instagram: {
      feed: storedPages?.instagram?.feed ?? legacyFeed,
      reels: storedPages?.instagram?.reels ?? defaults.instagram.reels,
    },
    facebook: {
      feed: storedPages?.facebook?.feed ?? legacyFeed,
      reels: storedPages?.facebook?.reels ?? defaults.facebook.reels,
    },
  };
  if (Object.values(pages).some((group) => Object.values(group).some((value) => typeof value !== "boolean"))) return null;

  const legacyPlatformMinutes = (item.normal as Settings["normal"] & { platformMinutes?: Record<Platform, number> }).platformMinutes;

  const savedPlatformMinutes = item.custom?.platformMinutes ?? legacyPlatformMinutes;
  const platformMinutes =
    savedPlatformMinutes && PLATFORMS.every((platform) => validMinutes(savedPlatformMinutes[platform]))
      ? savedPlatformMinutes
      : defaultSettings().custom.platformMinutes;

  if (item.custom && !PLATFORMS.every((platform) => validMinutes(item.custom!.platformMinutes?.[platform]))) return null;
  return {
    mode: item.mode,
    enabled: Object.fromEntries(PLATFORMS.map((platform) => [platform, item.enabled![platform]])) as Record<Platform, boolean>,
    pages,
    normal: { totalMinutes: item.normal.totalMinutes! },
    cooldown: {
      watchMinutes: item.cooldown.watchMinutes!,
      restMinutes: item.cooldown.restMinutes!,
    },
    custom: {
      platformMinutes: Object.fromEntries(PLATFORMS.map((platform) => [platform, platformMinutes[platform]])) as Record<Platform, number>,
    },
  };
}

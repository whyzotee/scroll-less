export const PLATFORMS = ["youtube", "instagram", "tiktok", "facebook"] as const;
export type Platform = (typeof PLATFORMS)[number];
export type Mode = "normal" | "cooldown" | "custom";

export const PLATFORM_NAMES: Record<Platform, string> = {
  youtube: "YouTube Shorts",
  instagram: "Instagram Reels",
  tiktok: "TikTok",
  facebook: "Facebook Reels",
};

export interface Settings {
  mode: Mode;
  enabled: Record<Platform, boolean>;
  normal: {
    totalMinutes: number;
  };
  cooldown: {
    watchMinutes: number;
    restMinutes: number;
  };
  custom: {
    platformMinutes: Record<Platform, number>;
  };
}

export interface UsageState {
  dayKey: string;
  totalMs: number;
  platformMs: Record<Platform, number>;
  cooldownUsedMs: number;
  restUntil: number | null;
  active: { tabId: number; platform: Platform; at: number } | null;
  lastCheck?: {
    platform: Platform | null;
    at: number;
    reason:
      | "counting"
      | "page-hidden"
      | "inactive-tab"
      | "window-unfocused"
      | "disabled"
      | "unrecognized"
      | "limit-reached";
  } | null;
}

export interface Access {
  blocked: boolean;
  reason: "daily-total" | "daily-platform" | "rest" | null;
  remainingMs: number;
  availableAt: number | null;
}

const minutes = (value: number) => value * 60_000;

export function defaultSettings(): Settings {
  return {
    mode: "normal",
    enabled: {
      youtube: true,
      instagram: true,
      tiktok: true,
      facebook: true,
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

export function classifyUrl(rawUrl: string): Platform | null {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();

  if (/^(www\.|m\.)?youtube\.com$/.test(host) && /^\/shorts(\/|$)/.test(path)) {
    return "youtube";
  }
  if (/^(www\.)?instagram\.com$/.test(host) && /^\/reels?(\/|$)/.test(path)) {
    return "instagram";
  }
  if (/^(www\.|m\.)?facebook\.com$/.test(host) && /^\/reels?(\/|$)/.test(path)) {
    return "facebook";
  }
  if (/^(www\.|m\.)?tiktok\.com$/.test(host)) return "tiktok";
  return null;
}

export function accessFor(
  state: UsageState,
  settings: Settings,
  platform: Platform,
  now: number,
): Access {
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
    const platformLeft = Math.max(
      0,
      minutes(settings.custom.platformMinutes[platform]) - state.platformMs[platform],
    );

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

export function consume(
  state: UsageState,
  settings: Settings,
  platform: Platform,
  elapsedMs: number,
  now: number,
): UsageState {
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
    Number.isInteger(number) && (number as number) >= 1 && (number as number) <= 1440;

  if (
    !validMinutes(item.normal.totalMinutes) ||
    !validMinutes(item.cooldown.watchMinutes) ||
    !validMinutes(item.cooldown.restMinutes)
  ) {
    return null;
  }

  for (const platform of PLATFORMS) {
    if (typeof item.enabled[platform] !== "boolean") return null;
  }

  const legacyPlatformMinutes = (
    item.normal as Settings["normal"] & { platformMinutes?: Record<Platform, number> }
  ).platformMinutes;

  const savedPlatformMinutes = item.custom?.platformMinutes ?? legacyPlatformMinutes;
  const platformMinutes =
    savedPlatformMinutes &&
    PLATFORMS.every((platform) => validMinutes(savedPlatformMinutes[platform]))
      ? savedPlatformMinutes
      : defaultSettings().custom.platformMinutes;

  if (
    item.custom &&
    !PLATFORMS.every((platform) => validMinutes(item.custom!.platformMinutes?.[platform]))
  )
    return null;
  return {
    mode: item.mode,
    enabled: Object.fromEntries(
      PLATFORMS.map((platform) => [platform, item.enabled![platform]]),
    ) as Record<Platform, boolean>,
    normal: { totalMinutes: item.normal.totalMinutes! },
    cooldown: {
      watchMinutes: item.cooldown.watchMinutes!,
      restMinutes: item.cooldown.restMinutes!,
    },
    custom: {
      platformMinutes: Object.fromEntries(
        PLATFORMS.map((platform) => [platform, platformMinutes[platform]]),
      ) as Record<Platform, number>,
    },
  };
}

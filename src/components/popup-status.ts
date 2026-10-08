import { html } from "lit";
import {
  classifyUrl,
  nextLocalMidnight,
  PLATFORM_NAMES,
  type Mode,
  type Settings,
  type UsageState,
} from "../core";
import { clock } from "./time";

function trackingText(state: UsageState, now: number): string {
  const check = state.lastCheck;

  if (!check || now - check.at > 5_000) {
    return "No supported page detected. Open a selected site, then click ScrollLess.";
  }

  const name = check.platform ? PLATFORM_NAMES[check.platform] : "this page";
  switch (check.reason) {
    case "counting":
      return `Tracking ${name}`;
    case "page-hidden":
      return "Paused: the page tab is not in front";
    case "inactive-tab":
      return "Paused: another tab is active";
    case "window-unfocused":
      return "Paused: the browser is not in front";
    case "disabled":
      return `${name} is not limited`;
    case "limit-reached":
      return "Time limit reached";
    default:
      return "No supported page detected";
  }
}

export function renderStatus(
  mode: Mode,
  settings: Settings,
  state: UsageState,
  now: number,
  viewingUrl?: string,
) {
  const totalLeft = Math.max(0, settings.normal.totalMinutes * 60_000 - state.totalMs);
  const restLeft = state.restUntil ? Math.max(0, state.restUntil - now) : 0;
  const watchLeft = Math.max(0, settings.cooldown.watchMinutes * 60_000 - state.cooldownUsedMs);
  const recentPlatform =
    now - (state.lastCheck?.at ?? 0) < 5_000 ? state.lastCheck?.platform : null;
  const customPlatform = classifyUrl(viewingUrl ?? "") ?? recentPlatform;
  const customLeft = customPlatform
    ? Math.max(
        0,
        settings.custom.platformMinutes[customPlatform] * 60_000 - state.platformMs[customPlatform],
      )
    : null;

  let label: string;
  let time: string;
  let detail: string;

  if (mode === "normal") {
    label = "Total time left today";
    time = clock(totalLeft);
  } else if (mode === "custom") {
    label = customPlatform
      ? `Time left on ${PLATFORM_NAMES[customPlatform]}`
      : "Time left by platform";
    time = customLeft === null ? "\u2014" : clock(customLeft);
  } else {
    label = restLeft > 0 ? "Break time left" : "Watch time left this cycle";
    time = clock(restLeft > 0 ? restLeft : watchLeft);
  }

  if (mode === "cooldown") {
    detail =
      restLeft > 0 ? "A new cycle starts after the break" : "A break starts when time runs out";
  } else {
    const resetTime = new Date(nextLocalMidnight(now)).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    detail = `Resets at ${resetTime}`;
  }

  return html`
    <div class="card status">
      <small>${label}</small>
      <span class="time">${time}</span>
      <small>${detail}</small>
      <p class="tracking">${trackingText(state, now)}</p>
    </div>
  `;
}

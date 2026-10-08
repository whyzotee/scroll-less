import { html } from "lit";
import { LIMITS, TIME_MS } from "../../shared/constants";
import { PLATFORM_NAMES, PLATFORMS } from "../../shared/core";
import type { Mode, Platform, Settings, UsageState } from "../../shared/types";
import { clock } from "../../shared/utils/time";

function renderPlatform(platform: Platform, mode: Mode, settings: Settings, state: UsageState) {
  const remaining = Math.max(0, settings.custom.platformMinutes[platform] * TIME_MS.MINUTE - state.platformMs[platform]);
  const description =
    mode === "normal" ? "Shares the daily limit" : mode === "custom" ? `${clock(remaining)} left` : "Shares the watch and break cycle";

  return html`
    <div class="platform-card">
      <div class="platform-main">
        <span class="platform-badge" aria-hidden="true">
          <img src="./icons/${platform}.webp" alt="" />
        </span>
        <div class="platform-info">
          <strong>${PLATFORM_NAMES[platform]}</strong>
          <small>${description}</small>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            name="enabled-${platform}"
            aria-label=${`Limit ${PLATFORM_NAMES[platform]}`}
            ?checked=${settings.enabled[platform]}
          />
          <span class="track"></span>
        </label>
      </div>
      <div class="platform-limit" ?hidden=${mode !== "custom"}>
        <span>Daily limit</span>
        <label class="number-wrap">
          <input
            type="number"
            name="minutes-${platform}"
            min=${String(LIMITS.MIN_MINUTES)}
            max=${String(LIMITS.MAX_MINUTES)}
            required
            .value=${String(settings.custom.platformMinutes[platform])}
          />
          min
        </label>
      </div>
    </div>
  `;
}

export function renderPlatformSettings(mode: Mode, settings: Settings, state: UsageState) {
  return html`
    <div class="card">
      <div class="section-head">
        <h2>Platforms</h2>
        <span class="hint">Choose sites to limit</span>
      </div>
      <div class="platform-list">${PLATFORMS.map((platform) => renderPlatform(platform, mode, settings, state))}</div>
    </div>
  `;
}

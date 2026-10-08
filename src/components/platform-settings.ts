import { html } from 'lit';
import { PLATFORM_NAMES, PLATFORMS, type Mode, type Platform, type Settings, type UsageState } from '../core';
import { clock } from './time';

function renderPlatform(platform: Platform, mode: Mode, settings: Settings, state: UsageState) {
  const remaining = Math.max(0, settings.custom.platformMinutes[platform] * 60_000 - state.platformMs[platform]);
  return html`
    <div class="platform-card">
      <div class="platform-main">
        <span class="platform-badge" aria-hidden="true"><img src="./icons/${platform}.webp" alt="" /></span>
        <div class="platform-info"><strong>${PLATFORM_NAMES[platform]}</strong><small>${mode === 'normal' ? 'Shares the daily limit' : mode === 'custom' ? `${clock(remaining)} left` : 'Shares the watch and break cycle'}</small></div>
        <label class="switch"><input type="checkbox" name="enabled-${platform}" aria-label=${`Limit ${PLATFORM_NAMES[platform]}`} ?checked=${settings.enabled[platform]} /><span class="track"></span></label>
      </div>
      <div class="platform-limit" ?hidden=${mode !== 'custom'}>
        <span>Daily limit</span>
        <label class="number-wrap"><input type="number" name="minutes-${platform}" min="1" max="1440" required .value=${String(settings.custom.platformMinutes[platform])} /> min</label>
      </div>
    </div>
  `;
}

export function renderPlatformSettings(mode: Mode, settings: Settings, state: UsageState) {
  return html`
    <div class="card">
      <div class="section-head"><h2>Platforms</h2><span class="hint">Choose sites to limit</span></div>
      <div class="platform-list">${PLATFORMS.map((platform) => renderPlatform(platform, mode, settings, state))}</div>
    </div>
  `;
}

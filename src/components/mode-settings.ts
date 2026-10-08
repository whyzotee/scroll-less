import { html } from 'lit';
import type { Mode, Settings } from '../core';

export function renderModeSettings(mode: Mode, settings: Settings, onModeChange: (mode: Mode) => void) {
  return html`
    <div class="card">
      <div class="section-head"><h2>Mode</h2><span class="hint">Choose one mode</span></div>
      <div class="mode-switch" role="group" aria-label="Limit mode">
        <button type="button" class="mode-button" data-active=${mode === 'normal'} aria-pressed=${mode === 'normal'} @click=${() => onModeChange('normal')}><strong>Normal</strong><small>Daily limit</small></button>
        <button type="button" class="mode-button" data-active=${mode === 'cooldown'} aria-pressed=${mode === 'cooldown'} @click=${() => onModeChange('cooldown')}><strong>Cooldown</strong><small>Watch and break</small></button>
        <button type="button" class="mode-button" data-active=${mode === 'custom'} aria-pressed=${mode === 'custom'} @click=${() => onModeChange('custom')}><strong>Custom</strong><small>Per site limits</small></button>
      </div>
    </div>
    <div class="card" ?hidden=${mode !== 'normal'}>
      <div class="section-head"><h2>Daily screen time</h2><span class="hint">Shared across platforms</span></div>
      <div class="row"><label for="totalMinutes">Daily limit</label><label class="number-wrap"><input id="totalMinutes" type="number" name="totalMinutes" min="1" max="1440" required .value=${String(settings.normal.totalMinutes)} /> min</label></div>
    </div>
    <div class="card" ?hidden=${mode !== 'cooldown'}>
      <div class="section-head"><h2>Watch and break cycle</h2><span class="hint">Shared across platforms</span></div>
      <div class="row"><label for="watchMinutes">Watch time</label><label class="number-wrap"><input id="watchMinutes" type="number" name="watchMinutes" min="1" max="1440" required .value=${String(settings.cooldown.watchMinutes)} /> min</label></div>
      <div class="row"><label for="restMinutes">Break time</label><label class="number-wrap"><input id="restMinutes" type="number" name="restMinutes" min="1" max="1440" required .value=${String(settings.cooldown.restMinutes)} /> min</label></div>
    </div>
  `;
}

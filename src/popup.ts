import { LitElement, html } from 'lit';
import { classifyUrl, defaultSettings, freshState, PLATFORMS, type Mode, type Settings, type UsageState } from './core';
import { renderHeader } from './components/popup-header';
import { renderStatus } from './components/popup-status';
import { renderModeSettings } from './components/mode-settings';
import { renderPlatformSettings } from './components/platform-settings';
import { popupStyles } from './components/popup-styles';

declare const chrome: any;

type Snapshot = { settings: Settings; state: UsageState; now: number };
type Reply = { ok: boolean; result?: Snapshot; error?: string };

class ScrollLessPopup extends LitElement {
  declare settings: Settings;
  declare state: UsageState;
  declare mode: Mode;
  declare now: number;
  declare notice: string;
  declare error: string;
  private refreshTimer?: number;
  private loaded = false;
  private viewing?: { tabId: number; windowId: number; url: string };

  static properties = {
    settings: { state: true },
    state: { state: true },
    mode: { state: true },
    now: { state: true },
    notice: { state: true },
    error: { state: true },
  };

  static styles = popupStyles;

  constructor() {
    super();
    this.settings = defaultSettings();
    this.state = freshState(Date.now());
    this.mode = this.settings.mode;
    this.now = Date.now();
    this.notice = '';
    this.error = '';
  }

  override connectedCallback() {
    super.connectedCallback();
    void this.activateCurrentTab().then(() => this.refresh());
    this.refreshTimer = window.setInterval(() => void this.refresh(), 1_000);
  }

  override disconnectedCallback() {
    if (this.refreshTimer !== undefined) window.clearInterval(this.refreshTimer);
    super.disconnectedCallback();
  }

  private async activateCurrentTab() {
    if (typeof chrome === 'undefined') return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab?.id === undefined) return;
      const url = tab.url;
      if (!url || !classifyUrl(url)) return;
      this.viewing = { tabId: tab.id, windowId: tab.windowId, url };
      console.info('[ScrollLess popup] active tab', this.viewing);
      try {
        const reply = await chrome.tabs.sendMessage(tab.id, { type: 'scrollless-ping' });
        if (reply?.ok) return;
      } catch {
        // An already-open tab may not have a live content script yet.
      }
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    } catch (error) {
      console.warn('[ScrollLess popup] content script injection failed', error);
      this.error = error instanceof Error ? `Could not check this tab: ${error.message}` : 'Could not check this tab';
    }
  }

  private async refresh() {
    if (typeof chrome === 'undefined') return;
    try {
      const reply: Reply = await chrome.runtime.sendMessage({ type: 'snapshot', viewing: this.viewing });
      if (!reply.ok || !reply.result) throw new Error(reply.error ?? 'Could not load status');
      this.settings = reply.result.settings;
      this.state = reply.result.state;
      this.now = reply.result.now;
      if (!this.loaded) {
        this.mode = reply.result.settings.mode;
        this.loaded = true;
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not load status';
    }
  }

  private async save(event: Event) {
    event.preventDefault();
    const form = this.renderRoot.querySelector('form');
    if (!form) return;
    const data = new FormData(form);
    const number = (key: string) => Number(data.get(key));
    const settings: Settings = structuredClone(this.settings);
    settings.mode = this.mode;
    settings.normal.totalMinutes = number('totalMinutes');
    settings.cooldown.watchMinutes = number('watchMinutes');
    settings.cooldown.restMinutes = number('restMinutes');
    for (const platform of PLATFORMS) {
      settings.enabled[platform] = data.has(`enabled-${platform}`);
      settings.custom.platformMinutes[platform] = number(`minutes-${platform}`);
    }
    try {
      const reply: Reply = await chrome.runtime.sendMessage({ type: 'save-settings', settings });
      if (!reply.ok || !reply.result) throw new Error(reply.error ?? 'Could not save settings');
      this.settings = reply.result.settings;
      this.state = reply.result.state;
      this.notice = 'Settings saved';
      this.error = '';
    } catch (error) {
      this.notice = '';
      this.error = error instanceof Error ? error.message : 'Could not save settings';
    }
  }

  private selectMode(mode: Mode) {
    this.mode = mode;
    this.notice = '';
  }

  override render() {
    const version = typeof chrome === 'undefined' ? 'preview' : chrome.runtime.getManifest().version;
    return html`
      <div class="scroll-area">
        ${renderHeader(version)}
        ${renderStatus(this.mode, this.settings, this.state, this.now, this.viewing?.url)}
        <form id="settings-form" @submit=${this.save}>
          ${renderModeSettings(this.mode, this.settings, (mode) => this.selectMode(mode))}
          ${renderPlatformSettings(this.mode, this.settings, this.state)}
          ${this.error ? html`<p class="feedback error">${this.error}</p>` : ''}
          ${this.notice ? html`<p class="feedback success">${this.notice}</p>` : ''}
        </form>
      </div>
      <div class="save-bar"><button type="submit" form="settings-form" class="save-button">Save settings</button></div>
    `;
  }
}

customElements.define('scrollless-popup', ScrollLessPopup);

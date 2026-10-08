import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { TRACKING } from "../shared/constants";
import { defaultSettings, freshState } from "../shared/core";
import { detectActiveViewingTab, extractSettingsFromForm, fetchSnapshot, sendSaveSettings } from "./popup-service";
import type { Mode, Settings, Snapshot, UsageState, Viewing } from "../shared/types";
import { renderHeader } from "./components/popup-header";
import { renderStatus } from "./components/popup-status";
import { renderModeSettings } from "./components/mode-settings";
import { renderPlatformSettings } from "./components/platform-settings";
import { popupStyles } from "./components/popup-styles";

@customElement("scrollless-popup")
export class ScrollLessPopup extends LitElement {
  @state() private settings: Settings = defaultSettings();
  @state() private state: UsageState = freshState(Date.now());
  @state() private mode: Mode = defaultSettings().mode;
  @state() private now: number = Date.now();
  @state() private notice = "";
  @state() private error = "";

  private refreshTimer?: number;
  private loaded = false;
  private viewing?: Viewing;

  static override styles = popupStyles;

  override connectedCallback() {
    super.connectedCallback();
    void this.initialize();
  }

  override disconnectedCallback() {
    if (this.refreshTimer !== undefined) {
      window.clearInterval(this.refreshTimer);
    }
    super.disconnectedCallback();
  }

  private async initialize() {
    try {
      this.viewing = await detectActiveViewingTab();
    } catch (error) {
      this.error = error instanceof Error ? `Could not check this tab: ${error.message}` : "Could not check this tab";
    }

    await this.refresh();
    this.refreshTimer = window.setInterval(() => void this.refresh(), TRACKING.POPUP_REFRESH_INTERVAL_MS);
  }

  private async refresh() {
    if (typeof chrome === "undefined") return;

    try {
      const snapshot = await fetchSnapshot(this.viewing);
      this.applySnapshot(snapshot);
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Could not load status";
    }
  }

  private async save(event: Event) {
    event.preventDefault();
    const form = this.renderRoot.querySelector("form");
    if (!form) return;

    const nextSettings = extractSettingsFromForm(form, this.settings, this.mode);

    try {
      const snapshot = await sendSaveSettings(nextSettings);
      this.applySnapshot(snapshot);
      this.notice = "Settings saved";
      this.error = "";
    } catch (error) {
      this.notice = "";
      this.error = error instanceof Error ? error.message : "Could not save settings";
    }
  }

  private applySnapshot(snapshot: Snapshot) {
    this.settings = snapshot.settings;
    this.state = snapshot.state;
    this.now = snapshot.now;

    if (!this.loaded) {
      this.mode = snapshot.settings.mode;
      this.loaded = true;
    }
  }

  private selectMode(mode: Mode) {
    this.mode = mode;
    this.notice = "";
  }

  override render() {
    const version = typeof chrome === "undefined" ? "preview" : chrome.runtime.getManifest().version;

    return html`
      <div class="scroll-area">
        ${renderHeader(version)} ${renderStatus(this.mode, this.settings, this.state, this.now, this.viewing?.url)}
        <form id="settings-form" @submit=${this.save}>
          ${renderModeSettings(this.mode, this.settings, (mode) => this.selectMode(mode))}
          ${renderPlatformSettings(this.mode, this.settings, this.state)}
          ${this.error ? html`<p class="feedback error">${this.error}</p>` : ""}
          ${this.notice ? html`<p class="feedback success">${this.notice}</p>` : ""}
        </form>
      </div>
      <div class="save-bar">
        <button type="submit" form="settings-form" class="save-button">Save settings</button>
      </div>
    `;
  }
}

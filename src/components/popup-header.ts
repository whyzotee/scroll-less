import { html } from "lit";

export function renderHeader(version: string) {
  return html`
    <header>
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">S</span>
        <h1>ScrollLess</h1>
      </div>
      <span class="version">${version}</span>
    </header>
  `;
}

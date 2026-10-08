import { html } from "lit";

export function renderHeader(version: string) {
  return html`
    <header>
      <div class="brand">
        <img class="brand-mark" src="./logo/logo.png" alt="" />
        <h1>ScrollLess</h1>
      </div>
      <span class="version">${version}</span>
    </header>
  `;
}

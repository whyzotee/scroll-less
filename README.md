# ScrollLess

Spend less time scrolling. ScrollLess is a browser extension for Chrome and Edge that tracks time on selected social feeds and videos and blocks access when your limit is reached.

<p align="center">
  <img width="100%" alt="preview" src="https://github.com/user-attachments/assets/f8d1fc7e-486c-44a4-9380-194fd8c83310" />
</p>

## Features

- Choose the platforms and page types you want to limit.
- See your remaining time and tracking status in the extension popup.
- Set a shared daily limit, a watch-and-break cycle, or separate daily limits for each platform.
- Get a full-page reminder with a random GIF when a limit is reached.
- Keep settings and usage data locally in your browser with `chrome.storage.local`.

### Supported pages

| Platform  | Selectable pages                                                                |
| --------- | ------------------------------------------------------------------------------- |
| YouTube   | Videos under `/watch?v=…` and Shorts under `/shorts/`, each with its own switch |
| Instagram | Feed (Home, Explore, and posts under `/p/`) and Reels, each with its own switch |
| TikTok    | One switch for all pages on `tiktok.com`, `www.tiktok.com`, and `m.tiktok.com`  |
| Facebook  | Feed (Home and `/feed/`) and Reels, each with its own switch                    |

YouTube Home, Instagram Direct, and Facebook Messages do not count. Inline Facebook chat pauses tracking while you interact with the chat pane. The blocking screen links to Facebook Messages so you can still chat after reaching a limit. Because Facebook's page markup can change, inline chat detection is best effort.

### Modes

| Mode         | Behavior                                                                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Normal**   | One daily time limit shared by all enabled platforms. When it runs out, those pages stay blocked until local midnight.                                                                 |
| **Cooldown** | One shared watch period followed by a timed break. For example, watch for 15 minutes, then wait 30 minutes before the next cycle. The break continues even when the browser is closed. |
| **Custom**   | A separate daily limit for each enabled platform. Reaching one platform's limit does not block the others. Limits reset at local midnight.                                             |

ScrollLess measures elapsed time, not scroll events. Time counts while a supported page is the active tab and the browser is in front. It also continues counting if you open the ScrollLess popup over that active page. Switching tabs or moving to another application pauses tracking.

## Install from source

This repository contains the extension source. Build it before loading it into your browser:

```powershell
bun install
bun run build
```

Then:

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this project's `dist` folder.
4. Open a supported page, click the ScrollLess icon, choose a mode and platforms, then select **Save settings**.

The default setting is Normal mode with a shared 60-minute daily limit and all four platforms enabled. YouTube Shorts is on by default; YouTube Videos is off. After changing source files, run `bun run build` again and select **Reload** on the Extensions page. Always load `dist`, because `public` does not contain the built popup and scripts.

## Development

```powershell
bun run dev
```

The Vite dev server previews the popup UI. To test time tracking, tab focus, and the blocking screen, build and load the extension from `dist`.

The complete build runs TypeScript checking and three Vite targets in order: popup, background service worker, and content script. A plain `vite build` produces only the popup. The full output includes `index.html`, `manifest.json`, `background.js`, `content.js`, popup assets, icons, and GIFs.

```text
src/background/               Tracking and storage in the service worker
src/content/                  Page heartbeat and blocking-screen control
src/popup/                    Lit popup controller, service, and UI components
src/shared/                   URL detection, constants, shared types, and clock utility
public/manifest.json           Extension manifest
public/icons/                  Platform icons
public/gif/                    Blocking-screen GIFs
vite.config.ts                 Popup, background, and content builds
tests/                         Core, background, and content tests
```

To add a blocking-screen GIF, place a `.gif` file in `public/gif/`, rebuild, and reload the extension. The build creates `dist/gif/index.json` from the files in that folder; the blocking screen chooses one at random.

### Tests

Build first because two test files read compiled scripts from `dist`:

```powershell
bun run build
node --experimental-strip-types tests/core.test.mjs
node tests/background.test.mjs
node tests/content.test.mjs
```

## Troubleshooting

- **The popup says no supported page was detected:** Open one of the pages listed above in the active tab. TikTok's home page counts; YouTube Home does not. YouTube videos count only if the Videos option is enabled.
- **Time is paused:** Bring the supported tab and browser window to the front. The popup shows the current tracking reason.
- **Changes do not appear:** Rebuild, reload the extension on the Extensions page, and refresh any already-open supported tabs if needed.
- **The extension cannot access a page:** Browser internal pages such as `chrome://` and `edge://` do not allow content scripts.

For deeper debugging, check `[ScrollLess content]` in the page DevTools console and `[ScrollLess background]` in the extension service worker console. The popup displays the loaded extension version in its top-right corner.

## Releases and contributions

See [CHANGELOG.md](CHANGELOG.md) for release history. Changes are grouped from Conventional Commits with [git-cliff](https://git-cliff.org/). Project architecture and verification guidance are in [AGENTS.md](AGENTS.md).

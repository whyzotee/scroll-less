# ScrollLess contributor and agent guide

## Project purpose

ScrollLess is a Manifest V3 extension for Chrome and Edge. It limits time spent on selected social feeds and videos across YouTube, Instagram, TikTok, and Facebook. The popup is built with Lit and TypeScript; Vite produces the popup, background service worker, and content script. Keep the product name **ScrollLess** and all user-facing text in English.

## Repository map

| Path                           | Responsibility                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/core.ts`           | Platform URL matching, defaults, local-day rollover, and limit calculations. Keep this logic independent of Chrome APIs.     |
| `src/shared/constants.ts`      | Global time limits, intervals, and extension constants.                                                                      |
| `src/shared/types/`            | TypeScript definitions partitioned by domain (platform, settings, usage, messages).                                          |
| `src/shared/utils/time.ts`     | Time formatting helpers.                                                                                                     |
| `src/background/index.ts`      | Authoritative time tracking, `chrome.storage.local`, message handling, tab activation after install/startup, and debug logs. |
| `src/content/index.ts`         | One-second heartbeat on supported pages, navigation/visibility checks, and content script lifecycle.                         |
| `src/content/facebook-chat.ts` | Best-effort detection of interaction with Facebook inline chat.                                                              |
| `src/content/components/`      | Blocking overlay component.                                                                                                  |
| `src/popup/index.ts`           | Lit popup controller, state snapshots, and refresh timers.                                                                   |
| `src/popup/popup-service.ts`   | Active tab discovery, background API messaging, and form serialization.                                                      |
| `src/popup/components/`        | Popup sections and Lit styles.                                                                                               |
| `public/manifest.json`         | Extension permissions, URL matches, popup, service worker, content script, and web-accessible GIFs.                          |
| `public/icons/*.webp`          | Platform icons in the popup.                                                                                                 |
| `public/gif/*.gif`             | GIFs chosen at random on the blocking screen.                                                                                |
| `vite.config.ts`               | Three Vite build modes and generation of `gif/index.json`.                                                                   |
| `tests/`                       | Core behavior and background/content regression tests.                                                                       |
| `cliff.toml`, `CHANGELOG.md`   | git-cliff configuration and release history.                                                                                 |

## Product behavior to preserve

- **Normal:** One daily time budget shared by all enabled platforms. The popup exposes one daily limit for this mode.
- **Cooldown:** One shared watch period followed by a break. The break has a real deadline and continues while the browser is closed.
- **Custom:** An independent daily budget for each enabled platform.
- Daily budgets reset at the next **local midnight**. Do not reset them on popup close, tab reload, browser restart, or extension reload.
- Count time only for a supported page in the active tab while the browser is in front. Keep counting when the ScrollLess popup is open for that active page. Track elapsed time, not scroll events.
- Users can select YouTube `/watch` and `/shorts` separately, Instagram Feed and Reels separately, and Facebook Feed and Reels separately. YouTube Home, Instagram Direct, and Facebook Messages are excluded. TikTok uses one switch for the main `tiktok.com`, `www.tiktok.com`, and `m.tiktok.com` domains across all paths. Keep URL classification aligned with `public/manifest.json` host access.
- Facebook inline chat pauses tracking while the user interacts with its chat pane. The blocking screen provides a link to Facebook Messages so chat remains accessible when a limit is reached.
- The background service worker owns persisted settings and usage. Content and popup scripts exchange messages with it; they must not maintain competing usage counters.
- At a limit, the content script shows a blocking overlay, pauses videos, and restores page interaction when access returns. Keep overlay creation safe across extension reloads and repeated injection.
- Store settings and usage in `chrome.storage.local`. The extension does not sync across devices.
- Keep popup and blocking-screen colors and styling consistent. Avoid shadow effects, which are intentionally absent from the UI.

## Build and local development

Install dependencies with `bun install` (the repository has `bun.lock`) or with npm. Then run:

```powershell
bun run build
```

`build` runs TypeScript checking and three Vite builds in order: `popup`, `background`, then `content`. The popup build clears `dist`; the other two add `background.js` and `content.js` without clearing it. The content script is an IIFE, while the service worker is an ES module. A plain `vite build` builds only the popup and is not a complete extension build.

Load **`dist/`**, not `public/`, as an unpacked extension from `chrome://extensions` or `edge://extensions`. After source changes, rebuild and reload the extension. `bun run dev` is useful for popup layout work, but time tracking and blocking must be checked in the loaded extension. GIF filenames are collected into `dist/gif/index.json` during the popup build; adding a GIF requires a rebuild.

The built extension must contain `dist/index.html`, `dist/manifest.json`, `dist/background.js`, `dist/content.js`, `dist/gif/index.json`, the GIF files, and platform icons. Keep filenames referenced by the manifest in sync with Vite output. Never attempt content-script injection into `chrome://`, `edge://`, or other unsupported pages.

## Verification

Run a full build before the tests, because the background and content tests read files from `dist/`:

```powershell
bun run build
node --experimental-strip-types tests/core.test.mjs
node tests/background.test.mjs
node tests/content.test.mjs
```

There is currently no `test` script in `package.json`; do not document `npm test` as a working command unless that script is added. For browser checks, verify URL changes within an existing tab, browser/tab focus changes, popup-open counting, limit blocking, next-day reset, and reload behavior. Content logs use `[ScrollLess content]` in page DevTools; tracking logs use `[ScrollLess background]` in the service worker console.

## Editing guidance

- Put pure rules and data validation in `src/shared/core.ts`, not in the Lit view or content script. Update its tests when behavior changes.
- Keep `src/popup/index.ts` as a controller. Put popup markup and styles in the appropriate `src/popup/components/` file.
- Keep storage and message handling serialized in the background script so simultaneous heartbeats and popup snapshots do not overwrite one another.
- If changing supported platforms or URL patterns, update classification, manifest permissions/matches, UI labels/icons, and relevant tests together.
- If changing version, keep `package.json` and `public/manifest.json` equal. Use `v`-prefixed Git tags such as `v0.1.0` for releases.
- Use Conventional Commits (`feat:`, `fix:`, `docs:`, etc.) so git-cliff can group changes. Generate the changelog with `bunx git-cliff -o CHANGELOG.md` after fetching release tags. Existing release notes may contain manual detail that a single commit message cannot regenerate; review the diff before replacing them.

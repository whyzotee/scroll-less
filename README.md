# ScrollLess

A Chrome and Edge extension that limits time spent on YouTube Shorts, Instagram Reels, TikTok, and Facebook Reels. Built with Lit, TypeScript, and Vite.

## How it works

- **Normal:** Set one daily limit shared by all enabled platforms. When time runs out, restricted pages stay blocked until local midnight.
- **Cooldown:** Set a watch period and a break period, such as 15 minutes of watching followed by a 30 minute break. The cycle is shared across enabled platforms, and the break continues even when the browser is closed.
- **Custom:** Set a separate daily limit for each platform. When one platform reaches its limit, only that platform is blocked until local midnight.
- Time counts only while a supported page is the active tab and the browser is in front. ScrollLess measures time, not scroll events.
- TikTok counts all pages on `tiktok.com`, `www.tiktok.com`, and `m.tiktok.com`, including profiles and search. YouTube, Instagram, and Facebook count only Shorts or Reels pages.
- You can enable or disable each platform and change settings from the popup.
- Time continues counting while the popup is open on an active supported tab, even if the website reports that its page is hidden by the popup.
- Data is stored locally in this browser with `chrome.storage.local` and is not synced across devices.
- When a limit is reached, the blocking screen picks a random GIF from `public/gif/` and displays “STOP DOOMSCROLL!” at the bottom of the image. Add more `.gif` files there, rebuild, and reload the extension to include them.

## Build

The popup controller is in `src/popup.ts`, with its UI sections and styles in `src/components/`. The page tracker is in `src/content.ts`; its blocking screen is in `src/components/limit-overlay.ts`.

```powershell
npm install
npm run build
npm test
```

`vite.config.ts` contains the build settings for the popup, background service worker, and content script. `npm run build` runs each Vite target in order because the content script needs an IIFE output while the service worker uses an ES module. The Vite plugin also generates the GIF list automatically.

The build creates `dist/index.html`, `dist/background.js`, `dist/content.js`, `dist/manifest.json`, the popup JavaScript in `dist/assets/`, and platform icons in `dist/icons/`.

## Install

1. Open `chrome://extensions` or `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select `C:\Users\zenle\Desktop\scrollless\dist`.
4. Click the **ScrollLess** icon to configure your limits.

After installing or reloading the extension, ScrollLess activates supported tabs that are already open. The popup shows whether time is counting or why it is paused. Automatic activation requires site access on the supported domains.

Check logs in the page DevTools (`[ScrollLess content]`) and under **Service worker → Inspect** on the Extensions page (`[ScrollLess background]`). Background logs show focus state and counted seconds.

Select the `dist` folder: the `public` folder contains the source `manifest.json` but no `index.html`. After changing the code, run `npm run build` and click **Reload** on the Extensions page.

The **Errors** list on the Extensions page may still show old errors after a fix. Click **Clear all**, then open the popup from a TikTok or Shorts tab again. The loaded version appears in the popup's top right corner.

`npm run dev` previews the popup UI in a browser. Test time tracking and blocking through the extension loaded from `dist`.

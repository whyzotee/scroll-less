# Privacy Policy for scroll-less

**Effective Date:** October 9, 2026  
**Last Updated:** October 9, 2026

ScrollLess ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy explains how ScrollLess handles data when you use the browser extension on Google Chrome and Microsoft Edge.

## 1. Summary of Our Privacy Principles

- **No Personal Data Collection:** ScrollLess does not collect, harvest, transmit, or sell any personally identifiable information (PII), personal communications, passwords, browsing history, or payment details.
- **100% Local Processing:** All time-tracking logic and settings are processed and stored locally on your device.
- **No Remote Servers or Analytics:** ScrollLess does not communicate with external servers, cloud backends, or third-party analytics services (no Google Analytics, telemetry, or tracking pixels).
- **No Data Sharing or Selling:** We do not sell, rent, trade, or transfer any user data to third parties.

## 2. Information Handled by the Extension

ScrollLess processes only the minimum amount of data necessary to provide its core functionality (monitoring and limiting time spent on short-form video platforms):

1. **User Settings & Configuration:**
   - Tracking mode (Normal, Cooldown, or Custom).
   - Time budget preferences (e.g., daily limit minutes, cooldown watch/rest intervals).
   - Platform toggles (enabled/disabled status for YouTube Shorts, Instagram Reels, TikTok, and Facebook Reels).
   - _Storage location:_ Stored locally in your browser via `chrome.storage.local`.

2. **Local Usage Statistics:**
   - Active watch time in milliseconds accumulated during the current calendar day.
   - Date key (e.g., `YYYY-MM-DD`) used to reset counters automatically at local midnight.
   - Cooldown timer state (active watch elapsed time, cooldown break expiration timestamp).
   - _Storage location:_ Stored locally in your browser via `chrome.storage.local`.

3. **Active Page Classification:**
   - The extension checks the URL of the active tab to detect whether it matches a supported short-form video path (e.g., `youtube.com/shorts/*`, `instagram.com/reel/*`, `facebook.com/reel/*`, and TikTok domains).
   - _Processing:_ URLs are evaluated strictly in-memory within your browser. Full browsing history is never stored, tracked, or transmitted.

## 3. Chrome Web Store Permissions & Justifications

ScrollLess requests only permissions that are strictly necessary for its operation:

| Permission                                                                                     | Justification                                                                                                                                                                                                                                                                                  |
| :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                                                                      | Required to save user configuration (modes, time limits, platform toggles) and track daily elapsed watch time locally on your computer via `chrome.storage.local`.                                                                                                                             |
| `activeTab`                                                                                    | Required to determine whether the currently active tab is playing short-form video content and to pause tracking when the tab loses focus or when switching tabs.                                                                                                                              |
| `scripting`                                                                                    | Required to safely inject content scripts into already-open supported tabs upon extension installation or browser startup, avoiding the need for manual page refreshes.                                                                                                                        |
| **Host Permissions**<br>(`*.youtube.com`, `*.instagram.com`, `*.tiktok.com`, `*.facebook.com`) | Required to inspect URL paths on supported platforms (specifically targeting Shorts/Reels paths and TikTok) to count active watch time and display the blocking overlay when your configured limit is reached. No page content or user data outside of URL structure is accessed or collected. |

## 4. Data Storage, Retention, and Deletion

- **Local Storage:** All preferences and usage counts are stored exclusively on your device using `chrome.storage.local`. The extension does not use cross-device synchronization (`chrome.storage.sync`).
- **Automatic Rollover:** Usage counters automatically reset to zero at your local midnight or upon conclusion of a cooldown break.
- **User Control & Deletion:** You can delete all data stored by ScrollLess at any time by uninstalling the extension from your browser (`chrome://extensions`) or by clearing extension site data in your browser settings.

## 5. Third-Party Services and Data Sharing

- ScrollLess does **not** integrate third-party trackers, advertisements, or analytics SDKs.
- ScrollLess does **not** send or receive network requests to any remote API, server, or cloud service.
- ScrollLess complies with the Google Chrome Web Store Developer Program Policies, including the Limited Use requirements.

## 6. Children's Privacy

ScrollLess does not knowingly collect or solicit any personal information from children under the age of 13 (or under 16 in the EU). Since no personal data is collected from any user, ScrollLess is safe for users of all ages.

## 7. Changes to This Privacy Policy

If we update this Privacy Policy to reflect changes in our practices or extension features, the updated policy will be posted to this repository with a revised "Last Updated" date.

## 8. Contact Information

If you have any questions or feedback regarding this Privacy Policy or ScrollLess, please contact:

- **Developer:** Chatnarint Boonsaeng
- **Email:** [zenlektomyum@gmail.com](mailto:zenlektomyum@gmail.com)
- **GitHub Repository:** [https://github.com/whyzotee/scroll-less](https://github.com/whyzotee/scroll-less)

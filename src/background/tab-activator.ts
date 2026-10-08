import { classifyUrl } from "../shared/core";

export async function activateOpenTabs(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs.map(async (tab) => {
        if (tab.id === undefined || !tab.url?.startsWith("https://") || !classifyUrl(tab.url)) {
          return;
        }
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
          });
        } catch (error) {
          console.warn("[ScrollLess background] could not activate an open tab", tab.id, error);
        }
      }),
    );
  } catch (error) {
    console.warn("[ScrollLess background] could not list open tabs", error);
  }
}

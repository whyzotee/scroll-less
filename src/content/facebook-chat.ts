// Facebook does not expose a stable API for its inline chat windows. Keep the
// DOM checks here so changes to its markup do not affect tracking elsewhere.
const CHAT_LABEL = /\b(chat|message|messenger)\b|แชท|ข้อความ/i;

function findChatPane(element: Element): Element | null {
  const pane = element.closest('[role="dialog"], [data-pagelet*="ChatTab"], [data-pagelet*="Messaging"]');
  if (!pane) return null;

  const pagelet = pane.getAttribute("data-pagelet") ?? "";
  const label = pane.getAttribute("aria-label") ?? "";
  if (/ChatTab|Messaging/i.test(pagelet) || CHAT_LABEL.test(label)) return pane;

  // A message composer plus a link to the full inbox distinguishes chat from
  // other Facebook dialogs such as the post composer.
  const hasComposer = pane.querySelector('[contenteditable="true"], [role="textbox"]');
  const hasInboxLink = pane.querySelector('a[href*="/messages/"], a[href*="messenger.com/"]');
  return hasComposer && hasInboxLink ? pane : null;
}

export class FacebookChatActivity {
  private pane: Element | null = null;

  constructor() {
    const focused = document.activeElement;
    if (typeof Element !== "undefined" && focused instanceof Element) this.pane = findChatPane(focused);
    document.addEventListener("pointerdown", (event) => this.update(event), true);
    document.addEventListener("focusin", (event) => this.update(event), true);
    document.addEventListener("wheel", (event) => this.update(event), true);
  }

  get isActive(): boolean {
    return this.pane?.isConnected === true;
  }

  private update(event: Event): void {
    const target = event.composedPath().find((node): node is Element => typeof Element !== "undefined" && node instanceof Element);
    this.pane = target ? findChatPane(target) : null;
  }
}

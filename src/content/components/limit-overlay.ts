import { EXTENSION } from "../../shared/constants";
import { PLATFORM_NAMES } from "../../shared/core";
import type { Access, Platform } from "../../shared/types";
import { clock } from "../../shared/utils/time";

export class LimitOverlay {
  private overlay: HTMLElement | null = null;
  private message: HTMLElement | null = null;
  private countdown: HTMLElement | null = null;
  private previousBody: HTMLElement | null = null;
  private previousInert = false;
  private gifFilesPromise: Promise<string[]> | null = null;

  constructor() {
    const staleOverlay = document.getElementById(EXTENSION.OVERLAY_ID);
    if (staleOverlay) {
      if (document.body) {
        document.body.inert = staleOverlay.dataset.previousBodyInert === "true";
      }
      staleOverlay.remove();
    }
  }

  get isVisible(): boolean {
    return this.overlay?.isConnected ?? false;
  }

  clear() {
    this.overlay?.remove();
    this.overlay = null;
    this.message = null;
    this.countdown = null;
    if (this.previousBody) {
      this.previousBody.inert = this.previousInert;
    }
    this.previousBody = null;
  }

  show(access: Access, platform: Platform) {
    this.make();
    document.querySelectorAll("video").forEach((video) => video.pause());

    if (this.message) {
      this.message.textContent =
        access.reason === "rest"
          ? `Your watch cycle is over. Take a break before returning to ${PLATFORM_NAMES[platform]}.`
          : access.reason === "daily-platform"
            ? `You have reached today's limit for ${PLATFORM_NAMES[platform]}.`
            : "You have reached your shared daily limit.";
    }

    if (this.countdown) {
      this.countdown.textContent = access.availableAt ? clock(Math.max(0, access.availableAt - Date.now())) : "";
    }
  }

  private gifFiles(): Promise<string[]> {
    this.gifFilesPromise ??= fetch(chrome.runtime.getURL("gif/index.json"))
      .then((response) => {
        if (!response.ok) throw new Error(`GIF list returned ${response.status}`);
        return response.json();
      })
      .then((files: unknown) =>
        Array.isArray(files) ? files.filter((file): file is string => typeof file === "string" && /^[^/\\]+\.gif$/i.test(file)) : [],
      );
    return this.gifFilesPromise;
  }

  private async showRandomGif(image: HTMLImageElement) {
    try {
      const files = await this.gifFiles();
      if (!image.isConnected || files.length === 0) return;
      const file = files[Math.floor(Math.random() * files.length)];
      image.onload = () => {
        if (image.isConnected) image.parentElement!.hidden = false;
      };
      image.src = chrome.runtime.getURL(`gif/${encodeURIComponent(file)}`);
    } catch (error) {
      console.warn("[ScrollLess content] could not load GIF", error);
    }
  }

  private make() {
    if (this.overlay?.isConnected) return;
    if (this.overlay && this.previousBody) {
      this.previousBody.inert = this.previousInert;
      this.previousBody = null;
    }

    this.overlay = document.createElement("div");
    this.overlay.id = EXTENSION.OVERLAY_ID;

    const root = this.overlay.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        overflow-y: auto;
        padding: 20px;
        background: #f3f6fb;
        color: #17243a;
        font: 14px system-ui, sans-serif;
      }
      .card {
        box-sizing: border-box;
        width: min(384px, 100%);
        margin: auto;
        padding: 20px;
        border: 1px solid #e4eaf3;
        border-radius: 17px;
        background: white;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        color: #8290a5;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0;
      }
      .brand-mark {
        display: block;
        width: 25px;
        height: 25px;
        flex: none;
        border-radius: 8px;
        object-fit: contain;
      }
      .gif-wrap {
        position: relative;
        overflow: hidden;
        margin: 0 0 16px;
        border-radius: 12px;
      }
      .gif-wrap[hidden] {
        display: none;
      }
      .gif-wrap img {
        display: block;
        width: 100%;
        height: auto;
      }
      .gif-wrap figcaption {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        padding: 18px 8px 12px;
        background: linear-gradient(transparent, rgba(22, 41, 71, .92));
        color: white;
        font-size: 18px;
        font-weight: 800;
        letter-spacing: .04em;
        text-align: center;
      }
      h1 {
        margin: 0 0 16px;
        font-size: 24px;
        letter-spacing: -.035em;
        line-height: 1.2;
      }
      p {
        margin: 0 0 16px;
        color: #6d7b91;
        font-size: 14px;
        line-height: 1.5;
      }
      .timer {
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        padding: 18px 19px;
        border-radius: 17px;
        background: linear-gradient(135deg, #162947, #203c6c);
        color: white;
      }
      .timer::after {
        content: '';
        position: absolute;
        width: 150px;
        height: 150px;
        right: -38px;
        top: -75px;
        border: 1px solid #ffffff26;
        border-radius: 50%;
        pointer-events: none;
      }
      .timer small {
        position: relative;
        display: block;
        color: #b9ccec;
        font-size: 12px;
      }
      .timer strong {
        position: relative;
        display: block;
        margin-top: 6px;
        font-size: 34px;
        font-weight: 800;
        letter-spacing: -.04em;
        font-variant-numeric: tabular-nums;
      }
    `;

    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "alertdialog");
    card.setAttribute("aria-modal", "true");

    const brand = document.createElement("div");
    brand.className = "brand";

    const brandMark = document.createElement("img");
    brandMark.className = "brand-mark";
    brandMark.src = chrome.runtime.getURL("logo/logo.png");
    brandMark.alt = "";

    const brandName = document.createElement("span");
    brandName.textContent = "ScrollLess";
    brand.append(brandMark, brandName);

    const heading = document.createElement("h1");
    heading.textContent = "Time for a break";

    const gif = document.createElement("figure");
    gif.className = "gif-wrap";
    gif.hidden = true;

    const gifImage = document.createElement("img");
    gifImage.alt = "";

    const gifCaption = document.createElement("figcaption");
    gifCaption.textContent = "STOP DOOMSCROLL!";
    gif.append(gifImage, gifCaption);

    this.message = document.createElement("p");

    const timer = document.createElement("div");
    timer.className = "timer";

    const timerLabel = document.createElement("small");
    timerLabel.textContent = "Available in";

    this.countdown = document.createElement("strong");
    timer.append(timerLabel, this.countdown);

    card.append(brand, heading, gif, this.message, timer);
    root.append(style, card);
    document.documentElement.append(this.overlay);

    void this.showRandomGif(gifImage);

    if (document.body) {
      this.previousBody = document.body;
      this.previousInert = this.previousBody.inert;
      this.overlay.dataset.previousBodyInert = String(this.previousInert);
      this.previousBody.inert = true;
    }
  }
}

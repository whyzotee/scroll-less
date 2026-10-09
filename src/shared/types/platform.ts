export type Platform = "youtube" | "instagram" | "tiktok" | "facebook";
export type Mode = "normal" | "cooldown" | "custom";
export type PageKind = "watch" | "shorts" | "feed" | "reels" | "site";
export interface ClassifiedPage {
  platform: Platform;
  kind: PageKind;
}

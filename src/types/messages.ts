import type { Access } from "./usage";
import type { Settings } from "./settings";
import type { UsageState } from "./usage";

export interface Sender {
  tab?: {
    id?: number;
    windowId: number;
    active: boolean;
  };
}

export interface Viewing {
  tabId: number;
  windowId: number;
  url: string;
}

export type Message =
  | { type: "snapshot"; viewing?: Viewing }
  | { type: "save-settings"; settings: unknown }
  | { type: "heartbeat"; url: string; visible: boolean; pageFocused: boolean }
  | { type: "leave" };

export interface Snapshot {
  settings: Settings;
  state: UsageState;
  now: number;
  access?: Access | null;
}

export interface MessageReply<T = unknown> {
  ok: boolean;
  result?: T;
  error?: string;
}

export type PingListener = (
  incoming: { type?: string },
  sender: unknown,
  sendResponse: (reply: { ok: boolean }) => void,
) => void;

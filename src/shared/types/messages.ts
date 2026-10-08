import type { Access, UsageState } from "./usage";
import type { Settings } from "./settings";

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

export interface SnapshotMessage {
  type: "snapshot";
  viewing?: Viewing;
}

export interface SaveSettingsMessage {
  type: "save-settings";
  settings: unknown;
}

export interface HeartbeatMessage {
  type: "heartbeat";
  url: string;
  visible: boolean;
  pageFocused: boolean;
}

export interface LeaveMessage {
  type: "leave";
}

export type Message = SnapshotMessage | SaveSettingsMessage | HeartbeatMessage | LeaveMessage;

export interface Snapshot {
  settings: Settings;
  state: UsageState;
  now: number;
  access?: Access | null;
}

export interface HandlerContext {
  settings: Settings;
  state: UsageState;
  now: number;
}

export interface MessageReply<T = unknown> {
  ok: boolean;
  result?: T;
  error?: string;
}

export type PingListener = (incoming: { type?: string }, sender: unknown, sendResponse: (reply: { ok: boolean }) => void) => void;

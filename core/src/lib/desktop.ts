export type UpdateState = {
  status: "idle" | "checking" | "current" | "available" | "downloading" | "ready" | "installing" | "error" | "skipped" | "dismissed";
  current: string;
  version?: string | null;
  notes?: string;
  url?: string;
  published?: string | null;
  progress?: number;
  error?: string | null;
  note?: string;
  manual?: boolean;
  canInstall: boolean;
  platform: string;
};

export type UpdatePrefs = { autoCheck: boolean; skip: string | null };

export type DesktopBridge = {
  chooseFolder: () => Promise<string | null>;
  updateState?: () => Promise<UpdateState | null>;
  updateAction?: (action: "check" | "open" | "skip" | "dismiss" | "install") => Promise<UpdateState | null>;
  updatePrefs?: (patch?: Partial<UpdatePrefs>) => Promise<UpdatePrefs | null>;
};

declare global {
  interface Window {
    taclog?: DesktopBridge;
  }
}

export {};

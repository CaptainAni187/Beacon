import { create } from "zustand";

export type Theme = "light" | "dark" | "system";
export type ToastVariant = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface PrivacySettings {
  readReceiptsEnabled: boolean;
  lastSeenVisible: boolean;
  typingIndicatorsEnabled: boolean;
  storiesEnabled: boolean;
  storyViewReceiptsEnabled: boolean;
  defaultDisappearingTimerSeconds: number;
}

export type NotificationContentLevel = "name-content-actions" | "name-only" | "none";

interface NotificationSettings {
  desktopNotifications: boolean;
  messagePreview: boolean;
  soundEnabled: boolean;
  showCallNotifications: boolean;
  includeMutedInBadge: boolean;
  contentLevel: NotificationContentLevel;
  pushNotificationSounds: boolean;
  inChatMessageSounds: boolean;
}

interface CallSettings {
  incomingCallsEnabled: boolean;
  callingSoundsEnabled: boolean;
  alwaysRelayCalls: boolean;
  videoDeviceId: string | null;
  microphoneDeviceId: string | null;
  speakerDeviceId: string | null;
}

interface DataUsageSettings {
  autoDownloadPhotos: boolean;
  autoDownloadVideos: boolean;
  autoDownloadAudio: boolean;
  autoDownloadDocuments: boolean;
  sentMediaQuality: "standard" | "high";
}

interface GeneralSettings {
  openAtLogin: boolean;
  autoDownloadUpdates: boolean;
}

interface AppearanceSettings {
  chatColor: string;
  zoomLevel: number;
}

interface ChatSettings {
  spellCheckEnabled: boolean;
  textFormattingPopoverEnabled: boolean;
  linkPreviewsEnabled: boolean;
  addressBookPhotosEnabled: boolean;
  convertEmoticonsToEmoji: boolean;
  keepMutedChatsArchived: boolean;
  emojiSkinTone: number; // 0 = default yellow, 1-5 = Fitzpatrick scale
}

export interface ChatFolder {
  id: string;
  name: string;
  includedChatIds: string[];
  excludedChatIds: string[];
  onlyUnread: boolean;
  includeMuted: boolean;
}

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  toasts: Toast[];
  isCreateGroupModalOpen: boolean;
  isGroupInfoPanelOpen: boolean;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  calls: CallSettings;
  dataUsage: DataUsageSettings;
  general: GeneralSettings;
  appearance: AppearanceSettings;
  chats: ChatSettings;
  chatFolders: ChatFolder[];
}

interface UIActions {
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  setCreateGroupModalOpen: (open: boolean) => void;
  setGroupInfoPanelOpen: (open: boolean) => void;
  setPrivacySetting: <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => void;
  setNotificationSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void;
  setCallSetting: <K extends keyof CallSettings>(key: K, value: CallSettings[K]) => void;
  setDataUsageSetting: <K extends keyof DataUsageSettings>(key: K, value: DataUsageSettings[K]) => void;
  setGeneralSetting: <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => void;
  setAppearanceSetting: <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => void;
  setChatSetting: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void;
  addChatFolder: (folder: Omit<ChatFolder, "id">) => void;
  removeChatFolder: (id: string) => void;
  hydrate: () => void;
  reset: () => void;
}

type UIStore = UIState & UIActions;

const THEME_KEY = "beacon_theme";
const PRIVACY_KEY = "beacon_privacy";
const NOTIFICATIONS_KEY = "beacon_notifications";
const CALLS_KEY = "beacon_call_settings";
const DATA_USAGE_KEY = "beacon_data_usage";
const GENERAL_KEY = "beacon_general_settings";
const APPEARANCE_KEY = "beacon_appearance_settings";
const CHATS_KEY = "beacon_chat_settings";
const CHAT_FOLDERS_KEY = "beacon_chat_folders";

const defaultPrivacy: PrivacySettings = {
  readReceiptsEnabled: true,
  lastSeenVisible: true,
  typingIndicatorsEnabled: true,
  storiesEnabled: true,
  storyViewReceiptsEnabled: true,
  defaultDisappearingTimerSeconds: 0,
};

const defaultNotifications: NotificationSettings = {
  desktopNotifications: true,
  messagePreview: true,
  soundEnabled: true,
  showCallNotifications: true,
  includeMutedInBadge: false,
  contentLevel: "name-content-actions",
  pushNotificationSounds: false,
  inChatMessageSounds: false,
};

const defaultCalls: CallSettings = {
  incomingCallsEnabled: true,
  callingSoundsEnabled: true,
  alwaysRelayCalls: false,
  videoDeviceId: null,
  microphoneDeviceId: null,
  speakerDeviceId: null,
};

const defaultDataUsage: DataUsageSettings = {
  autoDownloadPhotos: true,
  autoDownloadVideos: true,
  autoDownloadAudio: true,
  autoDownloadDocuments: true,
  sentMediaQuality: "standard",
};

const defaultGeneral: GeneralSettings = {
  openAtLogin: false,
  autoDownloadUpdates: true,
};

const defaultAppearance: AppearanceSettings = {
  chatColor: "#3a76f0",
  zoomLevel: 100,
};

const defaultChats: ChatSettings = {
  spellCheckEnabled: true,
  textFormattingPopoverEnabled: true,
  linkPreviewsEnabled: true,
  addressBookPhotosEnabled: false,
  convertEmoticonsToEmoji: true,
  keepMutedChatsArchived: false,
  emojiSkinTone: 0,
};

const initialState: UIState = {
  theme: "system",
  sidebarOpen: true,
  toasts: [],
  isCreateGroupModalOpen: false,
  isGroupInfoPanelOpen: false,
  privacy: defaultPrivacy,
  notifications: defaultNotifications,
  calls: defaultCalls,
  dataUsage: defaultDataUsage,
  general: defaultGeneral,
  appearance: defaultAppearance,
  chats: defaultChats,
  chatFolders: [],
};

function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

let toastCounter = 0;
let folderCounter = 0;

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const prefersDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", prefersDark);
}

function applyZoom(zoomLevel: number): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = `${(zoomLevel / 100) * 16}px`;
}

/**
 * Global UI state store.
 * Manages theme preferences, sidebar visibility, toast notifications, and modal states.
 */
export const useUIStore = create<UIStore>((set) => ({
  ...initialState,

  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
    if (typeof window !== "undefined") localStorage.setItem(THEME_KEY, theme);
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    // Auto-remove after duration
    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setCreateGroupModalOpen: (isCreateGroupModalOpen) =>
    set({ isCreateGroupModalOpen }),

  setGroupInfoPanelOpen: (isGroupInfoPanelOpen) => set({ isGroupInfoPanelOpen }),

  setPrivacySetting: (key, value) =>
    set((state) => {
      const privacy = { ...state.privacy, [key]: value };
      if (typeof window !== "undefined") localStorage.setItem(PRIVACY_KEY, JSON.stringify(privacy));
      return { privacy };
    }),

  setNotificationSetting: (key, value) =>
    set((state) => {
      const notifications = { ...state.notifications, [key]: value };
      if (typeof window !== "undefined")
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
      return { notifications };
    }),

  setCallSetting: (key, value) =>
    set((state) => {
      const calls = { ...state.calls, [key]: value };
      if (typeof window !== "undefined") localStorage.setItem(CALLS_KEY, JSON.stringify(calls));
      return { calls };
    }),

  setDataUsageSetting: (key, value) =>
    set((state) => {
      const dataUsage = { ...state.dataUsage, [key]: value };
      if (typeof window !== "undefined")
        localStorage.setItem(DATA_USAGE_KEY, JSON.stringify(dataUsage));
      return { dataUsage };
    }),

  setGeneralSetting: (key, value) =>
    set((state) => {
      const general = { ...state.general, [key]: value };
      if (typeof window !== "undefined") localStorage.setItem(GENERAL_KEY, JSON.stringify(general));
      return { general };
    }),

  setAppearanceSetting: (key, value) =>
    set((state) => {
      const appearance = { ...state.appearance, [key]: value };
      if (typeof window !== "undefined")
        localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
      if (key === "zoomLevel") applyZoom(value as number);
      return { appearance };
    }),

  setChatSetting: (key, value) =>
    set((state) => {
      const chats = { ...state.chats, [key]: value };
      if (typeof window !== "undefined") localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
      return { chats };
    }),

  addChatFolder: (folder) =>
    set((state) => {
      const chatFolders = [...state.chatFolders, { ...folder, id: `folder-${++folderCounter}` }];
      if (typeof window !== "undefined")
        localStorage.setItem(CHAT_FOLDERS_KEY, JSON.stringify(chatFolders));
      return { chatFolders };
    }),

  removeChatFolder: (id) =>
    set((state) => {
      const chatFolders = state.chatFolders.filter((f) => f.id !== id);
      if (typeof window !== "undefined")
        localStorage.setItem(CHAT_FOLDERS_KEY, JSON.stringify(chatFolders));
      return { chatFolders };
    }),

  hydrate: () => {
    const theme = (typeof window !== "undefined"
      ? (localStorage.getItem(THEME_KEY) as Theme | null)
      : null) ?? "system";
    const privacy = readStoredJson(PRIVACY_KEY, defaultPrivacy);
    const notifications = readStoredJson(NOTIFICATIONS_KEY, defaultNotifications);
    const calls = readStoredJson(CALLS_KEY, defaultCalls);
    const dataUsage = readStoredJson(DATA_USAGE_KEY, defaultDataUsage);
    const general = readStoredJson(GENERAL_KEY, defaultGeneral);
    const appearance = readStoredJson(APPEARANCE_KEY, defaultAppearance);
    const chats = readStoredJson(CHATS_KEY, defaultChats);
    const chatFolders = readStoredJson<ChatFolder[]>(CHAT_FOLDERS_KEY, []);
    set({ theme, privacy, notifications, calls, dataUsage, general, appearance, chats, chatFolders });
    applyTheme(theme);
    applyZoom(appearance.zoomLevel);
  },

  reset: () => set(initialState),
}));

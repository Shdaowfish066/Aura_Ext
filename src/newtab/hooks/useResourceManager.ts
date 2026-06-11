import { useCallback, useEffect, useRef, useState } from "react";
import type { ResourceSettings, ResourceStats, TrackedTab } from "../../types";
import {
  createDefaultResourceSettings,
  createDefaultResourceStats,
  onChange,
  resourceManager,
  sessionGet,
} from "../../storage";

export type MemoryReading = { availableMB: number; totalMB: number };

const TAB_ACTIVITY_KEY = "tab_activity";

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** Only plain web pages are listed — the extension's own pages, chrome://
 *  and friends can never be snoozed, so they'd just be noise. */
function isListable(tab: chrome.tabs.Tab): boolean {
  const url = tab.url ?? "";
  return url.startsWith("http://") || url.startsWith("https://");
}

/** Drives the Resource Manager panel: live tab list, settings, stats, RAM. */
export function useResourceManager() {
  const [tabs, setTabs] = useState<TrackedTab[]>([]);
  const [settings, setSettings] = useState<ResourceSettings>(
    createDefaultResourceSettings()
  );
  const [stats, setStats] = useState<ResourceStats>(
    createDefaultResourceStats()
  );
  const [memory, setMemory] = useState<MemoryReading | null>(null);
  const [ready, setReady] = useState(false);

  // Latest settings without re-binding callbacks/listeners.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const refreshTabs = useCallback(async () => {
    if (typeof chrome === "undefined" || !chrome.tabs?.query) return;
    const [chromeTabs, activity] = await Promise.all([
      chrome.tabs.query({}),
      sessionGet<Record<number, number>>(TAB_ACTIVITY_KEY),
    ]);
    const whitelist = settingsRef.current.whitelist;
    const now = Date.now();
    const list: TrackedTab[] = [];
    for (const t of chromeTabs) {
      if (t.id === undefined || !isListable(t)) continue;
      const host = hostnameOf(t.url ?? "");
      list.push({
        id: t.id,
        windowId: t.windowId,
        title: t.title || t.url || "Untitled",
        url: t.url ?? "",
        favIconUrl: t.favIconUrl,
        active: t.active,
        pinned: t.pinned,
        audible: t.audible ?? false,
        discarded: t.discarded ?? false,
        lastActiveAt: activity?.[t.id] ?? now,
        whitelisted: host !== "" && whitelist.includes(host),
      });
    }
    // Active tabs first, then most recently used.
    list.sort((a, b) =>
      a.active !== b.active
        ? (a.active ? -1 : 1)
        : b.lastActiveAt - a.lastActiveAt
    );
    setTabs(list);
  }, []);

  const refreshMemory = useCallback(async () => {
    try {
      if (typeof chrome === "undefined" || !chrome.system?.memory) {
        setMemory(null);
        return;
      }
      const info = await chrome.system.memory.getInfo();
      setMemory({
        totalMB: Math.round(info.capacity / (1024 * 1024)),
        availableMB: Math.round(info.availableCapacity / (1024 * 1024)),
      });
    } catch {
      setMemory(null);
    }
  }, []);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage) return;
    let alive = true;

    void Promise.all([
      resourceManager.getSettings(),
      resourceManager.getStats(),
    ]).then(([s, st]) => {
      if (!alive) return;
      setSettings(s);
      setStats(st);
      setReady(true);
    });
    void refreshTabs();
    void refreshMemory();

    const offSettings = onChange("resource_settings", (s) => {
      if (alive && s) setSettings(s);
    });
    const offStats = onChange("resource_stats", (s) => {
      if (alive && s) setStats(s);
    });

    const onTabsChanged = () => void refreshTabs();
    chrome.tabs?.onUpdated.addListener(onTabsChanged);
    chrome.tabs?.onRemoved.addListener(onTabsChanged);
    chrome.tabs?.onActivated.addListener(onTabsChanged);
    chrome.tabs?.onCreated.addListener(onTabsChanged);

    const interval = setInterval(() => {
      void refreshTabs();
      void refreshMemory();
    }, 30_000);

    return () => {
      alive = false;
      offSettings();
      offStats();
      chrome.tabs?.onUpdated.removeListener(onTabsChanged);
      chrome.tabs?.onRemoved.removeListener(onTabsChanged);
      chrome.tabs?.onActivated.removeListener(onTabsChanged);
      chrome.tabs?.onCreated.removeListener(onTabsChanged);
      clearInterval(interval);
    };
  }, [refreshTabs, refreshMemory]);

  // Recompute `whitelisted` flags when the whitelist changes.
  const whitelistKey = settings.whitelist.join("|");
  useEffect(() => {
    void refreshTabs();
  }, [whitelistKey, refreshTabs]);

  const saveSettings = useCallback((next: ResourceSettings) => {
    setSettings(next); // optimistic; onChange confirms
    void resourceManager.setSettings(next);
  }, []);

  const toggleEnabled = useCallback(() => {
    const cur = settingsRef.current;
    saveSettings({ ...cur, enabled: !cur.enabled });
  }, [saveSettings]);

  const setIdleMinutes = useCallback(
    (n: number) => {
      saveSettings({ ...settingsRef.current, idleMinutes: n });
    },
    [saveSettings]
  );

  const whitelistHost = useCallback(
    (host: string) => {
      const cur = settingsRef.current;
      if (!host || cur.whitelist.includes(host)) return;
      saveSettings({ ...cur, whitelist: [...cur.whitelist, host] });
    },
    [saveSettings]
  );

  const removeFromWhitelist = useCallback(
    (host: string) => {
      const cur = settingsRef.current;
      saveSettings({
        ...cur,
        whitelist: cur.whitelist.filter((h) => h !== host),
      });
    },
    [saveSettings]
  );

  const discardTab = useCallback(
    async (tabId: number) => {
      try {
        await chrome.runtime.sendMessage({ type: "aura-rm-discard", tabId });
      } catch {
        /* worker asleep or message dropped — refresh anyway */
      }
      void refreshTabs();
    },
    [refreshTabs]
  );

  return {
    tabs,
    settings,
    stats,
    memory,
    ready,
    toggleEnabled,
    setIdleMinutes,
    discardTab,
    whitelistHost,
    removeFromWhitelist,
  };
}

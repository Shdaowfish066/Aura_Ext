import { useEffect, useState } from "react";
import type { ThemeId } from "../../types";
import { onChange, theme as themeStore } from "../../storage";
import { applyTheme, DEFAULT_THEME_ID, THEME_LIST, THEMES } from "../themes";

/**
 * Theme state synced with storage. The boot script in main.tsx applies the
 * persisted theme before first render, so this hook only needs to track it,
 * persist changes, and react to changes made from other tabs.
 */
export function useTheme() {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const applied = document.documentElement.dataset.theme as
      | ThemeId
      | undefined;
    return applied && applied in THEMES ? applied : DEFAULT_THEME_ID;
  });

  useEffect(() => {
    let alive = true;
    if (typeof chrome === "undefined" || !chrome.storage) return;
    void themeStore.get().then((id) => {
      if (alive && id in THEMES) setThemeId(id);
    });
    const unsubscribe = onChange("theme", (id) => {
      if (id && id in THEMES) {
        applyTheme(THEMES[id]);
        setThemeId(id);
      }
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  async function setTheme(id: ThemeId) {
    applyTheme(THEMES[id]);
    setThemeId(id);
    await themeStore.set(id);
  }

  return { themeId, theme: THEMES[themeId], setTheme, themes: THEME_LIST };
}

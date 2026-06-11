import React from "react";
import ReactDOM from "react-dom/client";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import App from "./App";
import { applyTheme, DEFAULT_THEME_ID, THEMES } from "./themes";
import { theme as themeStore } from "../storage";
import "./index.css";

// Apply the persisted theme before first render so there is no flash of the
// default palette. chrome.storage reads resolve in a few ms.
async function bootstrap() {
  try {
    const themeId = await themeStore.get();
    applyTheme(THEMES[themeId] ?? THEMES[DEFAULT_THEME_ID]);
  } catch {
    applyTheme(THEMES[DEFAULT_THEME_ID]);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </LazyMotion>
    </React.StrictMode>
  );
}

void bootstrap();

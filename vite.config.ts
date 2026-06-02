import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";

// The manifest (manifest.json) is the source of truth for extension entry
// points. vite-plugin-web-extension reads it, bundles every referenced source
// file (background, content script, the new-tab HTML and its scripts), and
// rewrites the output manifest with the built asset paths.
export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: "manifest.json",
    }),
  ],
});

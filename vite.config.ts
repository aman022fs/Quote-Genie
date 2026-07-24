import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    // No preset is pinned here on purpose: Nitro auto-detects Netlify/Vercel
    // (and falls back to a plain Node server locally) from CI env vars.
    nitro(),
    viteReact(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  // Route Vite's SSR build at our custom server entry (src/server.ts), which
  // wraps the generated TanStack handler to recover error detail that h3
  // would otherwise swallow into an opaque 500 response.
  environments: {
    ssr: { build: { rollupOptions: { input: "./src/server.ts" } } },
  },
});

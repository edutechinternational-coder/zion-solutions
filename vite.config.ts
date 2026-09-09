// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    // Public Lovable Cloud connection values. Keeping these build-time fallbacks
    // prevents published browser bundles from depending on server-only env vars.
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        "https://rngobfmjfnmsqkacurnp.supabase.co",
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        "sb_publishable_p-dqH_T49gRU4hqNit2ZEQ_bRul9Pg6",
      ),
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // NEXT_PUBLIC_ lets the browser read the URL and publishable key synced by the
  // Vercel ↔ Supabase integration. Never add a broader prefix such as "SUPABASE_":
  // that would ship SUPABASE_SECRET_KEY to the browser.
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
});

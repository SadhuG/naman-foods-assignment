import { cleanup } from "./support/db.ts";

export default async function globalTeardown() {
  if (!process.env.E2E_KEEP_DATA) await cleanup();
}

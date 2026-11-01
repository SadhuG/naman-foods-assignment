import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { cleanup, createUser, sessionFor, storageFor } from "./support/db.ts";
import { HR_STATE } from "./support/fixtures.ts";

export default async function globalSetup() {
  await cleanup();
  // Demo-account tests expect the seeded state. Set E2E_SKIP_SEED=1 to skip.
  if (!process.env.E2E_SKIP_SEED) {
    execSync("npx tsx scripts/seed-demo.ts", { stdio: "inherit" });
  }
  const hr = await createUser("HR team", { hr: true });
  mkdirSync("tests/e2e/.auth", { recursive: true });
  writeFileSync(HR_STATE, JSON.stringify(storageFor(await sessionFor(hr))));
}

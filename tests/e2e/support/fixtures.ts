import { test as base, expect, type Page } from "@playwright/test";
import type { Session } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { storageFor } from "./db.ts";

export const HR_STATE = "tests/e2e/.auth/hr.json";

type Fixtures = {
  /** A page signed in as this run's HR test account. */
  hrPage: Page;
  /** Opens a fresh browser context signed in with `session`. */
  pageAs: (session: Session) => Promise<Page>;
  /** Fails the test on uncaught page errors. */
  failOnPageError: void;
};

export const test = base.extend<Fixtures>({
  failOnPageError: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await use();
      expect(errors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],
  hrPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: HR_STATE });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await use(page);
    await ctx.close();
    expect(errors, "uncaught errors in the HR page").toEqual([]);
  },
  pageAs: async ({ browser }, use, testInfo) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await use(async (session) => {
      const ctx = await browser.newContext({
        storageState: storageFor(session),
        viewport: testInfo.project.use.viewport ?? undefined,
        isMobile: testInfo.project.use.isMobile,
        hasTouch: testInfo.project.use.hasTouch,
      });
      contexts.push(ctx);
      return ctx.newPage();
    });
    for (const c of contexts) await c.close();
  },
});

export { expect };

/** The HR session saved by global setup (for API calls as HR). */
export function hrSession(): Session {
  const state = JSON.parse(readFileSync(HR_STATE, "utf8")) as {
    origins: Array<{ localStorage: Array<{ value: string }> }>;
  };
  return JSON.parse(state.origins[0]!.localStorage[0]!.value) as Session;
}

/** Waits for a sonner toast containing `text`. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: text }).first(),
  ).toBeVisible();
}

/** Fills the candidate apply form (all profile fields). */
export async function fillApplyForm(
  page: Page,
  v: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    qualification?: string;
    experience?: string;
    password?: string;
    consent?: boolean;
  },
) {
  if (v.name !== undefined) await page.getByLabel("Full name").fill(v.name);
  if (v.email !== undefined)
    await page.getByLabel("Email", { exact: true }).fill(v.email);
  if (v.phone !== undefined)
    await page.getByLabel("Mobile number").fill(v.phone);
  if (v.city !== undefined) await page.getByLabel("City").fill(v.city);
  if (v.qualification !== undefined)
    await page
      .getByLabel("Highest qualification")
      .selectOption(v.qualification);
  if (v.experience !== undefined)
    await page.getByLabel("Work experience (years)").fill(v.experience);
  if (v.password !== undefined)
    await page.getByLabel("Create a password").fill(v.password);
  if (v.consent) await page.getByLabel(/Naman Foods can contact me/).check();
}

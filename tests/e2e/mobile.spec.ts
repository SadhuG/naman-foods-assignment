// Candidate pages on a 390 px phone.
import type { Page } from "@playwright/test";
import {
  applyAs,
  candidatesIn,
  createDrive,
  createUser,
  rand,
  sessionFor,
} from "./support/db.ts";
import { expect, fillApplyForm, test } from "./support/fixtures.ts";

async function expectNoSideways(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(0);
}

test("a candidate applies from a phone", async ({ page }) => {
  const drive = await createDrive();
  await page.goto(`/apply/${drive.slug}`);
  await expect(page.getByRole("list", { name: "Rounds" })).toBeVisible();
  await expectNoSideways(page);
  await fillApplyForm(page, {
    name: "Mobile Applicant",
    email: `test+e2e-${rand()}@example.com`,
    phone: "098290 11299",
    city: "Bhiwadi",
    qualification: "ITI — Fitter",
    experience: "0",
    password: "mobile-pass-1",
    consent: true,
  });
  await page.getByRole("button", { name: "Create account & apply" }).tap();
  await expect(page).toHaveURL(/\/me\/applications\//);
  await expectNoSideways(page);
  expect((await candidatesIn(drive.id))[0]?.phone).toBe("9829011299");
});

test("inbox opens a message full-screen and Back returns to the list", async ({
  pageAs,
}) => {
  const drive = await createDrive();
  const user = await createUser("Phone User");
  const session = await sessionFor(user);
  await applyAs(session, drive.slug, { p_full_name: "Phone User" });
  const page = await pageAs(session);
  await page.goto("/me");
  await expectNoSideways(page);
  // The top-bar inbox icon replaces the text nav on phones.
  await page.getByRole("link", { name: /^Inbox/ }).click();
  await expect(page).toHaveURL("/me/inbox");
  await page.getByRole("button", { name: /We've got your application/ }).tap();
  await expect(page.getByText("Sent with this email")).toBeVisible();
  await expect(page.getByRole("list", { name: "Messages" })).toBeHidden();
  await expectNoSideways(page);
  await page.getByRole("button", { name: "Inbox" }).tap();
  await expect(page.getByRole("list", { name: "Messages" })).toBeVisible();
});

test("login and the demo box fit a phone screen", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await expectNoSideways(page);
});

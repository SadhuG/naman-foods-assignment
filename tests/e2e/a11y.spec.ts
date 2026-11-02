import type { Page } from "@playwright/test";
import { createRequire } from "node:module";
import {
  addCandidates,
  applyAs,
  createDrive,
  createUser,
  sessionFor,
} from "./support/db.ts";
import { expect, test } from "./support/fixtures.ts";

const axePath = createRequire(import.meta.url).resolve("axe-core");

/** Serious and critical WCAG 2.1 A/AA problems on the current page. */
async function audit(page: Page, label: string) {
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: Function } }).axe;
    const r = await axe.run(document, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    });
    return (
      r.violations as Array<{
        id: string;
        impact: string;
        help: string;
        nodes: Array<{ target: string[] }>;
      }>
    )
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map(
        (v) =>
          `${v.id}: ${v.help} → ${v.nodes
            .map((n) => n.target.join(" "))
            .slice(0, 3)
            .join(" | ")}`,
      );
  });
  expect(violations, `accessibility problems on ${label}`).toEqual([]);
}

test("public and candidate pages", async ({ page, pageAs }) => {
  const drive = await createDrive();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await audit(page, "landing");
  await page.goto("/notes");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await audit(page, "submission notes");
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await audit(page, "login");
  await page.goto(`/apply/${drive.slug}`);
  await expect(page.getByLabel("Full name")).toBeVisible();
  await page.getByRole("button", { name: "Create account & apply" }).click();
  await audit(page, "apply form with errors");

  const user = await createUser("Access Check");
  const session = await sessionFor(user);
  const id = await applyAs(session, drive.slug, {
    p_full_name: "Access Check",
  });
  const me = await pageAs(session);
  await me.goto("/me");
  await expect(me.getByText("Round 1 of 4")).toBeVisible();
  await audit(me, "my applications");
  await me.goto(`/me/applications/${id}`);
  await expect(me.getByText("Your progress")).toBeVisible();
  await audit(me, "application");
  await me.goto("/me/inbox");
  await me.getByRole("button", { name: /We've got your application/ }).click();
  await expect(me.getByText("Sent with this email")).toBeVisible();
  await audit(me, "inbox");
});

test("HR pages and dialogs", async ({ hrPage: page }) => {
  const drive = await createDrive();
  await addCandidates(drive.id, [
    { full_name: "Axe One" },
    { full_name: "Axe Two", status: "on_hold" },
  ]);
  await page.goto("/drives");
  await expect(page.getByText("Waiting on you")).toBeVisible();
  await audit(page, "drives");
  await page.goto(`/drives/${drive.id}`);
  await expect(page.getByText("2 in this round")).toBeVisible();
  await audit(page, "pipeline");
  await page.getByRole("checkbox", { name: "Select all shown" }).check();
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, "decision dialog");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Axe One/ }).click();
  await expect(page.getByRole("dialog", { name: "Axe One" })).toBeVisible();
  await audit(page, "candidate drawer");
  await page.goto(`/drives/${drive.id}/edit`);
  await expect(page.getByLabel("Drive title")).toBeVisible();
  await audit(page, "drive editor");
  await page.goto(`/drives/${drive.id}/outbox`);
  await expect(page.getByRole("heading", { name: "Outbox" })).toBeVisible();
  await audit(page, "outbox");
});

test("dialogs trap focus, close on Escape and hand focus back", async ({
  hrPage: page,
}) => {
  const drive = await createDrive();
  await addCandidates(drive.id, [{ full_name: "Key Board" }]);
  await page.goto(`/drives/${drive.id}`);
  await page.getByRole("checkbox", { name: "Select Key Board" }).check();
  const reject = page
    .getByRole("region", { name: "Bulk actions" })
    .getByRole("button", { name: "Reject" });
  await reject.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Reject 1 candidate?" });
  // Focus moves into the dialog (its first control).
  await expect(dialog.getByRole("radio").first()).toBeFocused();
  // Tabbing many times never leaves the dialog.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((d) => d.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(reject).toBeFocused();
});

test("the apply form can be completed with the keyboard alone", async ({
  page,
}) => {
  const drive = await createDrive();
  await page.goto(`/apply/${drive.slug}`);
  await page.getByLabel("Full name").focus();
  await page.keyboard.type("Keyboard Kumar");
  await page.keyboard.press("Tab");
  await page.keyboard.type("not-an-email");
  await page.keyboard.press("Tab");
  // Leaving a bad field shows its error right away.
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByLabel("Mobile number")).toBeFocused();
});

import { addCandidates, admin, createDrive, rand } from "./support/db.ts";
import { expect, expectToast, test } from "./support/fixtures.ts";

test("HR creates a drive with custom rounds and gets a share link and QR", async ({
  hrPage: page,
}) => {
  const title = `Test drive: Packing Line ${rand(2)}`;
  await page.goto("/");
  await page.getByRole("link", { name: "New drive" }).first().click();
  await expect(page).toHaveURL("/drives/new");
  await expect(
    page.getByText("The link goes live when you create the drive."),
  ).toBeVisible();

  // Required fields are enforced.
  await page.getByLabel("Location").fill("");
  await page.getByRole("button", { name: "Create drive" }).click();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
  await expect(page).toHaveURL("/drives/new");

  await page.getByLabel("Drive title").fill(title);
  await page.getByLabel("Role").fill("Packing Associate");
  await page.getByLabel("Location").fill("Neemrana, Rajasthan");
  await page.getByLabel("Openings").fill("12");
  await page
    .getByLabel("Description")
    .fill("Day shift, ₹14,500 a month, PF and ESI, canteen.");

  // Rounds: rename, reorder, remove, add.
  await expect(page.getByText("4 rounds")).toBeVisible();
  await page.getByRole("button", { name: "Remove round 3" }).click();
  await expect(page.getByText("3 rounds")).toBeVisible();
  await page.getByRole("button", { name: "Move round 3 up" }).click();
  await expect(page.getByLabel("Round 2 name")).toHaveValue("HR Interview");
  await page.getByRole("button", { name: "Add round" }).click();
  await expect(page.getByLabel("Round 4 name")).toBeFocused();
  await page.getByRole("button", { name: "Create drive" }).click();
  // A blank round name is refused.
  await expect(page).toHaveURL("/drives/new");
  await page.getByLabel("Round 4 name").fill("Line Trial");
  await expect(
    page.getByRole("button", { name: "Move round 1 up" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Move round 4 down" }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Create drive" }).click();
  await expectToast(page, "Drive created");
  await expect(page).toHaveURL(/\/drives\/[0-9a-f-]{36}\/edit$/);
  await expect(
    page.getByRole("img", { name: /QR code for the apply link/ }),
  ).toBeVisible();

  const { data: drive } = await admin
    .from("drives")
    .select("id, slug, title, openings, location, status")
    .eq("title", title)
    .single();
  expect(drive).toMatchObject({
    openings: 12,
    location: "Neemrana, Rajasthan",
    status: "open",
  });
  const { data: rounds } = await admin
    .from("drive_rounds")
    .select("position, name")
    .eq("drive_id", drive!.id)
    .order("position");
  expect(rounds!.map((r) => r.name)).toEqual([
    "Screening",
    "HR Interview",
    "Aptitude Test",
    "Line Trial",
  ]);
  // The slug is test-safe only if HR titles start with "Test"; rename it so cleanup catches it.
  await admin
    .from("drives")
    .update({ slug: `test-e2e-${rand()}` })
    .eq("id", drive!.id);

  // Download the QR as a PNG.
  await page.reload();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download QR (PNG)" }).click();
  expect((await download).suggestedFilename()).toMatch(/^test-e2e-.*-qr\.png$/);

  // Dashboard lists it with an empty funnel.
  await page.getByRole("link", { name: "Drives" }).first().click();
  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card).toContainText(/Open\s*0\s*candidates · 0 on hold/);
  await expect(card.getByRole("link", { name: "Open pipeline" })).toBeVisible();
});

test("copy link puts the apply URL on the clipboard", async ({
  hrPage: page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "clipboard permissions are Chromium-only",
  );
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const drive = await createDrive();
  await page.goto(`/drives/${drive.id}`);
  await page.getByRole("button", { name: "Share link" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Share this drive" });
  await dialog.getByRole("button", { name: "Copy" }).click();
  await expectToast(page, "Apply link copied.");
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toBe(`http://localhost:5188/apply/${drive.slug}`);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("editing a drive with applicants locks the rounds but allows renaming and closing", async ({
  hrPage: page,
  browser,
}) => {
  const drive = await createDrive();
  await addCandidates(drive.id, [{ full_name: "Rakesh Gurjar" }]);
  await page.goto(`/drives/${drive.id}`);
  await page.getByRole("link", { name: "Edit drive" }).click();
  await expect(
    page.getByText("Rounds are locked once candidates have applied."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add round" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Remove round/ })).toHaveCount(
    0,
  );

  await page.getByLabel("Round 3 name").fill("Machine Trial");
  await page.getByLabel("Status").selectOption("closed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expectToast(page, "Drive saved.");
  await expect(page).toHaveURL(`/drives/${drive.id}`);
  await expect(
    page.getByRole("tab", { name: /3 · Machine Trial/ }),
  ).toBeVisible();
  await expect(page.getByText(/· closed$/)).toBeVisible();

  // The public page now says closed.
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/apply/${drive.slug}`);
  await expect(
    visitor.getByText("Applications for this drive are closed"),
  ).toBeVisible();
  await visitor.context().close();
});

test("cancel leaves the drive unchanged", async ({ hrPage: page }) => {
  const drive = await createDrive();
  await page.goto(`/drives/${drive.id}/edit`);
  await page.getByLabel("Drive title").fill("Something else entirely");
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(`/drives/${drive.id}`);
  await expect(page.getByRole("heading", { name: drive.title })).toBeVisible();
});

test("an unknown drive id shows an error with a way back", async ({
  hrPage: page,
}) => {
  await page.goto("/drives/00000000-0000-0000-0000-000000000000");
  await expect(
    page.getByRole("link", { name: "Back to drives" }),
  ).toBeVisible();
  await page.goto("/drives/not-a-uuid/edit");
  await expect(
    page.getByRole("link", { name: "Back to drives" }),
  ).toBeVisible();
});

test("the dashboard funnel links into the right pipeline stage", async ({
  hrPage: page,
}) => {
  const drive = await createDrive();
  await addCandidates(drive.id, [
    { full_name: "One Screening" },
    { full_name: "Two Aptitude", current_round: 2 },
    { full_name: "Three Aptitude", current_round: 2, status: "on_hold" },
    { full_name: "Four Rejected", status: "rejected" },
  ]);
  await page.goto("/");
  const card = page.getByRole("article").filter({ hasText: drive.title });
  await expect(card).toContainText(/4\s*candidates · 1 on hold/);
  await card.getByRole("link", { name: "Aptitude Test" }).click();
  await expect(page).toHaveURL(`/drives/${drive.id}?stage=round-2`);
  await expect(
    page.getByRole("tab", { name: /Aptitude Test/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: /Two Aptitude/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Three Aptitude/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /One Screening/ })).toHaveCount(
    0,
  );
});

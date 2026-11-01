import type { Page } from "@playwright/test";
import {
  addCandidates,
  applyAs,
  candidateRow,
  createDrive,
  createUser,
  decisionsFor,
  messagesFor,
  sessionFor,
} from "./support/db.ts";
import { expect, expectToast, HR_STATE, test } from "./support/fixtures.ts";

const tab = (page: Page, name: RegExp | string) =>
  page.getByRole("tab", { name });
const row = (page: Page, name: string) =>
  page.getByRole("row").filter({ hasText: name });
const select = (page: Page, name: string) =>
  page.getByRole("checkbox", { name: `Select ${name}` }).check();
const bulkBar = (page: Page) =>
  page.getByRole("region", { name: "Bulk actions" });

test("tabs, counts, search and the on-hold filter", async ({
  hrPage: page,
}) => {
  const drive = await createDrive();
  await addCandidates(drive.id, [
    { full_name: "Anita Sharma", phone: "9876500011", city: "Alwar" },
    { full_name: "Bhavesh Patel", email: "bhavesh.p@example.com" },
    { full_name: "Chetan Jangid", status: "on_hold" },
    { full_name: "Divya Rawat", current_round: 2 },
    { full_name: "Eshan Malik", status: "rejected" },
    { full_name: "Farah Khan", current_round: 4, status: "selected" },
  ]);
  await page.goto(`/drives/${drive.id}`);
  await expect(page.getByText("6 candidates")).toBeVisible();
  await expect(tab(page, /1 · Screening/)).toContainText("3");
  await expect(tab(page, /2 · Aptitude Test/)).toContainText("1");
  await expect(tab(page, /Selected/)).toContainText("1");
  await expect(tab(page, /Rejected/)).toContainText("1");
  await expect(tab(page, /All/)).toContainText("6");
  await expect(page.getByText("3 in this round")).toBeVisible();

  const search = page.getByPlaceholder("Search name, email or phone");
  await search.fill("anita");
  await expect(page.getByText("1 in this round")).toBeVisible();
  await search.fill("bhavesh.p@");
  await expect(row(page, "Bhavesh Patel")).toBeVisible();
  await expect(page.getByText("1 in this round")).toBeVisible();
  await search.fill("98765 00011");
  await expect(row(page, "Anita Sharma")).toBeVisible();
  await search.fill("zzz-nobody");
  await expect(page.getByText("No one matches")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByText("3 in this round")).toBeVisible();

  const hold = page.getByRole("button", { name: /On hold only \(1\)/ });
  await hold.click();
  await expect(hold).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("1 in this round")).toBeVisible();
  await expect(row(page, "Chetan Jangid")).toBeVisible();
  await hold.click();

  // Tabs live in the URL, so a reload or a shared link keeps the stage.
  await tab(page, /Rejected/).click();
  await expect(page).toHaveURL(/stage=rejected/);
  await page.reload();
  await expect(tab(page, /Rejected/)).toHaveAttribute("aria-selected", "true");
  await expect(row(page, "Eshan Malik")).toBeVisible();

  // Empty round with a pointer back.
  await tab(page, /3 · Technical Interview/).click();
  await expect(page.getByText("No one in this round yet")).toBeVisible();
  await page.getByRole("button", { name: "Go to Aptitude Test" }).click();
  await expect(row(page, "Divya Rawat")).toBeVisible();
});

test("bulk approve moves people on, records the note privately and messages them", async ({
  hrPage: page,
}) => {
  const drive = await createDrive();
  const [a, b, c] = await addCandidates(drive.id, [
    { full_name: "Gaurav Singh" },
    { full_name: "Hema Saini" },
    { full_name: "Irfan Ali" },
    { full_name: "Jaya Kumari" },
  ]);
  await page.goto(`/drives/${drive.id}`);
  await select(page, "Gaurav Singh");
  await select(page, "Hema Saini");
  await select(page, "Irfan Ali");
  await expect(bulkBar(page)).toContainText("3 selected");
  await bulkBar(page)
    .getByRole("button", { name: "Approve to Aptitude Test" })
    .click();

  const dialog = page.getByRole("dialog", { name: "Approve 3 candidates" });
  await expect(dialog).toContainText(
    "Gaurav, Hema and Irfan move from Screening to Aptitude Test.",
  );
  await expect(dialog).toContainText("All 3 can move");
  await dialog
    .getByLabel("Internal note · HR only")
    .fill("Strong batch, check shift preference");
  await dialog
    .getByLabel("Message to candidates (optional)")
    .fill("Bring a pen and your Aadhaar card.");
  // The email preview updates as HR types.
  await expect(dialog).toContainText("Bring a pen and your Aadhaar card.");
  await dialog.getByRole("button", { name: "Approve 3 and notify" }).click();

  await expectToast(page, "3 moved to Aptitude Test");
  await expect(dialog).toBeHidden();
  await expect(tab(page, /1 · Screening/)).toContainText("1");
  await expect(tab(page, /2 · Aptitude Test/)).toContainText("3");
  await expect(bulkBar(page)).toBeHidden();

  for (const id of [a!, b!, c!]) {
    expect(await candidateRow(id)).toMatchObject({
      current_round: 2,
      status: "active",
    });
    const [d] = await decisionsFor(id);
    expect(d).toMatchObject({
      decision: "approved",
      note: "Strong batch, check shift preference",
      candidate_message: "Bring a pen and your Aadhaar card.",
    });
    const msgs = await messagesFor(id);
    const moved = msgs.find((m) => m.template === "moved_to_round")!;
    expect(moved.params.hr_message).toBe("Bring a pen and your Aadhaar card.");
    expect(JSON.stringify(msgs)).not.toContain("shift preference");
  }
});

test("a mixed selection moves the eligible people and reports the skipped ones", async ({
  hrPage: page,
}) => {
  const drive = await createDrive();
  const [active, held, rejected] = await addCandidates(drive.id, [
    { full_name: "Kiran Bala" },
    { full_name: "Lalit Joshi", status: "on_hold" },
    { full_name: "Mohit Verma", status: "rejected" },
  ]);
  await page.goto(`/drives/${drive.id}?stage=all`);
  await page.getByRole("checkbox", { name: "Select all shown" }).check();
  await expect(bulkBar(page)).toContainText("3 selected");
  await bulkBar(page).getByRole("button", { name: "Reject" }).click();

  const dialog = page.getByRole("dialog", { name: "Reject 3 candidates?" });
  await expect(dialog).toContainText("2 of 3 can move");
  await expect(dialog).toContainText("1 already decided is skipped");
  // HR can switch the decision inside the dialog.
  // HR can switch the decision inside the dialog; the title follows.
  const open = page.getByRole("dialog");
  await open.getByRole("radio", { name: /Put on hold/ }).check();
  await expect(
    page.getByRole("dialog", { name: "Hold 3 candidates" }),
  ).toContainText("1 of 3 can move");
  await open.getByRole("radio", { name: /Reject/ }).check();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Reject 2 and notify" }).click();
  await expectToast(page, "2 rejected · 1 skipped (already decided)");

  expect((await candidateRow(active!)).status).toBe("rejected");
  expect((await candidateRow(held!)).status).toBe("rejected");
  // The skipped person got no new message or decision.
  expect(await decisionsFor(rejected!)).toHaveLength(0);
  expect(await messagesFor(rejected!)).toHaveLength(0);
});

test("hold, approve from hold, approve in the last round, reject and reopen", async ({
  hrPage: page,
}) => {
  const drive = await createDrive({ rounds: ["Screening", "Final"] });
  const [id] = await addCandidates(drive.id, [{ full_name: "Nisha Tanwar" }]);
  await page.goto(`/drives/${drive.id}`);

  const decide = async (button: RegExp | string, confirm: RegExp) => {
    await select(page, "Nisha Tanwar");
    await bulkBar(page).getByRole("button", { name: button }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: confirm })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
  };

  await decide("Put on hold", /Hold 1 and notify/);
  await expectToast(page, "1 put on hold");
  await expect(row(page, "Nisha Tanwar")).toContainText("On hold");
  // On-hold people can't be put on hold again.
  await select(page, "Nisha Tanwar");
  await expect(
    bulkBar(page).getByRole("button", { name: "Put on hold" }),
  ).toHaveCount(0);
  await bulkBar(page).getByRole("button", { name: "Clear" }).click();

  await decide("Approve to Final", /Approve 1 and notify/);
  await expect(tab(page, /2 · Final/)).toContainText("1");
  await tab(page, /2 · Final/).click();
  await decide("Approve to Selected", /Approve 1 and notify/);
  expect((await candidateRow(id!)).status).toBe("selected");
  await tab(page, /Selected/).click();
  await expect(row(page, "Nisha Tanwar")).toContainText("Not started");

  // Back to the start: reject from a fresh candidate, then reopen.
  const [r] = await addCandidates(drive.id, [{ full_name: "Om Prakash" }]);
  await tab(page, /1 · Screening/).click();
  await select(page, "Om Prakash");
  await bulkBar(page).getByRole("button", { name: "Reject" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reject 1 and notify" })
    .click();
  await tab(page, /Rejected/).click();
  await select(page, "Om Prakash");
  await bulkBar(page).getByRole("button", { name: "Reopen" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reopen 1 and notify" })
    .click();
  await expectToast(page, "1 reopened");
  expect(await candidateRow(r!)).toMatchObject({
    status: "active",
    current_round: 1,
  });
  expect((await messagesFor(r!)).map((m) => m.template)).toEqual([
    "rejected",
    "reopened",
  ]);
});

test("the candidate drawer shows history with notes and decides for one person", async ({
  hrPage: page,
}) => {
  const drive = await createDrive();
  const [id] = await addCandidates(drive.id, [
    { full_name: "Pankaj Meena", city: "Kotputli", experience_years: 2.5 },
  ]);
  await page.goto(`/drives/${drive.id}`);
  await row(page, "Pankaj Meena").getByRole("cell").nth(3).click();
  await expect(page).toHaveURL(new RegExp(`c=${id}`));
  const drawer = page.getByRole("dialog", { name: "Pankaj Meena" });
  await expect(drawer).toContainText("No decisions yet.");
  await expect(drawer).toContainText("Kotputli");
  await expect(drawer).toContainText("Added by HR");
  await expect(drawer).toContainText("1 of 4 · Screening");

  await drawer.getByRole("button", { name: "Approve" }).click();
  const dialog = page.getByRole("dialog", { name: "Approve 1 candidate" });
  await dialog
    .getByLabel("Internal note · HR only")
    .fill("Good with forklifts");
  await dialog
    .getByLabel("Message to candidate (optional)")
    .fill("See you Monday.");
  await dialog.getByRole("button", { name: "Approve 1 and notify" }).click();
  await expectToast(page, "1 moved to Aptitude Test");
  await expect(dialog).toBeHidden();
  await expect(drawer).toContainText("Screening · approved");
  await expect(drawer).toContainText("Internal note: Good with forklifts");
  await expect(drawer).toContainText("Message sent: “See you Monday.”");
  await expect(drawer).toContainText("2 of 4 · Aptitude Test");

  // Escape closes the drawer and clears it from the URL; Back reopens it.
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(page).not.toHaveURL(/c=/);
  await page.goBack();
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(drawer).toBeHidden();
});

test("cancelling a decision changes nothing", async ({ hrPage: page }) => {
  const drive = await createDrive();
  const [id] = await addCandidates(drive.id, [{ full_name: "Qamar Zaidi" }]);
  await page.goto(`/drives/${drive.id}`);
  await select(page, "Qamar Zaidi");
  await bulkBar(page).getByRole("button", { name: "Reject" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(bulkBar(page)).toContainText("1 selected");
  expect((await candidateRow(id!)).status).toBe("active");
});

test("a new application appears live without reloading", async ({
  hrPage: page,
}) => {
  const drive = await createDrive();
  await addCandidates(drive.id, [{ full_name: "Existing Person" }]);
  await page.goto(`/drives/${drive.id}`);
  await expect(page.getByText("1 in this round")).toBeVisible();
  const user = await createUser("Live Arrival");
  await applyAs(await sessionFor(user), drive.slug, {
    p_full_name: "Ruchi Live Arrival",
  });
  await expect(row(page, "Ruchi Live Arrival")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("2 in this round")).toBeVisible();
});

test("two HR people deciding the same candidates at once never double-move them", async ({
  hrPage: page,
  browser,
}) => {
  const drive = await createDrive();
  const [id] = await addCandidates(drive.id, [{ full_name: "Sanjay Bairwa" }]);
  const other = await (
    await browser.newContext({ storageState: HR_STATE })
  ).newPage();
  for (const p of [page, other]) {
    await p.goto(`/drives/${drive.id}`);
    await select(p, "Sanjay Bairwa");
    await bulkBar(p)
      .getByRole("button", { name: "Approve to Aptitude Test" })
      .click();
  }
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Approve 1 and notify" })
    .click();
  await expectToast(page, "1 moved to Aptitude Test");
  // The second HR's view is stale. Either the live update drops the person from
  // their selection first, or the server skips them; never a second move.
  const confirm = other
    .getByRole("dialog")
    .getByRole("button", { name: /Approve \d and notify/ });
  const label = await confirm.textContent();
  console.log(
    `second HR sees: "${label}" (${(await confirm.isEnabled()) ? "enabled" : "disabled"})`,
  );
  if (await confirm.isEnabled()) {
    await confirm.click();
    await expectToast(other, "1 skipped (already decided)");
  }
  await expect
    .poll(async () => (await candidateRow(id!)).current_round)
    .toBe(2);
  expect(await decisionsFor(id!)).toHaveLength(1);
  await other.context().close();
});

test("selection is cleared when switching tabs", async ({ hrPage: page }) => {
  const drive = await createDrive();
  await addCandidates(drive.id, [
    { full_name: "Tara Devi" },
    { full_name: "Uday Raj", current_round: 2 },
  ]);
  await page.goto(`/drives/${drive.id}`);
  await select(page, "Tara Devi");
  await expect(bulkBar(page)).toBeVisible();
  await tab(page, /2 · Aptitude Test/).click();
  await expect(bulkBar(page)).toBeHidden();
  await tab(page, /1 · Screening/).click();
  await expect(
    page.getByRole("checkbox", { name: "Select Tara Devi" }),
  ).not.toBeChecked();
});

test("a failed decision keeps the dialog open with an error and changes nothing", async ({
  hrPage: page,
}) => {
  const drive = await createDrive();
  const [id] = await addCandidates(drive.id, [{ full_name: "Vikas Saini" }]);
  await page.goto(`/drives/${drive.id}`);
  await select(page, "Vikas Saini");
  await bulkBar(page)
    .getByRole("button", { name: "Approve to Aptitude Test" })
    .click();
  await page.route("**/rest/v1/rpc/hr_decide", (r) => r.abort("failed"));
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Approve 1 and notify" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Something went wrong");
  await expect(dialog).toBeVisible();
  expect((await candidateRow(id!)).current_round).toBe(1);
  await page.unroute("**/rest/v1/rpc/hr_decide");
  await dialog.getByRole("button", { name: "Approve 1 and notify" }).click();
  await expectToast(page, "1 moved to Aptitude Test");
});

test("a 50-person drive handles select-all and one bulk approve", async ({
  hrPage: page,
}) => {
  const drive = await createDrive();
  await addCandidates(
    drive.id,
    Array.from({ length: 50 }, (_, i) => ({
      full_name: `Bulk Person ${String(i + 1).padStart(2, "0")}`,
    })),
  );
  await page.goto(`/drives/${drive.id}`);
  await expect(page.getByText("50 in this round")).toBeVisible();
  await page.getByRole("checkbox", { name: "Select all shown" }).check();
  await expect(bulkBar(page)).toContainText("50 selected");
  await bulkBar(page)
    .getByRole("button", { name: "Approve to Aptitude Test" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Approve 50 and notify" })
    .click();
  await expectToast(page, "50 moved to Aptitude Test");
  await expect(tab(page, /2 · Aptitude Test/)).toContainText("50");
  await expect(page.getByText("No one in this round yet")).toBeVisible();
});

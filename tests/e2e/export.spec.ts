import type { Download, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  addCandidates,
  admin,
  clientFor,
  createDrive,
  isoDay,
} from "./support/db.ts";
import { expect, expectToast, hrSession, test } from "./support/fixtures.ts";

/** Minimal RFC 4180 parser, enough to check what Excel would see. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r" && text[i + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

async function csvOf(download: Download) {
  const raw = await readFile((await download.path())!, "utf8");
  expect(raw.charCodeAt(0), "starts with a UTF-8 BOM").toBe(0xfeff);
  const rows = parseCsv(raw.slice(1));
  const [headers, ...body] = rows;
  // Every row has as many cells as the header.
  for (const r of body) expect(r).toHaveLength(headers!.length);
  return {
    name: download.suggestedFilename(),
    headers: headers!,
    rows: body,
    col: (h: string) => body.map((r) => r[headers!.indexOf(h)]!),
  };
}

async function exportFromMenu(page: Page, item: RegExp) {
  await page.getByRole("button", { name: "Export CSV" }).click();
  const menu = page.getByRole("menu", { name: "Download as CSV" });
  const download = page.waitForEvent("download");
  await menu.getByRole("menuitem", { name: item }).click();
  return csvOf(await download);
}

test("every export opens cleanly, keeps awkward values intact and defuses formulas", async ({
  hrPage: page,
}) => {
  const drive = await createDrive();
  const [formula, comma, , chosen] = await addCandidates(drive.id, [
    { full_name: '=HYPERLINK("http://evil.example","click")', city: "+Alwar" },
    { full_name: 'Sharma, Priya "Pinky"', city: "@Jaipur" },
    { full_name: "प्रिया शर्मा", city: "जयपुर" },
    {
      full_name: "Zubin Selected",
      status: "details_submitted",
      current_round: 4,
    },
  ]);
  await admin.from("joining_details").insert({
    candidate_id: chosen,
    date_of_birth: "1999-02-03",
    aadhaar_number: "234567890123",
    pan_number: "ABCDE1234F",
    uan_number: "001200340056",
    bank_account_holder: "Zubin Selected",
    bank_account_number: "000123456789",
    bank_ifsc: "HDFC0001234",
    address: "Flat 2, Line 1\nNear temple, Alwar",
    emergency_contact_name: "Parent",
    emergency_contact_phone: "9414055678",
    preferred_joining_date: isoDay(10),
  });
  const { error } = await clientFor(hrSession()).rpc("hr_decide", {
    p_candidate_ids: [formula, comma],
    p_decision: "on_hold",
    p_note: 'Line one\nline two, with "quotes"',
    p_candidate_message: "-Please wait",
  });
  expect(error).toBeNull();

  await page.goto(`/drives/${drive.id}`);
  await expect(page.getByText("3 in this round")).toBeVisible();

  // This stage.
  const stage = await exportFromMenu(page, /This stage · 3 candidates/);
  expect(stage.name).toMatch(
    new RegExp(`^${drive.slug}_screening_\\d{4}-\\d{2}-\\d{2}\\.csv$`),
  );
  expect(stage.headers[0]).toBe("Name");
  expect(stage.rows).toHaveLength(3);
  const names = stage.col("Name");
  expect(names).toContain(`'=HYPERLINK("http://evil.example","click")`);
  expect(names).toContain('Sharma, Priya "Pinky"');
  expect(names).toContain("प्रिया शर्मा");
  expect(stage.col("City")).toEqual(
    expect.arrayContaining(["'+Alwar", "'@Jaipur", "जयपुर"]),
  );
  expect(stage.col("Last internal note")).toContain(
    'Line one\nline two, with "quotes"',
  );
  await expectToast(page, /Downloaded .*\(3 rows\)/);

  // Search narrows the stage export.
  await page.getByPlaceholder("Search name, email or phone").fill("Sharma");
  const searched = await exportFromMenu(page, /This stage · 1 candidate/);
  expect(searched.rows).toHaveLength(1);
  await page.getByPlaceholder("Search name, email or phone").fill("");

  // Selected rows, from the bulk bar.
  await page.getByRole("checkbox", { name: /Select प्रिया/ }).check();
  const dl = page.waitForEvent("download");
  await page
    .getByRole("region", { name: "Bulk actions" })
    .getByRole("button", { name: "Export" })
    .click();
  const selected = await csvOf(await dl);
  expect(selected.name).toContain("_selected-rows_");
  expect(selected.col("Name")).toEqual(["प्रिया शर्मा"]);

  // Full report: joining details, ID numbers kept as text.
  const full = await exportFromMenu(page, /Full report · 4 candidates/);
  expect(full.rows).toHaveLength(4);
  expect(full.headers).toEqual(
    expect.arrayContaining(["Aadhaar", "PAN", "Screening decision"]),
  );
  const z = full.rows.find((r) => r[0] === "Zubin Selected")!;
  const cell = (h: string) => z[full.headers.indexOf(h)];
  expect(cell("Aadhaar")).toBe('="234567890123"');
  expect(cell("UAN")).toBe('="001200340056"');
  expect(cell("Bank account")).toBe('="000123456789"');

  // Decision log and message log.
  const decisions = await exportFromMenu(page, /Decision log · 2 decisions/);
  expect(decisions.rows).toHaveLength(2);
  expect(decisions.col("Message to candidate")).toEqual([
    "'-Please wait",
    "'-Please wait",
  ]);
  const messages = await exportFromMenu(page, /Message log · 2 messages/);
  expect(messages.rows).toHaveLength(2);
  expect(messages.col("Candidate")).toEqual(
    expect.arrayContaining([
      `'=HYPERLINK("http://evil.example","click")`,
      'Sharma, Priya "Pinky"',
    ]),
  );
});

test("an empty stage can't be exported", async ({ hrPage: page }) => {
  const drive = await createDrive();
  await page.goto(`/drives/${drive.id}`);
  await page.getByRole("button", { name: "Export CSV" }).click();
  await expect(
    page.getByRole("menuitem", { name: /This stage · 0 candidates/ }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
});

test("the outbox lists every message with filters, search and previews", async ({
  hrPage: page,
}) => {
  const drive = await createDrive();
  const [a, b, c] = await addCandidates(drive.id, [
    { full_name: "Yash Outbox" },
    { full_name: "Zoya Outbox" },
    { full_name: "Xavier Outbox" },
  ]);
  const hr = clientFor(hrSession());
  await hr.rpc("hr_decide", {
    p_candidate_ids: [a, b],
    p_decision: "approved",
    p_candidate_message: "Report at gate 2 by 9 am.",
  });
  await hr.rpc("hr_decide", {
    p_candidate_ids: [c],
    p_decision: "rejected",
  });

  await page.goto(`/drives/${drive.id}`);
  await page.getByRole("link", { name: "Outbox" }).click();
  await expect(page).toHaveURL(`/drives/${drive.id}/outbox`);
  await expect(page.getByText("3 messages to 3 candidates.")).toBeVisible();
  const list = page.getByRole("list", { name: "Sent messages" });
  await expect(list.getByRole("listitem")).toHaveCount(3);

  await page.getByLabel("Template").selectOption("rejected");
  await expect(page).toHaveURL(/template=rejected/);
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list).toContainText("Xavier Outbox");
  await page.getByLabel("Template").selectOption("");

  await page.getByPlaceholder("Search by candidate or subject").fill("zoya");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await list.getByRole("button").click();
  await expect(page.getByText("To Zoya Outbox")).toBeVisible();
  await expect(
    page.getByText("Report at gate 2 by 9 am.").first(),
  ).toBeVisible();
  await expect(page.getByText("moved_to_round")).toBeVisible();

  await page
    .getByPlaceholder("Search by candidate or subject")
    .fill("nobody here");
  await expect(page.getByText("No messages match")).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export message log" }).click();
  expect((await download).suggestedFilename()).toContain("_message-log_");
});

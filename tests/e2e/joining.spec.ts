import type { Page } from "@playwright/test";
import {
  applyAs,
  clientFor,
  createDrive,
  createUser,
  isoDay,
  joiningFor,
  messagesFor,
  sessionFor,
  updateCandidate,
} from "./support/db.ts";
import { expect, expectToast, hrSession, test } from "./support/fixtures.ts";

async function fillJoining(
  page: Page,
  v: Partial<Record<string, string>>,
): Promise<void> {
  const labels: Record<string, string> = {
    dob: "Date of birth",
    address: "Current address",
    aadhaar: "Aadhaar number",
    pan: "PAN",
    uan: "UAN (optional)",
    holder: "Account holder name",
    account: "Account number",
    ifsc: "IFSC",
    contact: "Contact name",
    contactPhone: "Contact mobile",
    joining: "Preferred joining date",
  };
  for (const [k, value] of Object.entries(v))
    await page.getByLabel(labels[k]!, { exact: true }).fill(value!);
}

test("selected candidate submits joining details; HR asks for a fix, then onboards", async ({
  hrPage: hr,
  pageAs,
}) => {
  const drive = await createDrive();
  const user = await createUser("Meenakshi Gupta");
  const session = await sessionFor(user);
  const id = await applyAs(session, drive.slug, {
    p_full_name: "Meenakshi Gupta",
  });
  await updateCandidate(id, { status: "selected", current_round: 4 });

  const page = await pageAs(session);
  await page.goto(`/me/applications/${id}`);
  await expect(page.getByText("You're selected, Meenakshi.")).toBeVisible();
  await expect(page.getByLabel("Account holder name")).toHaveValue(
    "Meenakshi Gupta",
  );

  // Clearly wrong values are caught field by field.
  await fillJoining(page, {
    dob: isoDay(-365 * 15),
    address: "short",
    aadhaar: "2345 6789 012",
    pan: "ABCD1234F",
    uan: "12345",
    account: "12345",
    ifsc: "HDFC1001234",
    contact: "Raj Gupta",
    contactPhone: "12345",
    joining: isoDay(-1),
  });
  await page.getByRole("button", { name: "Submit joining details" }).click();
  for (const msg of [
    "You need to be between 18 and 65.",
    "Address must be at least 10 characters.",
    "Enter the 12-digit Aadhaar number.",
    "PAN looks like ABCDE1234F.",
    "UAN is 12 digits. Leave it empty if you don't have one.",
    "Account numbers are 9–18 digits.",
    "IFSC looks like HDFC0001234.",
    "Enter a 10-digit Indian mobile number.",
    "Pick a date from today to 90 days out.",
  ])
    await expect(page.getByText(msg)).toBeVisible();
  expect(await joiningFor(id)).toBeNull();

  // Loosely typed but valid values are accepted and cleaned up.
  const joining = isoDay(14);
  await fillJoining(page, {
    dob: "2000-05-20",
    address: "House 14, Gandhi Nagar, Alwar 301001",
    aadhaar: "2345 6789 0123",
    pan: "abcde1234f",
    uan: "",
    account: "5010-0234-5678-12",
    ifsc: "hdfc0001234",
    contactPhone: "094140 55678",
    joining,
  });
  await page.getByRole("button", { name: "Submit joining details" }).click();
  await expectToast(page, "Details sent to HR");
  await expect(
    page.getByText("Submitted. HR is reviewing your details"),
  ).toBeVisible();
  await expect(page.getByText("XXXX XXXX 0123")).toBeVisible();
  await page.getByRole("button", { name: "Show Aadhaar number" }).click();
  await expect(page.getByText("2345 6789 0123")).toBeVisible();
  expect(await joiningFor(id)).toMatchObject({
    aadhaar_number: "234567890123",
    pan_number: "ABCDE1234F",
    uan_number: null,
    bank_account_number: "50100234567812",
    bank_ifsc: "HDFC0001234",
    emergency_contact_phone: "9414055678",
    preferred_joining_date: joining,
  });

  // HR reviews in the Selected tab.
  await hr.goto(`/drives/${drive.id}?stage=selected`);
  const row = hr.getByRole("row").filter({ hasText: "Meenakshi Gupta" });
  await expect(row).toContainText("Submitted");
  await row.getByRole("button", { name: /Meenakshi Gupta/ }).click();
  const drawer = hr.getByRole("dialog", { name: "Meenakshi Gupta" });
  await expect(drawer).toContainText("XXXX XXXX 0123");
  await expect(drawer).not.toContainText("2345 6789 0123");
  await drawer.getByRole("button", { name: "Show Aadhaar number" }).click();
  await expect(drawer).toContainText("2345 6789 0123");
  await expect(drawer).toContainText("Has account");

  await drawer.getByRole("button", { name: "Request changes" }).click();
  const ask = hr.getByRole("dialog", { name: "Request changes" });
  await ask.getByRole("button", { name: "Send request" }).click();
  await expect(ask).toContainText("Tell the candidate what to change.");
  await ask
    .getByLabel("What should they change?")
    .fill("Your IFSC is for a Delhi branch. Please check your passbook.");
  await ask.getByRole("button", { name: "Send request" }).click();
  await expectToast(hr, "Asked Meenakshi Gupta to update their details");
  await expect(ask).toBeHidden();
  await expect(drawer).toContainText("Changes requested");
  await expect(
    drawer.getByRole("button", { name: "Mark onboarded" }),
  ).toBeDisabled();

  // Candidate sees the reason and resubmits.
  await page.reload();
  await expect(page.getByText("HR asked you to fix one thing")).toBeVisible();
  await expect(
    page.getByText(
      "Your IFSC is for a Delhi branch. Please check your passbook.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Aadhaar number")).toHaveValue("2345 6789 0123");
  await fillJoining(page, { ifsc: "SBIN0004321" });
  await page.getByRole("button", { name: "Resubmit details" }).click();
  await expectToast(page, "Details sent to HR");
  expect((await joiningFor(id))?.bank_ifsc).toBe("SBIN0004321");

  // HR onboards.
  await hr.reload();
  await expect(drawer).toContainText("SBIN0004321");
  await drawer.getByRole("button", { name: "Mark onboarded" }).click();
  await expectToast(hr, "Meenakshi Gupta marked onboarded");
  await expect(drawer).toContainText("Onboarded");

  await page.reload();
  await expect(
    page.getByText("You're all set, Meenakshi. Welcome to Naman Foods"),
  ).toBeVisible();
  // Onboarded details are no longer editable.
  await expect(
    page.getByRole("button", { name: /Edit details|Resubmit/ }),
  ).toHaveCount(0);

  expect((await messagesFor(id)).map((m) => m.template)).toEqual([
    "application_received",
    "details_received",
    "changes_requested",
    "details_received",
    "onboarded",
  ]);
  await page.goto("/me/inbox");
  await expect(
    page.getByRole("list", { name: "Messages" }).getByRole("listitem"),
  ).toHaveCount(5);
  await page
    .getByRole("button", { name: /Please update your joining details/ })
    .click();
  await expect(
    page.getByText("Your IFSC is for a Delhi branch.").first(),
  ).toBeVisible();
});

test("a candidate can edit submitted details before HR acts", async ({
  pageAs,
}) => {
  const drive = await createDrive();
  const user = await createUser("Rohit Kumawat");
  const session = await sessionFor(user);
  const id = await applyAs(session, drive.slug, {
    p_full_name: "Rohit Kumawat",
  });
  await updateCandidate(id, { status: "selected", current_round: 4 });
  const page = await pageAs(session);
  await page.goto(`/me/applications/${id}`);
  await fillJoining(page, {
    dob: "1998-01-02",
    address: "Ward 7, Main Bazaar, Tijara 301411",
    aadhaar: "987654321098",
    pan: "PQRSX6789Z",
    uan: "100200300400",
    account: "123456789",
    ifsc: "PUNB0123400",
    contact: "Sunita Kumawat",
    contactPhone: "9001234567",
    joining: isoDay(30),
  });
  await page.getByRole("button", { name: "Submit joining details" }).click();
  await expect(page.getByText("Submitted. HR is reviewing")).toBeVisible();
  await page.getByRole("button", { name: "Edit details" }).click();
  await fillJoining(page, { contact: "Ramesh Kumawat" });
  await page.getByRole("button", { name: "Resubmit details" }).click();
  await expect(page.getByText("Submitted. HR is reviewing")).toBeVisible();
  await expect(page.getByText("Ramesh Kumawat · 90012 34567")).toBeVisible();
  expect((await joiningFor(id))?.uan_number).toBe("100200300400");
});

test("candidates only ever see their own application, and never HR notes", async ({
  pageAs,
}) => {
  const drive = await createDrive();
  const alice = await createUser("Alka Jain");
  const bob = await createUser("Bharat Lal");
  const aliceSession = await sessionFor(alice);
  const bobSession = await sessionFor(bob);
  const aliceApp = await applyAs(aliceSession, drive.slug, {
    p_full_name: "Alka Jain",
  });
  const bobApp = await applyAs(bobSession, drive.slug, {
    p_full_name: "Bharat Lal",
    p_phone: "9811099999",
  });
  const { error } = await clientFor(hrSession()).rpc("hr_decide", {
    p_candidate_ids: [aliceApp],
    p_decision: "approved",
    p_note: "SECRET-HR-NOTE weak on maths",
    p_candidate_message: "Great interview, see you at the aptitude test.",
  });
  expect(error).toBeNull();

  const page = await pageAs(aliceSession);
  await page.goto(`/me/applications/${aliceApp}`);
  await expect(
    page.getByText("Great interview, see you at the aptitude test.").first(),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("SECRET-HR-NOTE");
  await page.goto("/me/inbox");
  await page.getByRole("button", { name: /You're through to the/ }).click();
  await expect(page.getByText("Sent with this email")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("SECRET-HR-NOTE");
  await expect(page.locator("body")).not.toContainText("Bharat");

  // Someone else's application id shows nothing of theirs.
  await page.goto(`/me/applications/${bobApp}`);
  await expect(
    page.getByText("We couldn't find that application."),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Bharat");
  await expect(page.locator("body")).not.toContainText("98110 99999");
  // A malformed id is handled too.
  await page.goto("/me/applications/not-an-id");
  await expect(
    page.getByText("It may belong to another account."),
  ).toBeVisible();
});

test("joining details can't be submitted before selection", async ({
  pageAs,
}) => {
  const drive = await createDrive();
  const user = await createUser("Early Bird");
  const session = await sessionFor(user);
  const id = await applyAs(session, drive.slug, { p_full_name: "Early Bird" });
  const page = await pageAs(session);
  await page.goto(`/me/applications/${id}`);
  await expect(page.getByText("Round 1 of 4")).toBeVisible();
  await expect(page.getByLabel("Aadhaar number")).toHaveCount(0);
  // And the server refuses it even if the call is made directly.
  const { error } = await clientFor(session).rpc("submit_joining_details", {
    p_candidate_id: id,
    p_details: {},
  });
  expect(error).not.toBeNull();
});

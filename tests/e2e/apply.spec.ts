import {
  applyAs,
  candidatesIn,
  createDrive,
  createUser,
  messagesFor,
  rand,
  sessionFor,
} from "./support/db.ts";
import {
  expect,
  expectToast,
  fillApplyForm,
  test,
} from "./support/fixtures.ts";

const newEmail = () => `test+e2e-${rand()}@example.com`;

test("unknown drive link explains the problem", async ({ page }) => {
  await page.goto("/apply/no-such-drive-anywhere");
  await expect(page.getByText("This drive doesn't exist")).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
});

test("closed drive shows a closed page, not the form", async ({ page }) => {
  const drive = await createDrive({ status: "closed" });
  await page.goto(`/apply/${drive.slug}`);
  await expect(
    page.getByText("Applications for this drive are closed"),
  ).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveCount(0);
});

test("drive page shows the drive and its rounds in order", async ({ page }) => {
  const drive = await createDrive({
    rounds: ["Screening", "Line Trial", "Panel"],
  });
  await page.goto(`/apply/${drive.slug}`);
  await expect(page.getByRole("heading", { name: drive.title })).toBeVisible();
  await expect(page.getByText("5 openings")).toBeVisible();
  await expect(page.getByText("3 rounds")).toBeVisible();
  const rounds = page
    .getByRole("heading", { name: "What happens after you apply" })
    .locator("..")
    .getByRole("listitem");
  await expect(rounds).toHaveCount(3);
  await expect(rounds.nth(1)).toContainText("Line Trial");
  await expect(rounds.nth(1)).toContainText("Round 2");
});

test("empty and invalid answers get a message on each field", async ({
  page,
}) => {
  const drive = await createDrive();
  await page.goto(`/apply/${drive.slug}`);
  const submit = page.getByRole("button", { name: "Create account & apply" });
  await submit.click();
  await expect(
    page.getByText("Full name must be at least 2 characters."),
  ).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(
    page.getByText("Enter a 10-digit Indian mobile number."),
  ).toBeVisible();
  await expect(
    page.getByText("City must be at least 2 characters."),
  ).toBeVisible();
  await expect(
    page.getByText("Pick your highest qualification."),
  ).toBeVisible();
  await expect(page.getByText("Enter your years of experience.")).toBeVisible();
  await expect(
    page.getByText("Password must be at least 8 characters."),
  ).toBeVisible();
  await expect(
    page.getByText("Please agree so HR can contact you."),
  ).toBeVisible();

  // Near-misses people actually type.
  await fillApplyForm(page, {
    name: "A",
    email: "ravi@gmail",
    phone: "12345 67890",
    experience: "2.3",
    password: "short",
  });
  await submit.click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(
    page.getByText("Enter a 10-digit Indian mobile number."),
  ).toBeVisible();
  await expect(
    page.getByText("Use whole or half years, like 2 or 2.5."),
  ).toBeVisible();
  await fillApplyForm(page, { experience: "-1" });
  await submit.click();
  await expect(page.getByText("Experience can't be negative.")).toBeVisible();
  // Nothing reached the database.
  expect(await candidatesIn(drive.id)).toHaveLength(0);
  await expect(page.getByLabel("Mobile number")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("a new candidate creates an account, applies and gets a confirmation", async ({
  page,
}) => {
  const drive = await createDrive();
  const email = newEmail();
  await page.goto(`/apply/${drive.slug}`);
  await fillApplyForm(page, {
    name: "  Sunita Kumari  ",
    email: `  ${email.toUpperCase()}`,
    phone: "+91 98290 11234",
    city: "Bhiwadi",
    qualification: "Diploma — Food Technology",
    experience: "1.5",
    password: "sunita-pass-1",
    consent: true,
  });
  await page.getByRole("button", { name: "Create account & apply" }).click();

  await expect(page).toHaveURL(/\/me\/applications\/[0-9a-f-]{36}$/);
  await expectToast(page, "Application sent");
  await expect(page.getByRole("heading", { name: drive.title })).toBeVisible();
  await expect(page.getByText("Round 1 of 4")).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText(
    "Screening",
  );
  // Stored cleaned up: trimmed name, lower-case email, bare 10-digit phone.
  const [row] = await candidatesIn(drive.id);
  expect(row).toMatchObject({
    full_name: "Sunita Kumari",
    email,
    phone: "9829011234",
    experience_years: 1.5,
    status: "active",
    current_round: 1,
  });
  expect((await messagesFor(row!.id)).map((m) => m.template)).toEqual([
    "application_received",
  ]);
  await expect(
    page.getByText("+91 98290 11234").or(page.getByText("98290 11234")),
  ).toBeVisible();

  // Inbox has the confirmation email and its SMS.
  await page.goto("/me/inbox");
  await page
    .getByRole("button", { name: /We've got your application/ })
    .click();
  await expect(page).toHaveURL(/\/me\/inbox\?m=/);
  await expect(page.getByText("Sent with this email")).toBeVisible();

  // My applications lists it.
  await page.goto("/me");
  await expect(page.getByText("Hi Sunita.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(drive.title) }),
  ).toContainText("Next: Aptitude Test");
});

test("double-clicking submit creates one account and one application", async ({
  page,
}) => {
  const drive = await createDrive();
  await page.goto(`/apply/${drive.slug}`);
  await fillApplyForm(page, {
    name: "Imran Qureshi",
    email: newEmail(),
    phone: "9414012345",
    city: "Alwar",
    qualification: "10th pass",
    experience: "0",
    password: "imran-pass-1",
    consent: true,
  });
  await page.getByRole("button", { name: "Create account & apply" }).dblclick();
  await expect(page).toHaveURL(/\/me\/applications\//);
  expect(await candidatesIn(drive.id)).toHaveLength(1);
});

test("signing up with an email that already has an account points to log in", async ({
  page,
}) => {
  const existing = await createUser("Asha Verma");
  const drive = await createDrive();
  await page.goto(`/apply/${drive.slug}`);
  await fillApplyForm(page, {
    name: "Asha Verma",
    email: existing.email,
    phone: "9414012399",
    city: "Alwar",
    qualification: "10th pass",
    experience: "0",
    password: "different-pass",
    consent: true,
  });
  await page.getByRole("button", { name: "Create account & apply" }).click();
  await expect(
    page.getByText("An account with this email already exists"),
  ).toBeVisible();
  const login = page.getByRole("link", { name: "Log in" }).first();
  await expect(login).toHaveAttribute(
    "href",
    `/login?next=${encodeURIComponent(`/apply/${drive.slug}`)}`,
  );
  expect(await candidatesIn(drive.id)).toHaveLength(0);
});

test("a returning candidate applies to a second drive with saved details", async ({
  pageAs,
}) => {
  const user = await createUser("Pooja Meena");
  const session = await sessionFor(user);
  const first = await createDrive();
  await applyAs(session, first.slug, {
    p_full_name: "Pooja Meena",
    p_phone: "9001122334",
    p_city: "Dausa",
    p_qualification: "12th pass (Science)",
    p_experience_years: 3,
  });
  const second = await createDrive({ title: `Second drive ${rand(2)}` });

  const page = await pageAs(session);
  await page.goto(`/apply/${second.slug}`);
  await expect(page.getByText("We'll use your saved details")).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveCount(0);
  await expect(page.getByLabel("City")).toHaveValue("Dausa");
  await expect(page.getByLabel("Highest qualification")).toHaveValue(
    "12th pass (Science)",
  );
  await expect(page.getByLabel("Work experience (years)")).toHaveValue("3");
  await page.getByLabel(/Naman Foods can contact me/).check();
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page).toHaveURL(/\/me\/applications\//);

  await page.goto("/me");
  await expect(page.getByRole("link", { name: /drive/ })).toHaveCount(2);
});

test("applying twice to the same drive is blocked with a clear message", async ({
  pageAs,
}) => {
  const user = await createUser("Deepak Yadav");
  const session = await sessionFor(user);
  const drive = await createDrive();
  await applyAs(session, drive.slug);

  const page = await pageAs(session);
  await page.goto(`/apply/${drive.slug}`);
  await page.getByLabel(/Naman Foods can contact me/).check();
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(
    page.getByText("You've already applied to this drive"),
  ).toBeVisible();
  await page.getByRole("link", { name: "See where it stands" }).click();
  await expect(page).toHaveURL("/me");
  expect(await candidatesIn(drive.id)).toHaveLength(1);
});

test("HR opening an apply link sees a note instead of the form", async ({
  hrPage,
}) => {
  const drive = await createDrive();
  await hrPage.goto(`/apply/${drive.slug}`);
  await expect(hrPage.getByText("You're signed in as HR")).toBeVisible();
  await expect(hrPage.getByLabel("Mobile number")).toHaveCount(0);
});

test("a drive that closes while the form is open rejects the submission", async ({
  page,
}) => {
  const drive = await createDrive();
  await page.goto(`/apply/${drive.slug}`);
  await fillApplyForm(page, {
    name: "Late Applicant",
    email: newEmail(),
    phone: "9414012300",
    city: "Alwar",
    qualification: "10th pass",
    experience: "0",
    password: "late-pass-123",
    consent: true,
  });
  const { admin } = await import("./support/db.ts");
  await admin.from("drives").update({ status: "closed" }).eq("id", drive.id);
  await page.getByRole("button", { name: "Create account & apply" }).click();
  await expect(
    page.getByText(/Applications for this drive are closed/).first(),
  ).toBeVisible();
  expect(await candidatesIn(drive.id)).toHaveLength(0);
});

test("a network failure on submit can be retried without a second account", async ({
  page,
}) => {
  const drive = await createDrive();
  await page.goto(`/apply/${drive.slug}`);
  await fillApplyForm(page, {
    name: "Neha Choudhary",
    email: newEmail(),
    phone: "9414012311",
    city: "Rewari",
    qualification: "ITI — Electrician",
    experience: "2",
    password: "neha-pass-123",
    consent: true,
  });
  // The account is created, then the apply call drops once.
  let dropped = false;
  await page.route("**/rest/v1/rpc/apply_to_drive", (route) => {
    if (dropped) return route.continue();
    dropped = true;
    return route.abort("internetdisconnected");
  });
  const submit = page.getByRole("button", { name: "Create account & apply" });
  await submit.click();
  await expect(
    page.getByText("Something went wrong. Please try again."),
  ).toBeVisible();
  await submit.click();
  await expect(page).toHaveURL(/\/me\/applications\//);
  expect(await candidatesIn(drive.id)).toHaveLength(1);
});

test("names with markup are shown as text, never run", async ({ page }) => {
  const drive = await createDrive();
  let alerted = false;
  page.on("dialog", (d) => {
    alerted = true;
    void d.dismiss();
  });
  await page.goto(`/apply/${drive.slug}`);
  const name = `<img src=x onerror=alert(1)> Ravi`;
  await fillApplyForm(page, {
    name,
    email: newEmail(),
    phone: "9414012322",
    city: "Alwar",
    qualification: "10th pass",
    experience: "0",
    password: "ravi-pass-123",
    consent: true,
  });
  await page.getByRole("button", { name: "Create account & apply" }).click();
  await expect(page).toHaveURL(/\/me\/applications\//);
  await page.goto("/me/inbox");
  await page
    .getByRole("button", { name: /We've got your application/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thanks for applying, <img" }),
  ).toBeVisible();
  await expect(page.locator("img[src='x']")).toHaveCount(0);
  expect(alerted).toBe(false);
});

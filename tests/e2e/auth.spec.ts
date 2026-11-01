import {
  createDrive,
  createUser,
  DEMO_PASSWORD,
  sessionFor,
} from "./support/db.ts";
import { expect, test } from "./support/fixtures.ts";

test.describe("signed out", () => {
  for (const path of ["/", "/me", "/me/inbox", "/drives/new"]) {
    test(`${path} sends you to log in and remembers where you were`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
      await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    });
  }

  test("empty login form explains what's missing", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();
  });

  test("wrong password shows a friendly error and keeps you on the page", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("demo.hr@example.com");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByText("Email or password is incorrect."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("unknown page shows a not-found state with a way home", async ({
    page,
  }) => {
    await page.goto("/definitely/not/here");
    await expect(page.getByText("Page not found")).toBeVisible();
    await page.getByRole("link", { name: "Go home" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test("HR logs in from a deep link and lands back on it", async ({ page }) => {
  const hr = await createUser("HR team", { hr: true });
  const drive = await createDrive();
  await page.goto(`/drives/${drive.id}`);
  await expect(page).toHaveURL(/\/login\?next=/);
  // Mixed-case email with spaces, as people type it on phones.
  await page.getByLabel("Email").fill(`  ${hr.email.toUpperCase()} `);
  await page.getByLabel("Password").fill(hr.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(`/drives/${drive.id}`);
  await expect(page.getByRole("heading", { name: drive.title })).toBeVisible();
  // The session survives a reload.
  await page.reload();
  await expect(page.getByRole("heading", { name: drive.title })).toBeVisible();
});

test("a ?next= pointing off-site is ignored", async ({ hrPage }) => {
  await hrPage.goto("/login?next=//evil.example.com/steal");
  await expect(hrPage).toHaveURL("/");
  await expect(
    hrPage.getByRole("heading", { name: "Drives", exact: true }),
  ).toBeVisible();
});

test("each role is kept to its own pages", async ({ hrPage, pageAs }) => {
  await hrPage.goto("/me");
  await expect(hrPage).toHaveURL("/");
  await hrPage.goto("/me/inbox");
  await expect(hrPage).toHaveURL("/");

  const cand = await createUser("Ritu Saini");
  const page = await pageAs(await sessionFor(cand));
  for (const path of ["/", "/drives/new", "/drives/abc/outbox"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/me");
  }
  await expect(
    page.getByRole("heading", { name: "My applications" }),
  ).toBeVisible();
});

test("signing out ends the session and protected pages need a login again", async ({
  pageAs,
}) => {
  // Its own HR account: signing out revokes the session everywhere.
  const hr = await createUser("HR team", { hr: true });
  const page = await pageAs(await sessionFor(hr));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Drives", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("candidate signs out from the account menu", async ({ pageAs }) => {
  const cand = await createUser("Kavya Rathore");
  const page = await pageAs(await sessionFor(cand));
  await page.goto("/me");
  const menuButton = page.getByRole("button", { name: /account menu/ });
  await menuButton.click();
  await expect(page.getByRole("menu")).toContainText(cand.email);
  // Escape closes the menu without signing out.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
  await menuButton.click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await page.goto("/me");
  await expect(page).toHaveURL(/\/login\?next=%2Fme/);
});

test.describe("demo accounts", () => {
  test.skip(!DEMO_PASSWORD, "needs DEMO_PASSWORD");

  test("the demo box shows the password and three accounts", async ({
    page,
  }) => {
    await page.goto("/login");
    const box = page.getByRole("region", { name: "Try the demo" });
    await expect(box).toContainText(`Password: ${DEMO_PASSWORD}`);
    await expect(box.getByRole("button")).toHaveCount(3);
  });

  test("HR demo opens the drives dashboard with seeded drives", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /HR team/ }).click();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", {
        name: "Walk-in drive: Production Associates",
      }),
    ).toBeVisible();
    await expect(page.getByText("Waiting on you")).toBeVisible();
  });

  test("Aarav demo shows his application in Technical Interview", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Aarav Mehta/ }).click();
    await expect(page).toHaveURL("/me");
    await expect(page.getByText("Hi Aarav.")).toBeVisible();
    await expect(
      page.getByText(/Round 3 of 4 · Technical Interview/),
    ).toBeVisible();
  });

  test("Meera demo shows she is selected and owes joining details", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Meera Iyer/ }).click();
    await expect(page).toHaveURL("/me");
    await expect(
      page.getByText("Next: share your joining details."),
    ).toBeVisible();
    await page.getByRole("link", { name: /Walk-in drive/ }).click();
    await expect(page.getByText("You're selected, Meera.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit joining details" }),
    ).toBeVisible();
  });
});

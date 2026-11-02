import { DEMO_PASSWORD } from "./support/db.ts";
import { expect, test } from "./support/fixtures.ts";

test("signed out, / shows the landing page with the demo drive's funnel", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /47 applied/ }),
  ).toBeVisible();
  const funnel = page.getByRole("figure").filter({
    hasText: "Walk-in drive: Production Associates",
  });
  const stages = funnel.getByRole("listitem");
  await expect(stages).toHaveCount(5);
  await expect(stages.first()).toContainText("47applied");
  await expect(stages.last()).toContainText("6selected");
  await expect(funnel).toContainText("One of the six has already joined.");
  await expect(page.getByRole("img", { name: /HR pipeline/ })).toBeVisible();

  await page.getByRole("link", { name: "Apply as a candidate" }).click();
  await expect(page).toHaveURL("/apply/demo-production-associates");
});

test("the landing and notes pages link to each other", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Read the submission notes" }).click();
  await expect(page).toHaveURL("/notes");
  await expect(
    page.getByRole("heading", { level: 1, name: /built in 24/ }),
  ).toBeVisible();
  // Every brief line is listed, and the contents jump to their sections.
  await expect(page.getByText("Done", { exact: true })).toHaveCount(7);
  await page
    .getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "Where the hours went" })
    .click();
  await expect(page).toHaveURL("/notes#hours");
  await expect(
    page.getByRole("table", { name: "Planned hours per phase" }),
  ).toBeInViewport();
  await page.getByRole("link", { name: "Back to the overview" }).click();
  await expect(page).toHaveURL("/");
});

test("Sign in goes to the login page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test.describe("demo accounts", () => {
  test.skip(!DEMO_PASSWORD, "needs DEMO_PASSWORD");

  test("Try the HR demo signs in and opens the drives", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Try the HR demo" }).click();
    await expect(page).toHaveURL("/drives");
    await expect(
      page.getByRole("heading", {
        name: "Walk-in drive: Production Associates",
      }),
    ).toBeVisible();
  });

  test("a candidate demo account from the landing page opens My applications", async ({
    page,
  }) => {
    await page.goto("/");
    const demo = page.getByRole("region", {
      name: "Try it with a demo account",
    });
    await expect(demo).toContainText(DEMO_PASSWORD!);
    await demo.getByRole("button", { name: /Aarav Mehta/ }).click();
    await expect(page).toHaveURL("/me");
    await expect(page.getByText("Hi Aarav.")).toBeVisible();
  });
});

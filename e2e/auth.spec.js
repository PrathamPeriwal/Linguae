import { randomBytes } from "node:crypto";
import { expect, test } from "./fixtures.js";

function email() {
  const hex = randomBytes(4).toString("hex");
  const letter = "abcdefghijklmnopqrstuvwxyz"[randomBytes(1)[0] % 26];
  return { email: `e2e-${hex}-${letter}@example.com`, letter, hex };
}

test("sign up, onboard, reject a bad password, and send logged-out visitors to the right page", async ({
  page,
}) => {
  const account = email();
  const password = "correct-horse-1";

  await page.goto("/signup");
  await page.locator("#fullName").fill(`E2E ${account.letter.toUpperCase()} ${account.hex}`);
  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Create an account" }).click();

  await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
  const preview = page.getByRole("complementary", { name: "How others will see you" });
  await expect(preview).toContainText("Hello");

  await page.locator("#fullName").fill("Ada Lovelace");
  await expect(preview).toContainText("Ada Lovelace");
  await page.locator("#bio").fill("Walks by the river and likes slow conversations.");
  await expect(preview).toContainText("Walks by the river");
  await page.locator("#location").fill("Porto, Portugal");
  await expect(preview).toContainText("Porto, Portugal");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Languages" })).toBeVisible();
  await page.locator("#nativeLanguage").fill("Hindi");
  await page.getByRole("option", { name: "Hindi", exact: true }).click();
  await expect(preview).toContainText("नमस्ते");
  await page.locator("#learningLanguage").fill("Spanish");
  await page.getByRole("option", { name: "Spanish", exact: true }).click();
  await expect(preview.getByText("Hindi", { exact: true })).toBeVisible();
  await expect(preview.getByText("Spanish", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start talking" }).click();

  await expect(page.getByRole("heading", { name: "Meet new learners" })).toBeVisible();

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  page.allowHttp(401, "/api/auth/login");
  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("Invalid email or password");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/notifications");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome$/);
});

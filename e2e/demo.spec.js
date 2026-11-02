import { loginThroughUi } from "./helpers.js";
import { expect, test } from "./fixtures.js";

const MAYA_LUCIA = [
  "Hola Lucía. I am learning Spanish for a trip to Madrid.",
  "Hola Maya. Welcome. I am happy to help you practise.",
  "Gracias. I can also chat in Hindi or English.",
  "Perfecto. I want to sound natural in English.",
  "We can go slowly. How do you say nice to meet you?",
  "Mucho gusto. It means nice to meet you.",
  "¿Cómo estás?",
  "I am a teacher, so I am patient with learners.",
];

test("Maya sees the seeded people, chats, and the call lobby", async ({ page }) => {
  test.setTimeout(120000);
  await loginThroughUi(page, "maya@linguae.demo");

  const grid = page.locator(".learner-grid");
  for (const name of ["Anna Weber", "Sofia Almeida", "Olga Petrova", "Wei Chen", "Layla Hassan"]) {
    await expect(grid.getByRole("heading", { name }), `${name} should be on Discover`).toBeVisible();
  }
  const anna = grid.locator("li").filter({ has: page.getByRole("heading", { name: "Anna Weber" }) });
  await expect(anna.getByRole("button", { name: "Request sent to Anna Weber" })).toBeVisible();
  await expect(anna.getByRole("button", { name: "Cancel request to Anna Weber" })).toBeVisible();
  for (const name of ["Lucía Fernández", "Kenji Mori", "Pierre Dubois", "Hana Kim"]) {
    await expect(grid.getByRole("heading", { name }), `${name} is a friend and should not be on Discover`).toHaveCount(0);
  }

  const panel = page.getByRole("complementary", { name: "Conversations" });
  const lucia = panel.getByRole("link", { name: /Lucía Fernández/ });
  await expect(lucia, "Lucía's row should show 2 unread").toContainText("2 unread");

  await page.getByRole("link", { name: /^Requests/ }).filter({ visible: true }).click();
  await expect(page.getByRole("heading", { name: "Requests", exact: true })).toBeVisible();
  const waiting = page.locator("section").filter({ has: page.getByRole("heading", { name: /Waiting for you/ }) });
  await expect(waiting).toContainText("2");
  await expect(waiting.getByText("Olga Petrova")).toBeVisible();
  await expect(waiting.getByText("Sofia Almeida")).toBeVisible();
  const accepted = page.locator("section").filter({ has: page.getByRole("heading", { name: "Accepted your request" }) });
  await expect(accepted.getByText("Pierre Dubois")).toBeVisible();
  await expect(accepted.getByText("Hana Kim")).toBeVisible();

  await page.getByRole("link", { name: "Discover" }).filter({ visible: true }).click();
  await expect(lucia).toContainText("2 unread");
  await lucia.click();
  const thread = page.locator(".str-chat__list");
  for (const line of MAYA_LUCIA) {
    await expect(thread.getByText(line), `missing chat line: ${line}`).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /Lucía Fernández/ })).not.toContainText("unread");

  await page.getByRole("link", { name: /Hana Kim/ }).click();
  await expect(page.getByText("안녕하세요")).toBeVisible();
  await expect(page.getByText("Say hello to Hana Kim in Korean.")).toBeVisible();
  const reveal = page.getByRole("button", { name: /means Hello/ });
  await page.locator("#main").focus();
  for (let step = 0; step < 40 && !(await reveal.evaluate((node) => node === document.activeElement)); step += 1) {
    await page.keyboard.press("Tab");
  }
  await expect(reveal, "Tab should reach the reveal bar").toBeFocused();
  await page.keyboard.press("Enter");
  await expect(reveal).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  const revealAgain = page.getByRole("button", { name: /means Hello/ });
  await expect(revealAgain).toBeVisible();
  await revealAgain.click();
  await expect(revealAgain).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Start video call" }).click();
  await page.getByRole("link", { name: /Join video call/ }).click();
  await expect(page.getByRole("heading", { name: "Call with Hana Kim" })).toBeVisible();
  await expect(page.getByText("You are about to call Hana Kim")).toBeVisible();
  await expect(page.locator("video").first()).toBeVisible();
});

test("Lucía can sign in", async ({ page }) => {
  await loginThroughUi(page, "lucia@linguae.demo");
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByText("Lucía Fernández").first()).toBeVisible();
});

test("Kenji can sign in", async ({ page }) => {
  await loginThroughUi(page, "kenji@linguae.demo");
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByText("Kenji Mori").first()).toBeVisible();
});

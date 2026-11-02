import { login } from "./helpers.js";
import { expect, test } from "./fixtures.js";

async function mayaPaths(page) {
  const me = await page.request.get("/api/auth/me");
  const user = (await me.json()).user;
  const friends = await (await page.request.get("/api/users/friends")).json();
  const hana = friends.find((friend) => friend.fullName === "Hana Kim");
  if (!hana?._id) throw new Error("Hana Kim was not in Maya's friends");
  return {
    chat: `/chat/${hana._id}`,
    call: `/call/${[user._id, hana._id].sort().join("-")}`,
  };
}

test("pages have a title, welcome describes itself, and the theme color follows the theme", async ({
  page,
}) => {
  await page.goto("/welcome");
  await expect(page).toHaveTitle(/.+/);
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description && description.trim(), "/welcome should have a meta description").not.toBe("");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#190718");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#DDE3E8");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#190718");

  const favicon = await page.request.get("/favicon.svg");
  expect(favicon.status(), "/favicon.svg should load").toBe(200);

  for (const path of ["/login", "/signup", "/does-not-exist"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    const title = (await page.title()).trim();
    expect(title, `${path} should have a title`).not.toBe("");
  }

  await login(page.context(), "maya@linguae.demo");
  const ids = await mayaPaths(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/chats", "/notifications", ids.chat, ids.call]) {
    if (path !== "/chats") await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    const title = (await page.title()).trim();
    expect(title, `${path} should have a title`).not.toBe("");
  }
});

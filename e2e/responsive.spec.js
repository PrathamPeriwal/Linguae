import { login } from "./helpers.js";
import { expect, test } from "./fixtures.js";

const WIDTHS = [360, 768, 1280, 1920];

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

async function assertFrame(page, label) {
  await expect(page.locator("h1"), `${label} should have exactly one h1`).toHaveCount(1);
  const size = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(
    size.scroll,
    `${label} should not scroll sideways (${size.scroll}px content, ${size.viewport}px viewport)`
  ).toBe(size.viewport);
}

test("pages fit the viewport in dark and light", async ({ page }) => {
  test.setTimeout(240000);
  const publicPaths = ["/welcome", "/login", "/signup", "/does-not-exist"];
  for (const theme of ["dark", "light"]) {
    await page.context().addInitScript((value) => {
      localStorage.setItem("linguae-theme", value);
    }, theme);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of publicPaths) {
        await page.goto(path);
        await assertFrame(page, `${path} ${theme} ${width}`);
      }
    }
  }

  await login(page.context(), "maya@linguae.demo");
  const ids = await mayaPaths(page);
  const signedIn = ["/", "/chats", "/notifications", ids.chat, ids.call];
  for (const theme of ["dark", "light"]) {
    await page.context().addInitScript((value) => {
      localStorage.setItem("linguae-theme", value);
    }, theme);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of signedIn) {
        await page.goto(path);
        await assertFrame(page, `${path} ${theme} ${width}`);
        if (width !== 360) continue;
        const bar = page.getByRole("navigation", { name: "Primary" }).filter({ hasText: "Chats" });
        const show = path === "/" || path === "/chats" || path === "/notifications";
        if (show) await expect(bar, `${path} should show the bottom tab bar`).toBeVisible();
        else await expect(bar, `${path} should hide the bottom tab bar`).toBeHidden();
      }
    }
  }
});

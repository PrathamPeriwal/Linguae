import AxeBuilder from "@axe-core/playwright";
import { login, newUser, watchPage } from "./helpers.js";
import { expect, test } from "./fixtures.js";
import { BASE_URL } from "./runtime.js";

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

async function expectCleanAxe(page, label) {
  await page.waitForFunction(() => {
    const grid = document.querySelector(".learner-grid");
    if (!grid) return true;
    const cards = [...grid.querySelectorAll("li")];
    if (cards.length === 0) return false;
    return cards.every((card) => Number(getComputedStyle(card).opacity) >= 0.99);
  }, null, { timeout: 8000 });
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  const detail = bad
    .map((item) => {
      const nodes = item.nodes
        .slice(0, 4)
        .map((node) => node.target.join(" "))
        .join(" | ");
      return `${item.id} (${item.impact}) ${item.help} [${nodes}]`;
    })
    .join("\n");
  expect(bad, `${label}\n${detail}`).toEqual([]);
}

async function longAnimations(page) {
  await page.waitForTimeout(600);
  return page.evaluate(() =>
    document.getAnimations().flatMap((animation) => {
      if (animation.playState === "finished" || animation.playState === "idle") return [];
      const timing = animation.effect?.getComputedTiming?.() || {};
      const duration = timing.duration;
      const iterations = timing.iterations;
      const long = duration === Infinity || (typeof duration === "number" && duration > 50);
      const repeating = iterations === Infinity || (typeof iterations === "number" && iterations > 1);
      if (!long && !repeating) return [];
      const target = animation.effect?.target;
      const name = target && target.nodeType === 1 ? `${target.tagName}.${target.className}` : "animation";
      return [`${name} duration=${duration} iterations=${iterations} state=${animation.playState}`];
    })
  );
}

test("serious axe violations are absent in dark and light", async ({ page }) => {
  test.setTimeout(300000);
  const publicPaths = ["/welcome", "/login", "/signup", "/does-not-exist"];
  for (const theme of ["dark", "light"]) {
    await page.context().addInitScript((value) => {
      localStorage.setItem("linguae-theme", value);
    }, theme);
    for (const path of publicPaths) {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expectCleanAxe(page, `${path} ${theme}`);
    }
  }

  await login(page.context(), "maya@linguae.demo");
  const ids = await mayaPaths(page);
  const signedIn = [
    ["/", { width: 1280, height: 900 }],
    ["/chats", { width: 390, height: 844 }],
    ["/notifications", { width: 1280, height: 900 }],
    [ids.chat, { width: 1280, height: 900 }],
    [ids.call, { width: 1280, height: 900 }],
  ];
  for (const theme of ["dark", "light"]) {
    await page.context().addInitScript((value) => {
      localStorage.setItem("linguae-theme", value);
    }, theme);
    for (const [path, viewport] of signedIn) {
      await page.setViewportSize(viewport);
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expectCleanAxe(page, `${path} ${theme}`);
    }
  }
});

test("reduced motion keeps the greeting still", async ({ browser }) => {
  test.setTimeout(120000);
  const context = await browser.newContext({
    baseURL: BASE_URL,
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const guard = await watchPage(page);
  try {
    await page.goto("/welcome");
    const greeting = page.locator(".greeting-word.is-current");
    await expect(greeting).toHaveText("Hello");
    await page.waitForTimeout(800);
    await expect(greeting, "the greeting should stay on Hello").toHaveText("Hello");
    expect(await longAnimations(page), "/welcome still animates under reduced motion").toEqual([]);

    const person = await newUser({ onboard: false });
    await login(context, person.email, person.password);
    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
    expect(await longAnimations(page), "/onboarding still animates under reduced motion").toEqual([]);

    await login(context, "maya@linguae.demo");
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: "Requests", exact: true })).toBeVisible();
    expect(await longAnimations(page), "/notifications still animates under reduced motion").toEqual([]);
  } finally {
    try {
      guard.assertClean();
    } finally {
      await context.close();
    }
  }
});

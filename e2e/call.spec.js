import { expect, test } from "./fixtures.js";
import { channelId, liveVideoTracks, login, makeFriends, newUser, openContext } from "./helpers.js";

async function lobbyControls(page) {
  await expect(page.getByText(/You are about to call/)).toBeVisible();
  await expect(page.locator("video").first(), "the camera preview should be on screen").toBeVisible();
  const buttons = page.locator("button:visible");
  const count = await buttons.count();
  expect(count, "the lobby should show controls").toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const box = await button.boundingBox();
    const label = (await button.getAttribute("aria-label")) || (await button.innerText()) || `button ${index}`;
    expect(box, `${label} should have a box`).toBeTruthy();
    expect(Math.round(box.height), `${label} should be at least 44px tall`).toBeGreaterThanOrEqual(44);
    expect(Math.round(box.width), `${label} should be at least 44px wide`).toBeGreaterThanOrEqual(44);
  }
}

test("two people join a video call and then leave it", async ({ browser }) => {
  test.setTimeout(180000);
  const kenji = await newUser();
  const lucia = await newUser();
  await makeFriends(kenji, lucia);
  let caller;
  let guest;
  try {
    caller = await openContext(browser);
    guest = await openContext(browser);
    await login(caller.context, kenji.email, kenji.password);
    await login(guest.context, lucia.email, lucia.password);
    await caller.page.goto(`/chat/${lucia.id}`);
    await guest.page.goto(`/chat/${kenji.id}`);
    await expect(caller.page.getByRole("button", { name: "Start video call" })).toBeVisible();
    await expect(guest.page.getByRole("textbox", { name: "Message" })).toBeVisible();

    await caller.page.getByRole("button", { name: "Start video call" }).click();
    const joinLink = guest.page.getByRole("link", { name: /Join video call/ });
    await expect(joinLink, "the call link should appear in the other chat").toBeVisible();
    await joinLink.click();
    await caller.page.getByRole("link", { name: /Join video call/ }).click();

    await expect(caller.page.getByRole("heading", { name: `Call with ${lucia.fullName}` })).toBeVisible();
    await expect(guest.page.getByRole("heading", { name: `Call with ${kenji.fullName}` })).toBeVisible();
    await expect(caller.page.locator("video").first()).toBeVisible();
    await expect(guest.page.locator("video").first()).toBeVisible();

    await caller.page.getByRole("button", { name: "Join call" }).click();
    await guest.page.getByRole("button", { name: "Join call" }).click();

    for (const side of [caller.page, guest.page]) {
      await expect(side.getByText(/Waiting for .+ to join/)).toHaveCount(0, { timeout: 20000 });
      await expect.poll(async () => side.locator(".str-video__participant-view").count(), {
        timeout: 20000,
        message: "each person should see their own tile and the other person's tile",
      }).toBeGreaterThanOrEqual(2);
    }

    await caller.page.getByRole("button", { name: "Leave call" }).click();
    await guest.page.getByRole("button", { name: "Leave call" }).click();
    await expect(caller.page).toHaveURL(/\/chat\//);
    await expect(guest.page).toHaveURL(/\/chat\//);
    await expect(caller.page.getByRole("heading", { name: lucia.fullName })).toBeVisible();
    await expect(guest.page.getByRole("heading", { name: kenji.fullName })).toBeVisible();
    await expect.poll(() => liveVideoTracks(caller.page), { timeout: 10000 }).toEqual([]);
    await expect.poll(() => liveVideoTracks(guest.page), { timeout: 10000 }).toEqual([]);
  } finally {
    const errors = [];
    for (const side of [caller, guest]) {
      if (!side) continue;
      try {
        side.guard.assertClean();
      } catch (error) {
        errors.push(error);
      }
      await side.context.close();
    }
    if (errors.length) throw errors[0];
  }
});

test("lobby controls are at least 44px on a phone", async ({ browser }) => {
  test.setTimeout(90000);
  const one = await newUser();
  const two = await newUser();
  await makeFriends(one, two);
  const phone = await openContext(browser, { viewport: { width: 390, height: 844 } });
  try {
    await login(phone.context, one.email, one.password);
    await phone.page.goto(`/call/${channelId(one.id, two.id)}`);
    await lobbyControls(phone.page);
  } finally {
    try {
      phone.guard.assertClean();
    } finally {
      await phone.context.close();
    }
  }
});

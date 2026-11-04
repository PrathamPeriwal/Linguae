import { expect, test } from "./fixtures.js";
import { login, newUser, openContext } from "./helpers.js";

async function connected(page, path) {
  const socket = page.waitForEvent("websocket", {
    predicate: (item) => item.url().includes("stream-io-api.com"),
    timeout: 25000,
  });
  await page.goto(path);
  await socket;
}

async function clearIncoming(page) {
  const response = await page.request.get("/api/users/friend-requests");
  if (!response.ok()) throw new Error(`Could not read requests (${response.status()})`);
  const body = await response.json();
  for (const row of body.incomingReqs || []) {
    const removed = await page.request.delete(`/api/users/friend-request/${row._id}`);
    if (!removed.ok()) throw new Error(`Could not remove a pending request (${removed.status()})`);
  }
}

async function finish(guards, contexts) {
  const errors = [];
  for (const guard of guards) {
    try {
      guard.assertClean();
    } catch (error) {
      errors.push(error);
    }
  }
  for (const context of contexts) await context.close();
  if (errors.length) throw errors[0];
}

test("a request, an accept, and a new channel update the other browser", async ({ browser }) => {
  test.setTimeout(120000);
  const lucia = await openContext(browser);
  const kenji = await openContext(browser);
  try {
    await login(lucia.context, "lucia@linguae.demo");
    await login(kenji.context, "kenji@linguae.demo");
    // The seed already has Layla's request, so Kenji would not be at zero.
    await clearIncoming(kenji.page);

    await connected(kenji.page, "/notifications");
    await expect(kenji.page.getByRole("heading", { name: "Requests", exact: true })).toBeVisible();
    await connected(lucia.page, "/");
    await lucia.page.locator("#discover-search").fill("Kenji Mori");
    const card = lucia.page.locator(".learner-grid li").filter({
      has: lucia.page.getByRole("heading", { name: "Kenji Mori" }),
    });
    await card.getByRole("button", { name: "Send request to Kenji Mori" }).click();

    await expect(
      kenji.page.getByRole("button", { name: "Accept request from Lucía Fernández" }),
      "Kenji should see Lucía's request without a reload"
    ).toBeVisible({ timeout: 6000 });
    await expect(
      kenji.page.getByRole("link", { name: "Requests, 1 incoming" }),
      "the requests badge should show the new request"
    ).toBeVisible({ timeout: 6000 });
    await expect(
      kenji.page.getByText("Lucía Fernández sent you a request"),
      "Kenji should get a toast for the new request"
    ).toBeVisible({ timeout: 6000 });

    await kenji.page.getByRole("button", { name: "Accept request from Lucía Fernández" }).click();
    await expect(
      lucia.page.getByText("Kenji Mori accepted your request"),
      "Lucía should see the accept toast without a reload"
    ).toBeVisible({ timeout: 6000 });
    const luciaPanel = lucia.page.getByRole("complementary", { name: "Conversations" });
    await expect(
      luciaPanel.getByRole("link", { name: /Kenji Mori/ }),
      "Kenji should appear in Lucía's conversations without a reload"
    ).toBeVisible({ timeout: 6000 });

    await kenji.page
      .getByRole("navigation", { name: "Primary" })
      .filter({ visible: true })
      .getByRole("link", { name: "Discover" })
      .click();
    const kenjiPanel = kenji.page.getByRole("complementary", { name: "Conversations" });
    const kenjiRow = kenjiPanel.getByRole("link", { name: /Lucía Fernández/ });
    await expect(kenjiRow).toBeVisible();

    await luciaPanel.getByRole("link", { name: /Kenji Mori/ }).click();
    const text = `Hello from the new channel ${Date.now()}`;
    await lucia.page.getByRole("textbox", { name: "Message" }).fill(text);
    await lucia.page.getByRole("textbox", { name: "Message" }).press("Enter");
    await expect(kenjiRow, "Kenji should see an unread badge for a channel he has not opened").toContainText(
      "1 unread",
      { timeout: 6000 }
    );
    await expect(kenjiRow, "Kenji should see the message preview").toContainText(text, { timeout: 6000 });

    await kenjiRow.click();
    await expect(kenji.page.locator(".str-chat__list").getByText(text)).toBeVisible();
    await expect(kenjiPanel.getByRole("link", { name: /Lucía Fernández/ })).not.toContainText("unread");
    const reply = `Reply from Kenji ${Date.now()}`;
    await kenji.page.getByRole("textbox", { name: "Message" }).fill(reply);
    await kenji.page.getByRole("textbox", { name: "Message" }).press("Enter");
    await expect(
      lucia.page.locator(".str-chat__list").getByText(reply),
      "Lucía should receive Kenji's reply in the chat"
    ).toBeVisible({ timeout: 6000 });
  } finally {
    await finish([lucia.guard, kenji.guard], [lucia.context, kenji.context]);
  }
});

test("declining and cancelling update the other browser", async ({ browser }) => {
  test.setTimeout(120000);
  const sender = await newUser();
  const receiver = await newUser();
  const canceller = await newUser();
  const other = await newUser();
  const a = await openContext(browser);
  const b = await openContext(browser);
  try {
    await login(a.context, sender.email, sender.password);
    await login(b.context, receiver.email, receiver.password);
    await connected(b.page, "/notifications");
    await connected(a.page, "/");
    await a.page.locator("#discover-search").fill(receiver.fullName);
    const card = a.page.locator(".learner-grid li").filter({
      has: a.page.getByRole("heading", { name: receiver.fullName }),
    });
    await card.getByRole("button", { name: `Send request to ${receiver.fullName}` }).click();
    const decline = b.page.getByRole("button", { name: `Decline request from ${sender.fullName}` });
    await expect(decline, "the receiver should see the request without a reload").toBeVisible({
      timeout: 6000,
    });
    await decline.click();
    await expect(
      card.getByRole("button", { name: `Cancel request to ${receiver.fullName}` }),
      "Undo should disappear after the other person declines"
    ).toHaveCount(0, { timeout: 6000 });
    await expect(
      card.getByRole("button", { name: `Send request to ${receiver.fullName}` }),
      "Send request should return after a decline"
    ).toBeEnabled({ timeout: 6000 });

    await login(a.context, canceller.email, canceller.password);
    await login(b.context, other.email, other.password);
    await connected(b.page, "/notifications");
    await connected(a.page, "/");
    await a.page.locator("#discover-search").fill(other.fullName);
    const second = a.page.locator(".learner-grid li").filter({
      has: a.page.getByRole("heading", { name: other.fullName }),
    });
    await second.getByRole("button", { name: `Send request to ${other.fullName}` }).click();
    const incoming = b.page.getByRole("button", { name: `Decline request from ${canceller.fullName}` });
    await expect(incoming).toBeVisible({ timeout: 6000 });
    const undo = second.getByRole("button", { name: `Cancel request to ${other.fullName}` });
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(incoming, "the incoming row should disappear when the sender cancels").toHaveCount(0, {
      timeout: 6000,
    });
  } finally {
    await finish([a.guard, b.guard], [a.context, b.context]);
  }
});

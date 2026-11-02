import { test as base } from "@playwright/test";
import { watchPage } from "./helpers.js";

export const test = base.extend({
  page: async ({ page }, use) => {
    const guard = await watchPage(page);
    page.allowHttp = (status, urlPart) => guard.allow(status, urlPart);
    await use(page);
    guard.assertClean();
  },
});

export { expect } from "@playwright/test";

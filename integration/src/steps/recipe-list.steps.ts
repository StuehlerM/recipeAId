import { When, Then } from "@cucumber/cucumber";
import type { RecipeAIdWorld } from "../support/world";

When(
  "I search for {string}",
  async function (this: RecipeAIdWorld, query: string) {
    await this.page.getByPlaceholder("Search by title…").fill(query);
    await this.page.getByRole("button", { name: "Search" }).click();
    await this.page.waitForLoadState("networkidle");
  }
);

Then(
  "I should see {string} in the recipe list",
  async function (this: RecipeAIdWorld, title: string) {
    // Use a locator scoped to recipe card titles to avoid matching nav/other text
    await this.page
      .locator("ul li")
      .filter({ hasText: title })
      .first()
      .waitFor({ state: "visible" });
  }
);

Then(
  "I should not see {string} in the recipe list",
  async function (this: RecipeAIdWorld, title: string) {
    // Wait briefly for any pending navigation/refetch to settle
    await this.page.waitForLoadState("networkidle");
    const count = await this.page
      .locator("ul li")
      .filter({ hasText: title })
      .count();
    if (count > 0) {
      throw new Error(
        `Expected "${title}" not to be visible in the recipe list, but it was`
      );
    }
  }
);

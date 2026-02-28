import { When, Then } from "@cucumber/cucumber";
import type { RecipeAIdWorld } from "../support/world.js";

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
    await this.page
      .getByText(title, { exact: true })
      .waitFor({ state: "visible" });
  }
);

Then(
  "I should not see {string} in the recipe list",
  async function (this: RecipeAIdWorld, title: string) {
    const isVisible = await this.page
      .getByText(title, { exact: true })
      .isVisible();
    if (isVisible) {
      throw new Error(`Expected "${title}" not to be visible in the recipe list, but it was`);
    }
  }
);

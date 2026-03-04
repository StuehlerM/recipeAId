import { When, Then } from "@cucumber/cucumber";
import type { RecipeAIdWorld } from "../support/world";

When(
  "I add {string} to the plan",
  async function (this: RecipeAIdWorld, recipeName: string) {
    // Find the recipe link by its text, then go up to the parent row div
    // and click the "+ Add" button within that row
    const recipeLink = this.page.getByRole("link", { name: recipeName, exact: true });
    const recipeRow = recipeLink.locator("..");
    await recipeRow.getByRole("button", { name: "+ Add" }).click();
    // Wait for the button to change to "Added" (disabled state)
    await recipeRow.getByRole("button", { name: "Added" }).waitFor({ state: "visible" });
  }
);

When(
  "I remove {string} from the plan",
  async function (this: RecipeAIdWorld, recipeName: string) {
    await this.page
      .getByLabel(`Remove ${recipeName} from plan`)
      .click();
  }
);

Then(
  "I should see {string} in the weekly plan",
  async function (this: RecipeAIdWorld, recipeName: string) {
    // The "This Week" section contains a <ul> with plan items
    await this.page
      .locator("section")
      .filter({ hasText: "This Week" })
      .locator("ul li")
      .filter({ hasText: recipeName })
      .first()
      .waitFor({ state: "visible" });
  }
);

Then(
  "I should not see {string} in the weekly plan",
  async function (this: RecipeAIdWorld, recipeName: string) {
    const planSection = this.page.locator("section").filter({ hasText: "This Week" });
    const count = await planSection
      .locator("ul li")
      .filter({ hasText: recipeName })
      .count();
    if (count > 0) {
      throw new Error(
        `Expected not to see "${recipeName}" in weekly plan, but found ${count} item(s)`
      );
    }
  }
);

Then(
  "the shopping list should contain {string}",
  async function (this: RecipeAIdWorld, ingredientName: string) {
    await this.page
      .locator("section")
      .filter({ hasText: "Shopping List" })
      .getByText(ingredientName, { exact: false })
      .first()
      .waitFor({ state: "visible" });
  }
);

Then(
  "the shopping list section should not be visible",
  async function (this: RecipeAIdWorld) {
    // When plan is empty, "Shopping List" heading should not be visible
    await this.page
      .getByText("Shopping List")
      .waitFor({ state: "hidden", timeout: 5000 });
  }
);

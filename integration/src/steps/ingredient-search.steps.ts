import { When, Then } from "@cucumber/cucumber";
import type { RecipeAIdWorld } from "../support/world.js";

When(
  "I add ingredient chip {string}",
  async function (this: RecipeAIdWorld, ingredient: string) {
    // The chip input is the only text input inside the search form
    const input = this.page.locator("form").locator("input");
    await input.fill(ingredient);
    await input.press("Enter");
  }
);

Then(
  "I should see {string} in the search results",
  async function (this: RecipeAIdWorld, title: string) {
    // Results are rendered as links to /recipes/:id
    await this.page
      .locator('a[href*="/recipes/"]')
      .filter({ hasText: title })
      .waitFor({ state: "visible" });
  }
);

Then(
  "{string} should appear before {string} in the results",
  async function (
    this: RecipeAIdWorld,
    firstTitle: string,
    secondTitle: string
  ) {
    const resultLinks = this.page.locator('a[href*="/recipes/"]');
    const count = await resultLinks.count();

    let firstIdx = -1;
    let secondIdx = -1;

    for (let i = 0; i < count; i++) {
      const text = await resultLinks.nth(i).textContent();
      if (firstIdx === -1 && text?.includes(firstTitle)) firstIdx = i;
      if (secondIdx === -1 && text?.includes(secondTitle)) secondIdx = i;
    }

    if (firstIdx === -1) throw new Error(`"${firstTitle}" not found in results`);
    if (secondIdx === -1) throw new Error(`"${secondTitle}" not found in results`);
    if (firstIdx >= secondIdx) {
      throw new Error(
        `Expected "${firstTitle}" (index ${firstIdx}) to appear before "${secondTitle}" (index ${secondIdx})`
      );
    }
  }
);

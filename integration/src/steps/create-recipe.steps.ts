import { When, Then } from "@cucumber/cucumber";
import type { RecipeAIdWorld } from "../support/world";

When(
  "I fill in the title {string}",
  async function (this: RecipeAIdWorld, title: string) {
    await this.page.getByPlaceholder("e.g. Grandma's Apple Pie").fill(title);
  }
);

When(
  "I add an ingredient with name {string} and amount {string} and unit {string}",
  async function (this: RecipeAIdWorld, name: string, amount: string, unit: string) {
    await this.page.getByRole("button", { name: "+ Add ingredient" }).click();
    const names = this.page.locator("input[placeholder='Ingredient']");
    await names.last().fill(name);
    const amounts = this.page.locator("input[placeholder='Amt']");
    await amounts.last().fill(amount);
    // UnitCombobox uses a <datalist>; select the last unit input
    const units = this.page.locator("input[list]");
    await units.last().fill(unit);
  }
);

Then(
  "I should see a title validation error",
  async function (this: RecipeAIdWorld) {
    await this.page
      .getByText("Please enter a title to continue.")
      .waitFor({ state: "visible" });
  }
);

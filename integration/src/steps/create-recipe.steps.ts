import { When, Then } from "@cucumber/cucumber";
import type { RecipeAIdWorld } from "../support/world";

When(
  "I fill in the title {string}",
  async function (this: RecipeAIdWorld, title: string) {
    await this.page.getByPlaceholder("Recipe title").fill(title);
  }
);

When(
  "I add an ingredient with name {string} and quantity {string}",
  async function (this: RecipeAIdWorld, name: string, quantity: string) {
    await this.page.getByRole("button", { name: "+ Add ingredient" }).click();
    const rows = this.page.locator("input[placeholder='Ingredient name']");
    await rows.last().fill(name);
    const quantities = this.page.locator("input[placeholder='Quantity']");
    await quantities.last().fill(quantity);
  }
);

When(
  "I leave the title empty",
  async function (this: RecipeAIdWorld) {
    const titleInput = this.page.getByPlaceholder("Recipe title");
    await titleInput.fill("");
  }
);

Then(
  "the {string} button should be disabled",
  async function (this: RecipeAIdWorld, buttonText: string) {
    const isDisabled = await this.page
      .getByRole("button", { name: buttonText })
      .isDisabled();
    if (!isDisabled) {
      throw new Error(`Expected "${buttonText}" button to be disabled, but it was enabled`);
    }
  }
);

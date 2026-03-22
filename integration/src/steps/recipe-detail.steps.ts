import { Then, When } from "@cucumber/cucumber";
import type { RecipeAIdWorld } from "../support/world";

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

Then(
  "I should see the ingredient {string}",
  async function (this: RecipeAIdWorld, name: string) {
    const ingredientPattern = new RegExp(`^${escapeForRegex(name)}$`, "i");
    await this.page
      .locator("section ul li span")
      .filter({ hasText: ingredientPattern })
      .first()
      .waitFor({ state: "visible" });
  }
);

Then(
  "I should see the quantity {string}",
  async function (this: RecipeAIdWorld, quantity: string) {
    await this.page
      .locator("section ul li span")
      .filter({ hasText: new RegExp(`^${escapeForRegex(quantity)}$`) })
      .first()
      .waitFor({ state: "visible" });
  }
);

When(
  "I click {string} and confirm",
  async function (this: RecipeAIdWorld, buttonText: string) {
    // Accept the window.confirm dialog before clicking, then wait for navigation
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.page.getByRole("button", { name: buttonText }).click();
    await this.page.waitForURL((url) => new URL(url).pathname === "/");
  }
);

Then(
  "I should see the nutrition section heading {string}",
  async function (this: RecipeAIdWorld, heading: string) {
    await this.page
      .getByRole("heading", { name: heading })
      .waitFor({ state: "visible" });
  }
);

Then(
  "I should see the macro label {string}",
  async function (this: RecipeAIdWorld, label: string) {
    await this.page
      .locator("dt")
      .filter({ hasText: new RegExp(`^${escapeForRegex(label)}$`, "i") })
      .first()
      .waitFor({ state: "visible" });
  }
);

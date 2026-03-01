import { Then, When } from "@cucumber/cucumber";
import type { RecipeAIdWorld } from "../support/world";

Then(
  "I should see the ingredient {string}",
  async function (this: RecipeAIdWorld, name: string) {
    await this.page.getByText(name, { exact: true }).waitFor({ state: "visible" });
  }
);

Then(
  "I should see the quantity {string}",
  async function (this: RecipeAIdWorld, quantity: string) {
    await this.page.getByText(quantity, { exact: true }).waitFor({ state: "visible" });
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

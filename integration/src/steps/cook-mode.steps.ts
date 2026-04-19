import { Then } from "@cucumber/cucumber";
import type { RecipeAIdWorld } from "../support/world";

Then("I should be on the cook mode page", async function (this: RecipeAIdWorld) {
  await this.page.waitForURL(/\/recipes\/\d+\/cook/);
});

Then(
  "I should see cook mode step {int} of {int}",
  async function (this: RecipeAIdWorld, currentStep: number, totalSteps: number) {
    await this.page
      .getByText(`Step ${currentStep} of ${totalSteps}`, { exact: true })
      .waitFor({ state: "visible" });
  }
);

Then(
  "I should see the current cook step {string}",
  async function (this: RecipeAIdWorld, text: string) {
    await this.page.getByText(text, { exact: true }).waitFor({ state: "visible" });
  }
);

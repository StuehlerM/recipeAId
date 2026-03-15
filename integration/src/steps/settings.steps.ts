/**
 * Step definitions for settings.feature (Issue #20 — dark theme toggle)
 */
import { Given, When, Then } from "@cucumber/cucumber";
import type { RecipeAIdWorld } from "../support/world";

Given("I navigate to the settings page", async function (this: RecipeAIdWorld) {
  await this.page.goto(`${this.frontendUrl}/settings`);
  await this.page.waitForLoadState("networkidle");
});

When("I toggle the dark theme switch", async function (this: RecipeAIdWorld) {
  // Click the label so Playwright doesn't need to interact with the sr-only checkbox directly
  await this.page.locator("label", { hasText: /dark theme/i }).click();
});

When("I toggle the dark theme switch again", async function (this: RecipeAIdWorld) {
  await this.page.locator("label", { hasText: /dark theme/i }).click();
});

When("I reload the page", async function (this: RecipeAIdWorld) {
  await this.page.reload();
  await this.page.waitForLoadState("networkidle");
});

Then(
  "the page should have the dark theme applied",
  async function (this: RecipeAIdWorld) {
    // Assert: html element has the 'dark' class
    const hasDark = await this.page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    if (!hasDark) throw new Error("Expected html to have class 'dark'");
  }
);

Then(
  "the dark class should be present on the html element",
  async function (this: RecipeAIdWorld) {
    const hasDark = await this.page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    if (!hasDark) throw new Error("Expected html to have class 'dark'");
  }
);

Then(
  "the dark class should not be present on the html element",
  async function (this: RecipeAIdWorld) {
    const hasDark = await this.page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    if (hasDark) throw new Error("Expected html NOT to have class 'dark'");
  }
);

Then(
  "the page should have the light theme applied",
  async function (this: RecipeAIdWorld) {
    const hasDark = await this.page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    if (hasDark) throw new Error("Expected html NOT to have class 'dark' (light theme)");
  }
);

Then(
  "the dark theme switch should still be enabled",
  async function (this: RecipeAIdWorld) {
    // Assert: the toggle checkbox is checked after reload
    const isChecked = await this.page
      .getByRole("checkbox", { name: /dark theme/i })
      .isChecked();
    if (!isChecked)
      throw new Error("Expected dark theme toggle to be checked after reload");
  }
);

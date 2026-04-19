import { Given, When, Then } from "@cucumber/cucumber";
import type { RecipeAIdWorld } from "../support/world";
import type { DataTable } from "@cucumber/cucumber";

// ── Data seeding via API (no browser needed) ──────────────────────────────────

Given(
  "a recipe exists with title {string}",
  async function (this: RecipeAIdWorld, title: string) {
    const res = await fetch(`${this.backendUrl}/api/v1/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        instructions: null,
        bookTitle: null,
        ingredients: [],
      }),
    });
    if (!res.ok) throw new Error(`Failed to create recipe "${title}": ${res.status}`);
    const recipe = await res.json();
    this.lastCreatedRecipeId = recipe.id;
  }
);

Given(
  "a recipe exists with title {string} and ingredients:",
  async function (this: RecipeAIdWorld, title: string, dataTable: DataTable) {
    const ingredients = dataTable
      .hashes()
      .map((row: Record<string, string>, idx: number) => ({
        name: row["name"],
        amount: row["amount"] === "" ? null : row["amount"],
        unit: row["unit"] === "" ? null : row["unit"],
        sortOrder: idx,
      }));

    const res = await fetch(`${this.backendUrl}/api/v1/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        instructions: null,
        bookTitle: null,
        ingredients,
      }),
    });
    if (!res.ok) throw new Error(`Failed to create recipe "${title}": ${res.status}`);
    const recipe = await res.json();
    this.lastCreatedRecipeId = recipe.id;
  }
);

Given(
  "a recipe exists with title {string}, instructions {string}, and ingredients:",
  async function (this: RecipeAIdWorld, title: string, instructions: string, dataTable: DataTable) {
    const normalizedInstructions = instructions.replace(/\\n/g, "\n");
    const ingredients = dataTable
      .hashes()
      .map((row: Record<string, string>, idx: number) => ({
        name: row["name"],
        amount: row["amount"] === "" ? null : row["amount"],
        unit: row["unit"] === "" ? null : row["unit"],
        sortOrder: idx,
      }));

    const res = await fetch(`${this.backendUrl}/api/v1/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        instructions: normalizedInstructions,
        bookTitle: null,
        ingredients,
      }),
    });
    if (!res.ok) throw new Error(`Failed to create recipe "${title}": ${res.status}`);
    const recipe = await res.json();
    this.lastCreatedRecipeId = recipe.id;
  }
);

Given(
  "a recipe exists with title {string} and {int} servings and ingredients:",
  async function (this: RecipeAIdWorld, title: string, servings: number, dataTable: DataTable) {
    const ingredients = dataTable
      .hashes()
      .map((row: Record<string, string>, idx: number) => ({
        name: row["name"],
        amount: row["amount"] === "" ? null : row["amount"],
        unit: row["unit"] === "" ? null : row["unit"],
        sortOrder: idx,
      }));

    const res = await fetch(`${this.backendUrl}/api/v1/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        instructions: null,
        bookTitle: null,
        servings,
        ingredients,
      }),
    });
    if (!res.ok) throw new Error(`Failed to create recipe "${title}": ${res.status}`);
    const recipe = await res.json();
    this.lastCreatedRecipeId = recipe.id;
  }
);

// ── Navigation ────────────────────────────────────────────────────────────────

When("I navigate to the recipe list page", async function (this: RecipeAIdWorld) {
  await this.goto("/");
  await this.page.waitForSelector("h1");
});

When(
  "I navigate to the ingredient search page",
  async function (this: RecipeAIdWorld) {
    await this.goto("/search");
    await this.page.waitForSelector("h1");
  }
);

When("I navigate to the upload page", async function (this: RecipeAIdWorld) {
  await this.goto("/upload");
  await this.page.waitForSelector("h1");
});

When("I navigate to the add recipe page", async function (this: RecipeAIdWorld) {
  await this.goto("/add");
  await this.page.waitForSelector("h1");
});

When("I navigate to the planner page", async function (this: RecipeAIdWorld) {
  await this.goto("/planner");
  await this.page.waitForSelector("h1");
});

When(
  "I navigate to the detail page for {string}",
  async function (this: RecipeAIdWorld, title: string) {
    await this.goto("/");
    await this.page.waitForSelector("ul li");
    await this.page.getByText(title, { exact: true }).first().click();
    await this.page.waitForURL(/\/recipes\/\d+/);
    await this.page.waitForSelector("h1");
  }
);

// ── Common interactions ───────────────────────────────────────────────────────

When("I click {string}", async function (this: RecipeAIdWorld, text: string) {
  await this.page.getByRole("button", { name: text }).click();
});

When(
  "I click on {string}",
  async function (this: RecipeAIdWorld, text: string) {
    await this.page.getByText(text, { exact: true }).first().click();
  }
);

// ── Common assertions ─────────────────────────────────────────────────────────

Then(
  "I should be on the recipe list page",
  async function (this: RecipeAIdWorld) {
    await this.page.waitForURL((url) => new URL(url).pathname === "/");
    await this.page.waitForSelector("h1");
  }
);

Then(
  "I should be on the recipe detail page",
  async function (this: RecipeAIdWorld) {
    await this.page.waitForURL(/\/recipes\/\d+/);
  }
);

Then(
  "I should see the heading {string}",
  async function (this: RecipeAIdWorld, heading: string) {
    await this.page
      .locator("h1")
      .filter({ hasText: heading })
      .waitFor({ state: "visible" });
  }
);

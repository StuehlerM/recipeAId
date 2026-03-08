import { Given, When, Then } from "@cucumber/cucumber";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { RecipeAIdWorld } from "../support/world";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_IMAGES_DIR = resolve(__dirname, "../../../TestImages");

// Module-level to carry status across When/Then steps
let lastApiStatus = 0;

When(
  "I request the image for slot {string} via the API",
  async function (this: RecipeAIdWorld, slot: string) {
    const id = this.lastCreatedRecipeId;
    if (id === undefined) throw new Error("No recipe ID — run a Given step first");
    const res = await fetch(`${this.backendUrl}/api/v1/recipes/${id}/images/${slot}`);
    lastApiStatus = res.status;
  }
);

Then(
  "the API response status is {int}",
  function (_expectedStatus: number) {
    if (lastApiStatus !== _expectedStatus) {
      throw new Error(`Expected HTTP ${_expectedStatus} but got ${lastApiStatus}`);
    }
  }
);

Given(
  "I store a test image for slot {string} of that recipe",
  async function (this: RecipeAIdWorld, slot: string) {
    const id = this.lastCreatedRecipeId;
    if (id === undefined) throw new Error("No recipe ID set");

    const imagePath = resolve(TEST_IMAGES_DIR, "testImage.jpg");
    const imageData = readFileSync(imagePath);
    const blob = new Blob([imageData], { type: "image/jpeg" });

    const form = new FormData();
    form.append("image", blob, "testImage.jpg");

    const res = await fetch(`${this.backendUrl}/api/v1/recipes/${id}/images/${slot}`, {
      method: "PUT",
      body: form,
    });
    if (!res.ok) throw new Error(`Failed to store image: ${res.status}`);
  }
);

When(
  "I navigate to the recipe detail page",
  async function (this: RecipeAIdWorld) {
    const id = this.lastCreatedRecipeId;
    if (id === undefined) throw new Error("No recipe ID set");
    await this.goto(`/recipes/${id}`);
    await this.page.waitForSelector("h1");
  }
);

Then(
  "an image is visible on the page",
  async function (this: RecipeAIdWorld) {
    await this.page.waitForFunction(
      () => {
        const imgs = Array.from(document.querySelectorAll("img"));
        return imgs.some((img) => img.naturalWidth > 0 && img.style.display !== "none");
      },
      { timeout: 5000 }
    );
  }
);

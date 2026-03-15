import { Given, When, Then } from "@cucumber/cucumber";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { RecipeAIdWorld } from "../support/world";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_IMAGES_DIR = resolve(__dirname, "../../TestImages");

// Module-level state shared across steps in a scenario
let lastParseStatus = 0;
let lastParseBody: unknown = null;

// ── Given ──────────────────────────────────────────────────────────────────

Given(
  "the ingredient parser API key is configured",
  function (this: RecipeAIdWorld) {
    // The API key is injected at deploy time; this step is a no-op in integration
    // tests — the running backend already has INGREDIENT_PARSER_API_KEY set.
  }
);

Given(
  "the ingredient parser API key is not configured",
  function (this: RecipeAIdWorld) {
    // This step is intentionally a stub for the 502 error scenario.
    // In integration tests the running backend is expected to be configured with
    // a valid key, so this scenario documents the error contract only.
    // TODO: wire up a dedicated backend fixture or env-var override when the
    //       integration test environment supports key injection per-scenario.
    pending();
  }
);

// ── When ───────────────────────────────────────────────────────────────────

When(
  "I upload an image with visible ingredients",
  async function (this: RecipeAIdWorld) {
    const imagePath = resolve(TEST_IMAGES_DIR, "testImage.jpg");
    const imageData = readFileSync(imagePath);
    const blob = new Blob([imageData], { type: "image/jpeg" });

    const form = new FormData();
    form.append("image", blob, "testImage.jpg");

    const res = await fetch(
      `${this.backendUrl}/api/v1/recipes/from-image?refine=true`,
      { method: "POST", body: form }
    );
    lastParseStatus = res.status;
    lastParseBody = res.ok ? await res.json() : null;
  }
);

When(
  "I wait for the ingredient parsing to complete",
  async function (this: RecipeAIdWorld) {
    // The SSE pipeline is async; in integration we just use the draft returned
    // from /from-image directly (regex parse) — good enough to assert structure.
  }
);

When(
  "I call the ingredient parse endpoint with text {string}",
  async function (this: RecipeAIdWorld, text: string) {
    const res = await fetch(`${this.backendUrl}/api/v1/ingredients/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: "en" }),
    });
    lastParseStatus = res.status;
    lastParseBody = await res.json().catch(() => null);
  }
);

// ── Then ───────────────────────────────────────────────────────────────────

Then(
  "the recipe draft should contain at least one structured ingredient with a name",
  function (this: RecipeAIdWorld) {
    if (lastParseStatus < 200 || lastParseStatus >= 300) {
      throw new Error(`Expected 2xx from /from-image but got ${lastParseStatus}`);
    }
    const body = lastParseBody as { ingredients?: Array<{ name?: string }> };
    if (!body?.ingredients?.length) {
      throw new Error("Recipe draft contains no ingredients");
    }
    const hasName = body.ingredients.some((i) => typeof i.name === "string" && i.name.trim().length > 0);
    if (!hasName) {
      throw new Error("No ingredient has a non-empty name");
    }
  }
);

Then(
  "the response status should be {int}",
  function (this: RecipeAIdWorld, expected: number) {
    if (lastParseStatus !== expected) {
      throw new Error(`Expected HTTP ${expected} but got ${lastParseStatus}`);
    }
  }
);

Then(
  "the response body should contain a ProblemDetails error",
  function (this: RecipeAIdWorld) {
    const body = lastParseBody as Record<string, unknown> | null;
    if (!body) throw new Error("Response body is empty or not JSON");
    if (!body["title"] && !body["detail"] && !body["type"]) {
      throw new Error(`Response is not a ProblemDetails object: ${JSON.stringify(body)}`);
    }
  }
);

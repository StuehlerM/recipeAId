// Minimal Open Food Facts API mock for integration tests.
// Intercepts GET /api/v2/search?q=<ingredient>&... and returns fixed
// nutriment payloads for the ingredients used in the BDD recipe
// ("whole chicken", "lemon", "garlic").  Any unknown ingredient gets
// an empty products list (treated as "not found" by OpenFoodFactsClient).
import { createServer } from "node:http";
import { parse as parseQuery } from "node:querystring";
import { URL } from "node:url";

// Per-100g nutriment data keyed by normalised ingredient name.
const NUTRIMENTS = {
  "whole chicken": {
    proteins_100g: 27.0,
    carbohydrates_100g: 0.0,
    fat_100g: 14.0,
    fiber_100g: 0.0,
  },
  lemon: {
    proteins_100g: 1.1,
    carbohydrates_100g: 9.3,
    fat_100g: 0.3,
    fiber_100g: 2.8,
  },
  garlic: {
    proteins_100g: 6.4,
    carbohydrates_100g: 33.1,
    fat_100g: 0.5,
    fiber_100g: 2.1,
  },
};

function buildResponse(query) {
  const key = (query || "").toLowerCase().trim();
  const nutriments = NUTRIMENTS[key];
  return JSON.stringify(
    nutriments
      ? { count: 1, products: [{ nutriments }] }
      : { count: 0, products: [] }
  );
}

const server = createServer((req, res) => {
  const parsed = new URL(req.url, "http://localhost");
  if (req.method === "GET" && parsed.pathname === "/api/v2/search") {
    const q = parsed.searchParams.get("q") ?? "";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(buildResponse(q));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000, () => console.log("mock-off listening on :3000"));

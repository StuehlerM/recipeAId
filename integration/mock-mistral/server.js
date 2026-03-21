// Minimal Mistral API mock for integration tests.
// Accepts:
// - POST /v1/ocr
// - POST /v1/chat/completions
// and returns fixed valid payloads so BDD tests verify our wiring without
// hitting the real Mistral API.
import { createServer } from "node:http";

const FIXED_INGREDIENTS = JSON.stringify([
  { name: "flour",  amount: "2",   unit: "cups" },
  { name: "sugar",  amount: "100", unit: "g"    },
]);

const OCR_RESPONSE_BODY = JSON.stringify({
  pages: [
    {
      markdown: "Test Recipe\nIngredients:\n2 cups flour\n100 g sugar\nInstructions:\nMix well.",
    },
  ],
});

const RESPONSE_BODY = JSON.stringify({
  id: "mock-response",
  choices: [
    {
      message: { role: "assistant", content: FIXED_INGREDIENTS },
      finish_reason: "stop",
    },
  ],
});

const server = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/v1/ocr") {
    // Drain the request body before responding to avoid buffering issues.
    req.on("data", () => {});
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(OCR_RESPONSE_BODY);
    });
  } else if (req.method === "POST" && req.url === "/v1/chat/completions") {
    // Drain the request body before responding to avoid buffering issues.
    req.on("data", () => {});
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(RESPONSE_BODY);
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000, () => console.log("mock-mistral listening on :3000"));

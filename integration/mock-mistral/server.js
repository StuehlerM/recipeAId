// Minimal Mistral API mock for integration tests.
// Accepts POST /v1/chat/completions and returns a fixed valid ingredient list,
// regardless of input — so BDD tests verify our system's wiring without hitting
// the real Mistral API.
import { createServer } from "node:http";

const FIXED_INGREDIENTS = JSON.stringify([
  { name: "flour",  amount: "2",   unit: "cups" },
  { name: "sugar",  amount: "100", unit: "g"    },
]);

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
  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(RESPONSE_BODY);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000, () => console.log("mock-mistral listening on :3000"));

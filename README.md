# recipeAId

A recipe management app that reads physical recipe cards with your camera. Point your phone at a recipe card, and the OCR pipeline extracts the title, ingredients, and instructions into a searchable database.

---

## Features

- **Scan recipe cards** — fullscreen camera overlay with guide frame, blur/shadow warnings, and a level indicator; crop, then OCR extracts title, ingredients, and instructions automatically (English + German)
- **Review before saving** — OCR result comes back as an editable draft
- **4-step recipe wizard** — add recipes manually: Title → Ingredients → Instructions → Book; OCR capture available at every step
- **Browse & search** — filter by title or cookbook; search by the ingredients you have on hand (ranked by match count)
- **Weekly planner** — select recipes for the week; shopping list generated with quantities summed across recipes
- **Dark theme** — toggle in Settings; persisted via localStorage
- **PWA / mobile-first** — installable on iOS and Android; bottom tab bar with safe-area support

---

## Quick start (Docker)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

Requires a [Mistral AI API key](https://console.mistral.ai/) for Mistral-backed features. Use the same key for both text (ingredient parsing) and OCR endpoints; this project configures it as `INGREDIENT_PARSER_API_KEY`.

```bash
git clone https://github.com/StuehlerM/recipeAId.git
cd recipeAId
INGREDIENT_PARSER_API_KEY=<your-key> docker compose up --build
```

> **First build takes a few minutes** — the OCR image downloads PaddlePaddle and PaddleOCR models on first startup. Subsequent builds are fast.

| Service  | URL |
|----------|-----|
| Frontend | https://localhost |
| Backend  | http://localhost:8080 |
| OCR      | http://localhost:8001 (Swagger at `/docs`) |

> **Self-signed cert:** Accept the browser warning once (Advanced → Proceed / Show Details → visit this website on iOS).

```bash
docker compose down      # stop, keep database
docker compose down -v   # stop and wipe database
```

---

## Manual setup (development)

### Prerequisites

| Tool | Version |
|------|---------|
| .NET SDK | 9.0+ |
| Node.js  | 24+   |
| Python   | 3.10+ |

### 1. OCR sidecar

```bash
cd ocr-service
pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
pip install -r requirements.txt
uvicorn main:app --port 8001
```

### 2. Backend API

```bash
cd backend
dotnet user-secrets set "INGREDIENT_PARSER_API_KEY" "<your-key>" --project src/RecipeAId.Api
dotnet run --project src/RecipeAId.Api
```

Interactive API explorer at `http://localhost:<port>/scalar/v1`.

### 3. Frontend

```bash
cd frontend
echo "VITE_API_BASE_URL=http://localhost:<port>" > .env.local
npm install
npm run dev
```

Open https://localhost:5173 (accept the self-signed cert once). Without `VITE_API_BASE_URL` the frontend runs on built-in mock data.

---

## Further reading

- **[Architecture, API reference, data model, Docker details](docs/architecture.md)**
- **[Backend](backend/CLAUDE.md)** · **[Frontend](frontend/CLAUDE.md)** · **[OCR sidecar](ocr-service/CLAUDE.md)** · **[Integration tests](integration/CLAUDE.md)**
- **[Architecture Decision Records](docs/adr/)**

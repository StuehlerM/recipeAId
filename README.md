# recipeAId

A recipe management app that reads physical recipe cards with your camera. Point your phone at a recipe card, and the OCR pipeline extracts the title, ingredients, and instructions into a searchable database. Later, search by title or by the ingredients you actually have in the kitchen.

---

## Features

- **Scan recipe cards** — upload a photo or use your phone camera; OCR extracts title, ingredients, and instructions automatically
- **Review before saving** — the OCR result comes back as a draft you can edit before confirming
- **Browse & search** — filter recipes by title or search by the ingredients you have on hand (ranked by match count)
- **Unit conversion** — convert quantities between imperial and metric (cups → mL, oz → g, °F → °C, and more)
- **Full CRUD** — create, edit, and delete recipes manually if you prefer to type

---

## Quick start (Docker)

The easiest way to run the whole stack is Docker Compose. You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

```bash
git clone https://github.com/StuehlerM/recipeAId.git
cd recipeAId
docker compose up --build
```

> **First build takes a few minutes** — the OCR image downloads the ~200 MB EasyOCR model and bakes it into the image layer. Subsequent builds are fast thanks to Docker's cache.

Once running:

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000  |
| Backend  | http://localhost:8080  |
| OCR      | http://localhost:8001  |

To stop:

```bash
docker compose down          # stop containers, keep database
docker compose down -v       # stop containers AND wipe the database
```

---

## Manual setup (development)

Run each service individually when you want hot-reload and the interactive API explorer.

### Prerequisites

| Tool | Version |
|------|---------|
| .NET SDK | 9.0+ |
| Node.js | 24+ |
| Python | 3.10+ |

### 1. OCR sidecar

```bash
cd ocr-service
pip install -r requirements.txt   # downloads ~200 MB EasyOCR model on first run
uvicorn main:app --port 8001
```

The sidecar must be running for the upload feature to work.

### 2. Backend API

```bash
cd backend
dotnet run --project src/RecipeAId.Api
```

The SQLite database is created automatically on first run. The interactive API explorer is available at `http://localhost:<port>/scalar/v1`.

### 3. Frontend

```bash
cd frontend

# Create a .env.local pointing at your local backend
echo "VITE_API_BASE_URL=http://localhost:<port>" > .env.local

npm install
npm run dev
```

Open http://localhost:5173. Without `VITE_API_BASE_URL` set, the frontend runs entirely on built-in mock data — useful for UI work without a backend.

---

## Project structure

```
recipeaid/
├── docker-compose.yml
├── ocr-service/           # Python FastAPI + EasyOCR (port 8001)
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── backend/               # ASP.NET Core 9 Web API
│   ├── RecipeAId.sln
│   ├── src/
│   │   ├── RecipeAId.Core/    # Entities, interfaces, DTOs, business logic
│   │   ├── RecipeAId.Data/    # EF Core + SQLite, repositories, migrations
│   │   └── RecipeAId.Api/     # Controllers, OCR services, middleware
│   ├── tests/
│   │   └── RecipeAId.Tests/   # xUnit + Moq
│   └── Dockerfile
└── frontend/              # React 19 + Vite 7 + TypeScript
    ├── src/
    │   ├── api/               # client.ts, types.ts, mockData.ts
    │   ├── components/
    │   └── pages/             # RecipeList, RecipeDetail, IngredientSearch, Upload
    └── Dockerfile
```

---

## API reference

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/v1/recipes` | List recipes; optional `?q=` title filter |
| `GET` | `/api/v1/recipes/{id}` | Single recipe with ingredients |
| `POST` | `/api/v1/recipes` | Create recipe (JSON body) |
| `PUT` | `/api/v1/recipes/{id}` | Update recipe |
| `DELETE` | `/api/v1/recipes/{id}` | Delete recipe |
| `POST` | `/api/v1/recipes/from-image` | Upload image → returns OCR draft (does **not** save) |
| `GET` | `/api/v1/recipes/search/by-ingredients` | Ranked search by ingredients (`?ingredients=egg,flour&minMatch=1`) |
| `GET` | `/api/v1/ingredients` | All known ingredients (for autocomplete) |
| `POST` | `/api/v1/convert` | Convert a quantity (`{ "value": "2 cups", "toUnit": "ml" }`) |

The interactive Scalar explorer (`/scalar/v1`) is available in Development mode and lets you try every endpoint in the browser.

---

## Running tests

```bash
cd backend
dotnet test
```

Tests live in `RecipeAId.Tests` and cover all service and business logic. They reference `RecipeAId.Core` only — no database or HTTP required.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript, TanStack Query v5, React Router v6 |
| Backend | ASP.NET Core 9, Entity Framework Core 9, SQLite |
| OCR | Python 3.11, EasyOCR, FastAPI, uvicorn |
| Container | Docker Compose (three services) |

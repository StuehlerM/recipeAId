import { BeforeAll, AfterAll, Before, After, setDefaultTimeout } from "@cucumber/cucumber";
import { chromium } from "playwright";
import type { Browser } from "playwright";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, rmSync } from "node:fs";
import type { RecipeAIdWorld } from "./world";

setDefaultTimeout(60_000);

// ── Config ────────────────────────────────────────────────────────────────────

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5228";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

// Set SPAWN_SERVERS=false in Docker — services are already running as containers
const SPAWN_SERVERS = process.env.SPAWN_SERVERS !== "false";

// ── Paths (only used when SPAWN_SERVERS=true) ─────────────────────────────────

// __dirname is available natively in CommonJS
const ROOT = resolve(__dirname, "../../../");
const BACKEND_DIR = resolve(ROOT, "backend");
const FRONTEND_DIR = resolve(ROOT, "frontend");
const API_PROJECT = resolve(BACKEND_DIR, "src/RecipeAId.Api/RecipeAId.Api.csproj");
const TEST_DB = resolve(BACKEND_DIR, "src/RecipeAId.Api/recipeaid-test.db");

// ── State ─────────────────────────────────────────────────────────────────────

let backendProc: ChildProcess | null = null;
let frontendProc: ChildProcess | null = null;
let sharedBrowser: Browser | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForUrl(url: string, timeoutMs = 45_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${url} to become available`);
}

function spawnProc(
  cmd: string,
  args: string[],
  cwd: string,
  env?: NodeJS.ProcessEnv
): ChildProcess {
  const proc = spawn(cmd, args, {
    cwd,
    shell: true,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout?.on("data", (d: Buffer) => process.stdout.write(`[${cmd}] ${d}`));
  proc.stderr?.on("data", (d: Buffer) => process.stderr.write(`[${cmd}] ${d}`));
  return proc;
}

function killProc(proc: ChildProcess | null): void {
  if (!proc) return;
  proc.kill("SIGTERM");
  if (process.platform === "win32" && proc.pid) {
    spawn("taskkill", ["/F", "/T", "/PID", String(proc.pid)], { shell: true });
  }
}

// ── Global lifecycle ──────────────────────────────────────────────────────────

BeforeAll(async function () {
  if (SPAWN_SERVERS) {
    // Local dev: start backend and frontend as child processes
    if (existsSync(TEST_DB)) rmSync(TEST_DB);

    backendProc = spawnProc(
      "dotnet",
      ["run", "--project", API_PROJECT, "--no-launch-profile"],
      BACKEND_DIR,
      {
        ASPNETCORE_ENVIRONMENT: "Development",
        ASPNETCORE_URLS: BACKEND_URL,
        ConnectionStrings__DefaultConnection: `Data Source=${TEST_DB}`,
      }
    );
    await waitForUrl(`${BACKEND_URL}/openapi/v1.json`);

    frontendProc = spawnProc(
      "npm",
      ["run", "dev", "--", "--port", "5173", "--strictPort"],
      FRONTEND_DIR,
      { VITE_API_BASE_URL: BACKEND_URL }
    );
    await waitForUrl(FRONTEND_URL);
  }
  // In Docker (SPAWN_SERVERS=false), services are healthy before this container starts.
  // A brief confirmation ping is still useful to surface misconfigurations early.
  else {
    await waitForUrl(`${BACKEND_URL}/openapi/v1.json`, 10_000);
    await waitForUrl(FRONTEND_URL, 10_000);
  }

  sharedBrowser = await chromium.launch({
    headless: process.env.PWDEBUG !== "1",
    // --no-sandbox is required when running as root inside a Docker container
    args: SPAWN_SERVERS ? [] : ["--no-sandbox", "--disable-setuid-sandbox"],
  });
});

AfterAll(async function () {
  await sharedBrowser?.close();
  if (SPAWN_SERVERS) {
    killProc(frontendProc);
    killProc(backendProc);
  }
});

// ── Per-scenario lifecycle ────────────────────────────────────────────────────

Before(async function (this: RecipeAIdWorld) {
  this.browser = sharedBrowser!;
  this.context = await this.browser.newContext({
    baseURL: FRONTEND_URL,
    viewport: { width: 1280, height: 720 },
  });
  this.page = await this.context.newPage();
});

After(async function (this: RecipeAIdWorld) {
  await this.page?.close();
  await this.context?.close();
});

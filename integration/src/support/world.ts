import { World, setWorldConstructor } from "@cucumber/cucumber";
import type { IWorldOptions } from "@cucumber/cucumber";
import type { Browser, BrowserContext, Page } from "playwright";

export interface WorldParameters {
  frontendUrl: string;
  backendUrl: string;
}

export class RecipeAIdWorld extends World<WorldParameters> {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  lastCreatedRecipeId?: number;

  constructor(options: IWorldOptions<WorldParameters>) {
    super(options);
  }

  get frontendUrl(): string {
    return this.parameters.frontendUrl;
  }

  get backendUrl(): string {
    return this.parameters.backendUrl;
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(`${this.frontendUrl}${path}`);
  }
}

setWorldConstructor(RecipeAIdWorld);

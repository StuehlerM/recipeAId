/**
 * Unit tests for theme storage utilities (Issue #20 — dark theme toggle)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  THEME_STORAGE_KEY,
  getStoredTheme,
  setStoredTheme,
} from "../themeStorage";

describe("themeStorage — localStorage persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset html class list between tests
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getStoredTheme returns 'light' when localStorage has no entry", () => {
    // Arrange: localStorage is empty (cleared in beforeEach)

    // Act
    const theme = getStoredTheme();

    // Assert
    expect(theme).toBe("light");
  });

  it("getStoredTheme returns 'dark' when localStorage key is 'dark'", () => {
    // Arrange
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    // Act
    const theme = getStoredTheme();

    // Assert
    expect(theme).toBe("dark");
  });

  it("setStoredTheme writes the value to localStorage", () => {
    // Arrange: nothing in localStorage

    // Act
    setStoredTheme("dark");

    // Assert
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("setStoredTheme overwrites an existing value", () => {
    // Arrange
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    // Act
    setStoredTheme("light");

    // Assert
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("setStoredTheme adds 'dark' class to <html> when theme is dark", () => {
    // Arrange: no dark class on html

    // Act
    setStoredTheme("dark");

    // Assert
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("setStoredTheme removes 'dark' class from <html> when theme is light", () => {
    // Arrange: start with dark class
    document.documentElement.classList.add("dark");

    // Act
    setStoredTheme("light");

    // Assert
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

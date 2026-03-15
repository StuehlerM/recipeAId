/**
 * Unit tests for ThemeContext (Issue #20 — dark theme toggle)
 *
 * These tests are intentionally FAILING — ThemeContext does not exist yet.
 * Implement src/features/settings/ThemeContext.tsx to make them pass.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ThemeContext does not exist yet — this import will cause a compile/runtime error
// until the implementation is written.
import {
  THEME_STORAGE_KEY,
  getStoredTheme,
  setStoredTheme,
} from "../ThemeContext";

describe("ThemeContext — localStorage persistence", () => {
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

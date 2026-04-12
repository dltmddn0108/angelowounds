import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------

test.describe("Landing page", () => {
  test("shows the app title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Obsidian Auto-Linker");
  });

  test("'보관함 연결하기' button is disabled when no API key is set", async ({
    page,
  }) => {
    await page.goto("/");

    const link = page.locator("a", { hasText: "보관함 연결하기" });
    await expect(link).toBeVisible();

    // The button gets `pointer-events-none opacity-50` when keyStored or
    // supported is falsy. In headless Chromium the FSA API is supported, but
    // no API key is stored, so the link should still be effectively disabled.
    await expect(link).toHaveClass(/opacity-50/);
    await expect(link).toHaveClass(/pointer-events-none/);
  });

  test("shows unsupported-browser warning when FSA API is absent", async ({
    page,
  }) => {
    // Remove `showDirectoryPicker` from the window to simulate Firefox/Safari.
    await page.addInitScript(() => {
      Object.defineProperty(window, "showDirectoryPicker", {
        value: undefined,
        writable: false,
      });
    });

    await page.goto("/");

    const warning = page.locator("text=이 브라우저는 아직 지원되지 않습니다");
    await expect(warning).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Vault page
// ---------------------------------------------------------------------------

test.describe("Vault page", () => {
  test("loads and shows the page heading", async ({ page }) => {
    await page.goto("/vault");

    await expect(page.locator("h1")).toContainText("보관함 스캔");
  });
});

// ---------------------------------------------------------------------------
// Review page
// ---------------------------------------------------------------------------

test.describe("Review page", () => {
  test("loads and shows empty state message", async ({ page }) => {
    await page.goto("/review");

    // When no vault is connected the review page shows this prompt.
    const emptyState = page.locator("text=보관함 연결이 필요합니다");
    await expect(emptyState).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

test.describe("Settings page", () => {
  test("loads and shows the model selector", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.locator("h1")).toContainText("설정");

    // The model selector label
    const modelLabel = page.locator("text=모델");
    await expect(modelLabel).toBeVisible();

    // The <select> element should contain at least one Claude model option
    const select = page.locator("select");
    await expect(select).toBeVisible();
    await expect(select.locator("option").first()).toContainText("claude-");
  });
});

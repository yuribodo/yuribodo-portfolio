import { expect, test, type Page } from "@playwright/test";

/** Exercise WebGL under software rendering without weakening the real
 * production GPU gate. This verifies behavior, never hardware performance. */
async function allowSoftwareRenderer(page: Page) {
  if (process.env.PLAYWRIGHT_HARDWARE_GPU === "1") return;
  await page.addInitScript(() => {
    for (const Context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const getParameter = Context.prototype.getParameter;
      Context.prototype.getParameter = function (parameter: number) {
        return parameter === 0x9246 ? "Browser integration test" : getParameter.call(this, parameter);
      };
    }
  });
}

async function openDesk(page: Page) {
  await allowSoftwareRenderer(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-lobby-state]" )).toHaveAttribute("data-lobby-state", "idle");
  await expect(page.getByRole("button", { name: "Look around", exact: true })).toBeEnabled();
}

test("look around with keyboard and drag, return focus, and enter from the rear", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openDesk(page);
  const lobby = page.locator("[data-lobby-active]");
  await page.getByRole("button", { name: "Look around", exact: true }).click();
  await expect(lobby).toHaveAttribute("data-world-view", "looking");
  for (let i = 0; i < 9; i++) await page.keyboard.press("ArrowRight");
  await page.screenshot({ path: test.info().outputPath("rear-view.png") });
  await page.keyboard.press("Escape");
  await expect(lobby).toHaveAttribute("data-world-view", "desk");
  await expect(page.getByRole("button", { name: "Look around", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Look around", exact: true }).click();
  await page.mouse.move(850, 280);
  await page.mouse.down();
  await page.mouse.move(350, 400, { steps: 3 });
  await page.mouse.up();
  await expect(lobby).toHaveAttribute("data-world-view", "looking");
  // Observe the short return phase in-page. A slow software-rendered frame
  // can complete it before Playwright's next cross-process locator poll.
  await page.evaluate(() => {
    const element = document.querySelector("[data-lobby-active]")!;
    const history: { view: string | null; state: string | null; disabled: boolean }[] = [];
    (window as typeof window & { lobbyEntryHistory: typeof history }).lobbyEntryHistory = history;
    const observer = new MutationObserver(() => {
      history.push({ view: element.getAttribute("data-world-view"), state: element.getAttribute("data-lobby-state"),
        disabled: !!Array.from(element.querySelectorAll("button")).find((button) => button.textContent?.startsWith("Enter portfolio") && !button.textContent?.includes("main action"))?.disabled });
    });
    observer.observe(element, { attributes: true, subtree: true, attributeFilter: ["data-world-view", "data-lobby-state", "disabled"] });
  });
  await page.getByRole("button", { name: "Enter portfolio", exact: true }).click();
  await expect(lobby).toHaveCount(0);
  const history = await page.evaluate(() => (window as typeof window & {
    lobbyEntryHistory: { view: string | null; state: string | null; disabled: boolean }[];
  }).lobbyEntryHistory);
  const returning = history.findIndex((entry) => entry.view === "returning");
  const booting = history.findIndex((entry) => entry.state === "booting");
  expect(returning).toBeGreaterThanOrEqual(0);
  expect(history[returning].disabled).toBe(true);
  expect(booting).toBeGreaterThan(returning);
  expect(errors).toEqual([]);
});

test("desk objects remain keyboard accessible and the actual monitor still enters", async ({ page }) => {
  await openDesk(page);
  for (const name of ["Pulse Nintendo DS screen", "Vibrate Xbox controller", "Fan out Pokémon deck", "Fan out Yu-Gi-Oh deck", "Spin anime figure trio", "Spin Pegasus beyblade"]) {
    const button = page.getByRole("button", { name, exact: true });
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
  }
  const sound = page.getByRole("button", { name: "Toggle sound", exact: true });
  const before = await sound.getAttribute("aria-pressed");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
  // Click the real screen mesh in the seated desk composition.
  await page.mouse.move(500, 424);
  await expect(page.locator("[data-lobby-active]")).toHaveAttribute("data-lobby-cursor", "pointer");
  await page.mouse.click(500, 424);
  await expect(page.locator("[data-lobby-active]")).toHaveCount(0);
});

test("readiness follows desk assets, while skip remains usable", async ({ page }) => {
  await allowSoftwareRenderer(page);
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/lobby/models/wooden_desk.glb", async (route) => {
    await pending;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-lobby-state]")).toHaveAttribute("data-lobby-state", "loading");
  await page.waitForTimeout(1200); // Regression: the old 600ms timer revealed an empty scene.
  await expect(page.locator("[data-lobby-state]")).toHaveAttribute("data-lobby-state", "loading");
  await expect(page.getByRole("button", { name: "Look around", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Skip to portfolio", exact: true }).click();
  await expect(page.locator("[data-lobby-active]")).toHaveCount(0);
  release?.();
});

test("missing authored world assets do not block desk entry", async ({ page }) => {
  await page.route(/\/lobby\/world\/(sky-citadel(?:-v2)?|chess-monuments|geological-island|ruins-kit|nature-kit|coastal-cliff)\.glb/, (route) => route.abort());
  await page.route("**/lobby/world/paving-*.webp", (route) => route.abort());
  await openDesk(page);
  await page.getByRole("button", { name: "Enter portfolio", exact: true }).click();
  await expect(page.locator("[data-lobby-active]")).toHaveCount(0);
});

test("reduced motion bypasses world assets", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const worldRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/lobby/world/")) worldRequests.push(request.url()); });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.locator("[data-lobby-active]")).toHaveCount(0);
  expect(worldRequests).toEqual([]);
});

test("mobile uses the existing portfolio without the 3D bundle", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  const worldRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/lobby/world/")) worldRequests.push(request.url()); });
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  // Let the existing 2D loading/hero entrance finish before its visual capture.
  await page.waitForTimeout(6000);
  await expect(page.locator("[data-lobby-active]")).toHaveCount(0);
  expect(worldRequests).toEqual([]);
  await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
  await page.screenshot({ path: test.info().outputPath("mobile.png") });
  await context.close();
});

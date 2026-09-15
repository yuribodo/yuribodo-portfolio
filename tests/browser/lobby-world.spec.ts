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
  await expect(page.getByRole("button", { name: "Enter portfolio", exact: true })).toBeEnabled();
}

test("first release stays at the desk after arrow keys and dragging, then enters directly", async ({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await openDesk(page);
 await expect(page.getByRole('button',{name:/Look around|Look left|Look right|Back to desk/})).toHaveCount(0);
 await page.locator('[data-lobby-active]').focus();
 for(let i=0;i<8;i++)await page.keyboard.press('ArrowRight');
 await page.mouse.move(850,280);await page.mouse.down();await page.mouse.move(350,280,{steps:8});await page.mouse.up();
 await expect(page.locator('[data-world-view]')).toHaveAttribute('data-world-view','desk');
 await page.mouse.move(500,424);
 await expect(page.locator('[data-lobby-active]')).toHaveAttribute('data-lobby-cursor','pointer');
 await page.getByRole('button',{name:'Enter portfolio',exact:true}).click();
 await expect(page.locator('[data-lobby-active]')).toHaveCount(0);
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
  await expect(page.getByRole("button", { name: "Look around", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Skip to portfolio", exact: true }).click();
  await expect(page.locator("[data-lobby-active]")).toHaveCount(0);
  release?.();
});

test("missing authored world assets do not block desk entry", async ({ page }) => {
  await page.route("**/lobby/world/cloud-volume-*.bin.gz", route => route.abort());
  await page.route(/\/lobby\/world\/canopy-[^/]+\.webp/, route => route.abort());
  await page.route(/\/lobby\/world\/(sky-citadel(?:-v2)?|chess-monuments|academy-sanctuary|geological-island|ruins-kit|nature-kit|valley-nature|valley-village|organic-[a-z0-9_]+|dragon-flying|wildlife-(?:deer|stag|dragon)|living-mill|natural-vegetation|meadow-flowers|coastal-cliff)\.glb/, (route) => route.abort());
  await page.route(/\/lobby\/world\/(limestone|foliage|earth-[a-z]+|soil-[a-z]+|meadow-[a-z]+|rock-face-(?:color|detail|normal)|paving-[a-z]+)\.webp/, (route) => route.abort());
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

// The landscape must survive without either former flat valley painting.
test("the procedural world does not load flat landscape or sky backdrops", async ({ page }) => {
  const flatLandscapes: string[] = [];
  page.on("request", request => {
    if (/\/(front-landscape|rear-landscape|skybound-panorama|sky-only-panorama|cloud)\.webp/.test(request.url())) flatLandscapes.push(request.url());
  });
  await openDesk(page);
  expect(flatLandscapes).toEqual([]);
});

test('covered artwork pauses, hidden world stops rendering, and both resume', async ({ page }) => {
  await page.addInitScript(() => {
    const stats = { heroPaints: 0, draws: 0 };
    Object.assign(window, { animationStats: stats });
    const paint = CanvasRenderingContext2D.prototype.putImageData;
    CanvasRenderingContext2D.prototype.putImageData = function (...args: [ImageData, number, number] | [ImageData, number, number, number, number, number, number]) {
      if (this.canvas.closest('main')) stats.heroPaints++;
      return Reflect.apply(paint, this, args);
    };
    const draw = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args: Parameters<typeof draw>) {
      stats.draws++;
      return draw.apply(this, args);
    };
  });
  await openDesk(page);
  await page.waitForTimeout(1000);
  const stats = () => page.evaluate(() => (window as unknown as { animationStats: { heroPaints: number; draws: number } }).animationStats);
  const before = await stats();
  await page.waitForTimeout(600);
  expect((await stats()).heroPaints).toBe(before.heroPaints);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(200);
  const hidden = await stats();
  await page.waitForTimeout(600);
  expect((await stats()).draws).toBe(hidden.draws);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await stats()).draws).toBeGreaterThan(hidden.draws);
  await page.getByRole('button', { name: 'Enter portfolio', exact: true }).click();
  await expect(page.locator('[data-lobby-active]')).toHaveCount(0);
  await expect.poll(async () => (await stats()).heroPaints).toBeGreaterThan(before.heroPaints);
});

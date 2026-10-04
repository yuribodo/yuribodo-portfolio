import { expect, test, type Page } from "@playwright/test";

/** Exercise WebGL under software rendering without weakening the real
 * production GPU gate. This verifies behavior, never hardware performance. */
/** The reveal now waits for the whole world (or its 12 s patience cap), and software GL is slow at it. */
const WORLD_READY_TIMEOUT = 90_000;

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
  await expect(page.locator("[data-lobby-state]" )).toHaveAttribute("data-lobby-state", "idle", { timeout: WORLD_READY_TIMEOUT });
  await expect(page.getByRole("button", { name: "Enter portfolio", exact: true })).toBeEnabled();
}

test("the monitor reveals a waiting Hero and releases the page after the crossfade", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await openDesk(page);
  const characters = page.locator("[data-hero-char]");
  const firstCharacter = characters.first();
  await expect(firstCharacter).toHaveCSS("opacity", "0");
  // The former entrance finished behind the desk on a mount-time delay.
  await page.waitForTimeout(3000);
  await expect(firstCharacter).toHaveCSS("opacity", "0");
  await page.mouse.move(500, 424);
  await expect(page.locator("[data-lobby-active]")).toHaveAttribute("data-lobby-cursor", "pointer");
  // Observe the actual reveal, including whether it happens while covered.
  await page.evaluate(() => {
    const samples: { revealing: boolean; opacity: number; characterOpacity: number }[] = [];
    Object.assign(window, { handoffSamples: samples });
    const sample = () => {
      const lobby = document.querySelector<HTMLElement>("[data-lobby-active]");
      if (!lobby) return;
      samples.push({
        revealing: lobby.dataset.lobbyRevealing === "true",
        opacity: Number(getComputedStyle(lobby).opacity),
        characterOpacity: Number(getComputedStyle(document.querySelector("[data-hero-char]")!).opacity),
      });
      requestAnimationFrame(sample);
    };
    sample();
  });
  await page.mouse.click(500, 424);
  await expect(page.locator("[data-lobby-active]")).toHaveCount(0);
  await expect(characters.last()).toHaveCSS("opacity", "1");
  const samples = await page.evaluate(() => (window as unknown as {
    handoffSamples: { revealing: boolean; opacity: number; characterOpacity: number }[];
  }).handoffSamples);
  expect(samples.some(sample => sample.revealing && sample.opacity > 0 && sample.opacity < 1)).toBe(true);
  expect(samples.filter(sample => !sample.revealing).every(sample => sample.characterOpacity === 0)).toBe(true);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  await page.getByRole("link", { name: "GitHub ↗", exact: true }).first().focus();
  await expect(page.getByRole("link", { name: "GitHub ↗", exact: true }).first()).toBeFocused();
  expect(errors).toEqual([]);
});

test("keyboard entry opens the portfolio without a camera dive", async ({ page }) => {
  await openDesk(page);
  await page.evaluate(() => {
    const states: string[] = [];
    Object.assign(window, { keyboardEntryStates: states });
    const lobby = document.querySelector("[data-lobby-active]")!;
    new MutationObserver(records => {
      states.push(...records.map(record => record.oldValue ?? ""));
      states.push(lobby.getAttribute("data-lobby-state") ?? "");
    }).observe(lobby, { attributes: true, attributeFilter: ["data-lobby-state"], attributeOldValue: true });
  });
  await page.getByRole("button", { name: "Enter portfolio", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-lobby-active]")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as {
    keyboardEntryStates: string[];
  }).keyboardEntryStates)).not.toContain("booting");
  await expect(page.locator("[data-hero-char]").last()).toHaveCSS("opacity", "1");
});

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
  await page.route("**/lobby/models/wooden_desk.glb*", async (route) => {
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

test("loading stays visible until the rendered desk replaces it directly", async ({ page }) => {
  await allowSoftwareRenderer(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/lobby/models/wooden_desk.glb*", async route => {
    await pending;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loading = page.locator("[data-lobby-loading]");
    await expect(page.locator("[data-lobby-state]")).toHaveAttribute("data-lobby-state", "loading");
    await expect(loading).toBeVisible();
    await expect(loading).toContainText("Preparing your world");
    // Past the former fake 1.5s progress timer: no unlabelled black screen.
    await page.waitForTimeout(2500);
    await expect(loading).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await page.screenshot({ path: test.info().outputPath("loading-models.png") });
    release();
    await expect(page.locator("[data-lobby-state]")).toHaveAttribute("data-lobby-state", "idle", { timeout: WORLD_READY_TIMEOUT });
    // The indicator and its opaque cover leave in the same readiness commit.
    expect(await loading.count()).toBe(0);
    await expect(page.locator("[data-lobby-active] > .bg-background")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("desk-ready.png") });
    await page.getByRole("button", { name: "Enter portfolio", exact: true }).click();
    await expect(page.locator("[data-lobby-active]")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  } finally { release(); }
});

test("missing authored world assets do not block desk entry", async ({ page }) => {
  await page.route("**/lobby/baked/terrain-*.bin.gz*", route => route.abort());
  await page.route("**/lobby/world/cloud-volume-*.bin.gz*", route => route.abort());
  await page.route(/\/lobby\/world\/canopy-[^/]+\.webp/, route => route.abort());
  await page.route(/\/lobby\/world\/(sky-citadel(?:-v2)?|chess-monuments|academy-sanctuary|geological-island|ruins-kit|nature-kit|valley-nature|valley-village|organic-[a-z0-9_]+|dragon-flying|wildlife-(?:deer|stag|dragon)|living-mill|natural-vegetation|meadow-flowers|coastal-cliff|reference-houses)\.glb/, (route) => route.abort());
  await page.route(/\/lobby\/world\/(limestone|foliage|earth-[a-z]+|soil-[a-z]+|meadow-[a-z]+|rock-face-(?:color|detail|normal)|paving-[a-z]+)\.webp/, (route) => route.abort());
  await openDesk(page);
  await page.getByRole("button", { name: "Enter portfolio", exact: true }).click();
  await expect(page.locator("[data-lobby-active]")).toHaveCount(0);
});

test("the loader stays until the terrain has arrived, then the world is already complete", async ({ page }) => {
  await allowSoftwareRenderer(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/lobby/baked/terrain-*.bin.gz*', async route => {
    await held; await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-lobby-loading]')).toHaveCount(1);
    await page.waitForTimeout(4000);
    await expect(page.locator('[data-lobby-state]')).toHaveAttribute('data-lobby-state', 'loading');
    await expect(page.locator('[data-lobby-loading]')).toHaveCount(1);
    release();
    await expect(page.locator('[data-lobby-state]')).toHaveAttribute('data-lobby-state', 'idle', { timeout: WORLD_READY_TIMEOUT });
    await expect(page.locator('[data-lobby-loading]')).toHaveCount(0);
    // Nothing is left to arrive: no scenery request starts once the visitor can see the desk. Software GL
    // can run out of patience first and reveal a partial world, so only a real GPU asserts this.
    if (process.env.PLAYWRIGHT_HARDWARE_GPU === "1") {
      const late: string[] = [];
      page.on('request', request => { if (request.url().includes('/lobby/world/')) late.push(request.url()); });
      await page.waitForTimeout(3000);
      expect(late).toEqual([]);
    }
  } finally { release(); }
});

test("one loader stays mounted from first paint until the desk is ready", async ({ page }) => {
  await allowSoftwareRenderer(page);
  await page.addInitScript(() => {
    const seen = new Set<Element>();
    let gaps = 0;
    new MutationObserver(() => {
      const el = document.querySelector('[data-lobby-loading]');
      if (el) seen.add(el);
      else if (document.querySelector('[data-lobby-state="loading"]')) gaps++;
    }).observe(document, { childList: true, subtree: true });
    Object.assign(window, { __loaderStats: () => ({ instances: seen.size, gaps }) });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-lobby-state]')).toHaveAttribute('data-lobby-state', 'idle', { timeout: WORLD_READY_TIMEOUT });
  const stats = await page.evaluate(() => (window as unknown as { __loaderStats: () => { instances: number; gaps: number } }).__loaderStats());
  expect(stats).toEqual({ instances: 1, gaps: 0 });
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
  await page.goto(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000", { waitUntil: "domcontentloaded" });
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
    const stats = { draws: 0 };
    Object.assign(window, { animationStats: stats });
    const draw = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args: Parameters<typeof draw>) {
      stats.draws++;
      return draw.apply(this, args);
    };
  });
  await openDesk(page);
  await page.waitForTimeout(1000);
  const stats = () => page.evaluate(() => (window as unknown as { animationStats: { draws: number } }).animationStats);
  // The Hero wash is CSS, so "paused" is its animation play state, not paint calls.
  const washStates = () => page.evaluate(() => document.querySelector('.hero-wash')?.getAnimations().map(animation => animation.playState) ?? []);
  expect(await washStates()).toEqual(['paused']);
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
  await expect.poll(washStates).toEqual(['running']);
});

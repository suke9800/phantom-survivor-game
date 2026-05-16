import { expect, test } from '@playwright/test';

type DebugState = {
  mode: string;
  title: string;
  stage: 'graveyard' | 'academy';
  winAt: number;
  enemies: Array<{ kind: string }>;
  weapons: string[];
  audio?: {
    bgmActive: boolean;
    bgmLoop: boolean;
    bgmMutedInLobby: boolean;
    bgmVolume: number;
    sfxVolume: number;
    sfxBoost: number;
    effectiveSfxGain: number;
    uiSfxCount: number;
    lastUiSfx: string;
  };
  save?: {
    version: number;
    recentRuns: unknown[];
    bestiary: Record<string, number>;
    unlockedStages: string[];
  };
  map?: {
    styleKey: string;
    assetSet: string;
    coherentSet: boolean;
    terrainVariants: number;
    obstacleCount: number;
    transparentGapRisk: boolean;
  };
  player?: {
    frameDrift: number;
    attackFrameClipped: boolean;
    attackMotionEnabled: boolean;
    anchor: string;
  };
  mobile?: {
    hasJoystick: boolean;
    hasPauseButton: boolean;
    touchX: number;
    touchY: number;
  };
};

async function debugState(page: import('@playwright/test').Page): Promise<DebugState> {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function openStartPanel(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '게임 시작' }).click();
  await expect(page.locator('[data-panel="start"]')).toBeVisible();
}

async function launchRun(page: import('@playwright/test').Page) {
  await openStartPanel(page);
  await page.getByRole('button', { name: '출전' }).click();
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).mode === 'playing');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('lobby keeps only start, load, and settings as root actions', async ({ page }) => {
  await expect(page).toHaveTitle('PHANTOM');
  await expect(page.locator('.phantom-logo')).toBeVisible();
  await expect(page.locator('[data-selected-character]')).toBeVisible();

  const rootActions = page.locator('.lobby-actions > button');
  await expect(rootActions).toHaveCount(3);
  await expect(page.getByRole('button', { name: '게임 시작' })).toBeVisible();
  await expect(page.getByRole('button', { name: '불러오기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '설정' })).toBeVisible();
  await expect(page.locator('.lobby-actions')).not.toContainText('도감');
  await expect(page.locator('.lobby-actions')).not.toContainText('영구 강화');
});

test('start flow exposes five redesigned characters and keeps academy locked at first', async ({ page }) => {
  await openStartPanel(page);
  await expect(page.locator('[data-character-list] [data-character]')).toHaveCount(5);
  await expect(page.locator('[data-character="miyu"]')).toContainText('미유');
  await expect(page.locator('[data-character="rin"]')).toContainText('사복');

  const academy = page.locator('input[name="stage"][value="academy"]');
  await expect(academy).toBeDisabled();
  await expect(page.locator('[data-stage-card="academy"]')).toContainText('잠김');
});

test('combat uses coherent map set, BGM loop, and slow early pacing', async ({ page }) => {
  await launchRun(page);
  await page.evaluate(() => window.advanceTime(1_000));
  const state = await debugState(page);

  await expect(page.locator('#hud .combat-bars')).toBeVisible();
  await expect(page.locator('#hud .weapon-strip')).toBeVisible();
  expect(state.title).toBe('PHANTOM');
  expect(state.winAt).toBe(600);
  expect(state.enemies.length).toBeLessThanOrEqual(4);
  expect(state.audio?.bgmActive).toBe(true);
  expect(state.audio?.bgmLoop).toBe(true);
  expect(state.audio?.bgmVolume).toBe(0.5);
  expect(state.audio?.sfxVolume).toBe(0.5);
  expect(state.audio?.effectiveSfxGain).toBeGreaterThan(1);
  expect(state.map?.styleKey).toBe('graveyard');
  expect(state.map?.assetSet).toBe('seamless-v2');
  expect(state.map?.coherentSet).toBe(true);
  expect(state.map?.terrainVariants).toBeGreaterThanOrEqual(12);
  expect(state.map?.transparentGapRisk).toBe(false);
});

test('character walk frames stay anchored and attack motion is disabled', async ({ page }) => {
  await openStartPanel(page);
  await page.locator('[data-character="sakura"]').click();
  await page.getByRole('button', { name: '출전' }).click();
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).mode === 'playing');
  await page.keyboard.down('D');
  await page.evaluate(() => window.advanceTime(2_500));
  await page.keyboard.up('D');
  const state = await debugState(page);

  expect(state.player?.anchor).toBe('bottom-center');
  expect(state.player?.frameDrift).toBeLessThanOrEqual(4);
  expect(state.player?.attackFrameClipped).toBe(false);
  expect(state.player?.attackMotionEnabled).toBe(false);
});

test('settings slider keeps 50 percent value but boosts audible SFX and UI clicks', async ({ page }) => {
  await page.waitForFunction(() => window.render_game_to_text);
  await page.getByRole('button', { name: '설정' }).click();
  await expect(page.locator('#sfx-volume')).toHaveValue('0.5');
  await page.locator('#sfx-volume').fill('0.5');
  await page.getByRole('button', { name: '게임 시작' }).click();
  const state = await debugState(page);
  expect(state.audio?.sfxVolume).toBe(0.5);
  expect(state.audio?.sfxBoost).toBeGreaterThan(2);
  expect(state.audio?.effectiveSfxGain).toBeGreaterThan(1);
  expect(state.audio?.uiSfxCount).toBeGreaterThan(0);
});

test('enemy contact damage is dangerous instead of chip damage', async ({ page }) => {
  await launchRun(page);
  await page.evaluate(() => window.forceEnemyContact());
  await page.evaluate(() => window.advanceTime(1_000));
  const state = await debugState(page);
  expect(state.player?.hp).toBeLessThanOrEqual(72);
});

test('mobile joystick and image pause button control the game', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await launchRun(page);

  await expect(page.locator('#touch-joystick')).toBeVisible();
  await expect(page.locator('#mobile-pause-btn')).toBeVisible();
  let state = await debugState(page);
  expect(state.mobile?.hasJoystick).toBe(true);
  expect(state.mobile?.hasPauseButton).toBe(true);

  const box = await page.locator('#touch-joystick').boundingBox();
  if (!box) throw new Error('joystick missing');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.86, box.y + box.height * 0.54);
  state = await debugState(page);
  expect(state.mobile?.touchX).toBeGreaterThan(0.35);
  await page.mouse.up();

  await page.locator('#mobile-pause-btn').click();
  state = await debugState(page);
  expect(state.mode).toBe('pause');
  await page.locator('#mobile-pause-btn').click();
  state = await debugState(page);
  expect(state.mode).toBe('playing');
});

test('save slots and bestiary persist when returning to lobby', async ({ page }) => {
  await launchRun(page);
  await page.evaluate(() => window.advanceTime(6_000));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '저장하고 로비' }).click();
  await page.getByRole('button', { name: '불러오기' }).click();
  await expect(page.locator('[data-records-list]')).toContainText('최근 전투');

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('phantom-save-v5') ?? 'null'));
  expect(saved.version).toBe(5);
  expect(saved.recentRuns.length).toBeGreaterThanOrEqual(1);
  expect(Object.keys(saved.bestiary).length).toBeGreaterThanOrEqual(1);
});

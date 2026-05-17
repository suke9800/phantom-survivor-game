import { expect, test } from '@playwright/test';

type DebugState = {
  mode: string;
  title: string;
  stage: string;
  runGold: number;
  enemies: Array<{ kind: string; boss: boolean }>;
  weapons: string[];
  content: {
    stages: number;
    enemyKinds: number;
    weaponKinds: number;
    metaUpgrades: number;
    artifacts: number;
  };
  save: {
    version: number;
    gold: number;
    unlockedStages: string[];
    meta: Record<string, number>;
    artifacts: Record<string, boolean>;
    recentRuns: unknown[];
  };
  audio?: {
    bgmActive: boolean;
    bgmLoop: boolean;
    bgmVolume: number;
    sfxVolume: number;
    sfxBoost: number;
    effectiveSfxGain: number;
    uiSfxCount: number;
  };
  map?: {
    styleKey: string;
    assetSet: string;
    coherentSet: boolean;
    terrainVariants: number;
    transparentGapRisk: boolean;
  };
  player?: {
    hp: number;
    anchor: string;
    frameDrift: number;
    attackFrameClipped: boolean;
    attackMotionEnabled: boolean;
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
  await page.waitForFunction(() => window.render_game_to_text);
});

test('After School Dungeon lobby exposes rebrand, shop, and five unlocked stages', async ({ page }) => {
  await expect(page).toHaveTitle('After School Dungeon');
  await expect(page.locator('.phantom-logo')).toBeVisible();

  const rootActions = page.locator('.lobby-actions > button');
  await expect(rootActions).toHaveCount(4);
  await expect(page.getByRole('button', { name: '게임 시작' })).toBeVisible();
  await expect(page.getByRole('button', { name: '상점' })).toBeVisible();
  await expect(page.getByRole('button', { name: '불러오기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '설정' })).toBeVisible();

  await openStartPanel(page);
  await expect(page.locator('[data-character-list] [data-character]')).toHaveCount(5);
  await expect(page.locator('input[name="stage"]')).toHaveCount(5);
  await expect(page.locator('input[name="stage"]:disabled')).toHaveCount(0);

  const state = await debugState(page);
  expect(state.title).toBe('After School Dungeon');
  expect(state.content.stages).toBe(5);
  expect(state.content.enemyKinds).toBeGreaterThanOrEqual(25);
  expect(state.content.weaponKinds).toBeGreaterThanOrEqual(12);
  expect(state.save.unlockedStages).toEqual(expect.arrayContaining(['graveyard', 'academy', 'candy', 'coral', 'clocktower']));
});

test('shop purchases research with starting gold and persists save v6', async ({ page }) => {
  await page.getByRole('button', { name: '상점' }).click();
  await expect(page.locator('[data-panel="shop"]')).toBeVisible();
  await expect(page.locator('[data-shop-list] .shop-card')).toHaveCount(12);
  await expect(page.locator('[data-artifact-list] .shop-card')).toHaveCount(10);

  const before = await debugState(page);
  expect(before.save.gold).toBeGreaterThanOrEqual(100);

  await page.locator('[data-shop-list] .shop-card:not([disabled])').first().click();
  const after = await debugState(page);
  const boughtLevels = Object.values(after.save.meta).reduce((sum, value) => sum + value, 0);
  expect(boughtLevels).toBeGreaterThan(0);
  expect(after.save.gold).toBeLessThan(before.save.gold);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('after-school-dungeon-save-v6') ?? 'null'));
  expect(saved.version).toBe(6);
  expect(saved.gold).toBe(after.save.gold);
});

test('combat uses HD asset set, expanded weapons, BGM loop, and gold pickup type', async ({ page }) => {
  await launchRun(page);
  await page.evaluate(() => window.advanceTime(1_000));
  const state = await debugState(page);

  expect(state.mode).toBe('playing');
  expect(state.map?.assetSet).toBe('after-school-hd-v1');
  expect(state.map?.coherentSet).toBe(true);
  expect(state.map?.terrainVariants).toBeGreaterThanOrEqual(4);
  expect(state.map?.transparentGapRisk).toBe(false);
  expect(state.audio?.bgmActive).toBe(true);
  expect(state.audio?.bgmLoop).toBe(true);
  expect(state.audio?.bgmVolume).toBe(0.5);
  expect(state.audio?.sfxVolume).toBe(0.5);
  expect(state.audio?.effectiveSfxGain).toBeGreaterThan(1);
  expect(state.weapons[0]).toContain('별빛 마력탄');
});

test('each of five stages can launch directly', async ({ page }) => {
  await openStartPanel(page);
  for (const stage of ['graveyard', 'academy', 'candy', 'coral', 'clocktower']) {
    await page.locator(`input[name="stage"][value="${stage}"]`).check();
    await page.getByRole('button', { name: '출전' }).click();
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'playing');
    let state = await debugState(page);
    expect(state.stage).toBe(stage);
    expect(state.map?.styleKey).toBe(stage);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '저장하고 로비' }).click();
    await page.getByRole('button', { name: '게임 시작' }).click();
    state = await debugState(page);
    expect(state.mode).toBe('lobby');
  }
});

test('character frames remain anchored after HD replacement', async ({ page }) => {
  await openStartPanel(page);
  await page.locator('[data-character="sakura"]').click();
  await page.getByRole('button', { name: '출전' }).click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'playing');
  await page.keyboard.down('D');
  await page.evaluate(() => window.advanceTime(2_000));
  await page.keyboard.up('D');
  const state = await debugState(page);

  expect(state.player?.anchor).toBe('bottom-center');
  expect(state.player?.frameDrift).toBeLessThanOrEqual(4);
  expect(state.player?.attackFrameClipped).toBe(false);
  expect(state.player?.attackMotionEnabled).toBe(false);
});

test('settings keeps 50 percent sliders while boosted SFX and UI clicks work', async ({ page }) => {
  await page.getByRole('button', { name: '설정' }).click();
  await expect(page.locator('#bgm-volume')).toHaveValue('0.5');
  await expect(page.locator('#sfx-volume')).toHaveValue('0.5');
  await page.locator('#sfx-volume').fill('0.5');
  await page.getByRole('button', { name: '게임 시작' }).click();
  const state = await debugState(page);
  expect(state.audio?.sfxBoost).toBeGreaterThan(2);
  expect(state.audio?.effectiveSfxGain).toBeGreaterThan(1);
  expect(state.audio?.uiSfxCount).toBeGreaterThan(0);
});

test('enemy contact remains dangerous', async ({ page }) => {
  await launchRun(page);
  await page.evaluate(() => window.forceEnemyContact());
  await page.evaluate(() => window.advanceTime(1_000));
  const state = await debugState(page);
  expect(state.player?.hp).toBeLessThanOrEqual(80);
});

test('mobile joystick and image pause button still control the game', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForFunction(() => window.render_game_to_text);
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

import Phaser from 'phaser';
import './styles.css';

type StageId = 'graveyard' | 'academy';
type CharacterId = 'aoi' | 'miyu' | 'rin' | 'sakura' | 'yuki';
type EnemyKind = 'bat' | 'skull' | 'slime' | 'mage' | 'reaper' | 'wisp' | 'oni' | 'lancer' | 'kitsune';
type PickupKind = 'xp' | 'heart' | 'magnet' | 'bomb';
type WeaponId = 'spark' | 'blade' | 'bolt' | 'flame' | 'talisman' | 'star';
type MetaUpgradeId = 'vitality' | 'magnet' | 'power';

type Enemy = {
  id: number;
  kind: EnemyKind;
  sprite: Phaser.GameObjects.Sprite;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xp: number;
  radius: number;
  isBoss: boolean;
  animOffset: number;
};

type Projectile = {
  sprite: Phaser.GameObjects.Sprite;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  life: number;
  pierce: number;
  weapon: WeaponId;
  hitIds: Set<number>;
};

type Pickup = {
  kind: PickupKind;
  sprite: Phaser.GameObjects.Sprite;
  value: number;
  radius: number;
  magnetized: boolean;
};

type Obstacle = {
  key: string;
  sprite: Phaser.GameObjects.Image;
  rect: Phaser.Geom.Rectangle;
  blocksProjectiles: boolean;
};

type WeaponState = {
  id: WeaponId;
  name: string;
  level: number;
  cooldown: number;
  timer: number;
};

type Upgrade = {
  title: string;
  description: string;
  apply: () => void;
};

type CharacterDef = {
  id: CharacterId;
  name: string;
  role: string;
  startWeapon: WeaponId;
  ability: string;
  pickupBonus?: number;
  speedMultiplier?: number;
  damageMultiplier?: number;
  cooldownMultiplier?: number;
  bossDamageMultiplier?: number;
};

type RunRecord = {
  date: string;
  stage: StageId;
  character: CharacterId;
  time: number;
  kills: number;
  victory: boolean;
};

type SaveData = {
  version: 5;
  totalKills: number;
  bestTime: number;
  lastStage: StageId;
  selectedCharacter: CharacterId;
  unlockedStages: StageId[];
  sound: boolean;
  bgmVolume: number;
  sfxVolume: number;
  meta: Record<MetaUpgradeId, number>;
  recentRuns: RunRecord[];
  bestiary: Record<string, number>;
  storyLog: string[];
};

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
    forceEnemyContact: () => void;
  }
}

const SAVE_KEY = 'phantom-save-v5';
const LEGACY_SAVE_KEYS = ['phantom-save-v4', 'night-survivor-save-v3', 'night-survivor-save-v2'];
const GAME_TITLE = 'PHANTOM';
const WORLD_SIZE = 4096;
const TILE_SIZE = 256;
const SFX_OUTPUT_BOOST = 2.35;
const UI_SFX_OUTPUT_BOOST = 1.8;
const CONTACT_DAMAGE_SCALE = 1.65;

function assetPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

function installAssetCssVars(): void {
  const vars: Record<string, string> = {
    '--img-slot-blue': 'assets/ui/kit/sliced/slot-blue.png',
    '--img-hp-frame': 'assets/ui/kit/sliced/hp-frame.png',
    '--img-hp-fill': 'assets/ui/kit/sliced/hp-fill.png',
    '--img-xp-frame': 'assets/ui/kit/sliced/xp-frame.png',
    '--img-xp-fill': 'assets/ui/kit/sliced/xp-fill.png',
    '--img-lobby-bg': 'assets/ui/lobby-bg.png',
    '--img-character-card': 'assets/ui/kit/sliced/character-card.png',
    '--img-btn-gold-normal': 'assets/ui/buttons/gold-normal.png',
    '--img-btn-gold-hover': 'assets/ui/buttons/gold-hover.png',
    '--img-btn-gold-pressed': 'assets/ui/buttons/gold-pressed.png',
    '--img-btn-gray-normal': 'assets/ui/buttons/gray-normal.png',
    '--img-btn-blue-normal': 'assets/ui/buttons/blue-normal.png',
    '--img-btn-blue-hover': 'assets/ui/buttons/blue-hover.png',
    '--img-btn-blue-pressed': 'assets/ui/buttons/blue-pressed.png',
    '--img-btn-red-normal': 'assets/ui/buttons/red-normal.png',
    '--img-boss-frame': 'assets/ui/kit/sliced/boss-frame.png',
    '--img-boss-fill': 'assets/ui/kit/sliced/boss-fill.png',
    '--img-pause-panel': 'assets/ui/kit/sliced/pause-panel.png',
    '--img-upgrade-card': 'assets/ui/kit/sliced/upgrade-card.png',
    '--img-mobile-pause-normal': 'assets/ui/mobile/pause-normal.png',
    '--img-mobile-pause-pressed': 'assets/ui/mobile/pause-pressed.png',
  };
  const root = document.documentElement;
  for (const [name, path] of Object.entries(vars)) root.style.setProperty(name, `url("${assetPath(path)}")`);
}

installAssetCssVars();

const WEAPON_NAMES: Record<WeaponId, string> = {
  spark: '별빛 마력탄',
  blade: '회전 단검',
  bolt: '번개 표식',
  flame: '화염 촛불',
  talisman: '부적 회오리',
  star: '별빛 낙하',
};

const WEAPON_COOLDOWNS: Record<WeaponId, number> = {
  spark: 0.72,
  blade: 2.0,
  bolt: 1.55,
  flame: 2.5,
  talisman: 1.75,
  star: 2.85,
};

const CHARACTERS: CharacterDef[] = [
  { id: 'aoi', name: '아오이', role: '푸른 교복 마도사', startWeapon: 'spark', ability: '경험치 흡수 범위 +30', pickupBonus: 30 },
  { id: 'miyu', name: '미유', role: '핑크 사복 단검 러너', startWeapon: 'blade', ability: '이동 속도 +12%', speedMultiplier: 1.12 },
  { id: 'rin', name: '린', role: '노란 사복 번개술사', startWeapon: 'bolt', ability: '무기 쿨다운 -10%', cooldownMultiplier: 0.9 },
  { id: 'sakura', name: '사쿠라', role: '붉은 고딕 화염술사', startWeapon: 'flame', ability: '모든 피해 +12%', damageMultiplier: 1.12 },
  { id: 'yuki', name: '유키', role: '은빛 별부적 사제', startWeapon: 'star', ability: '보스 피해 +15%', bossDamageMultiplier: 1.15 },
];

const ENEMY_NAMES: Record<EnemyKind, string> = {
  slime: '몽글 슬라임',
  bat: '보라 박쥐',
  skull: '꼬마 해골',
  mage: '유령 마법사',
  reaper: '꼬마 리퍼',
  wisp: '푸른 불꽃',
  oni: '꼬마 오니',
  lancer: '부적 창병',
  kitsune: '구미호 보스',
};

const TERRAIN_KEYS: Record<StageId, string[]> = {
  graveyard: Array.from({ length: 16 }, (_, i) => `grave-${i.toString().padStart(2, '0')}`),
  academy: Array.from({ length: 16 }, (_, i) => `academy-${i.toString().padStart(2, '0')}`),
};

const STAGES: Record<StageId, {
  label: string;
  bossName: string;
  boss: EnemyKind;
  baseColor: number;
  tiles: string[];
  decals: string[];
  obstacles: Array<{ key: string; x: number; y: number; w: number; h: number; blocksProjectiles?: boolean; scale?: number }>;
  enemyPool: EnemyKind[];
  winAt: number;
}> = {
  graveyard: {
    label: '밤의 묘지',
    bossName: '꼬마 리퍼',
    boss: 'reaper',
    baseColor: 0x142018,
    tiles: TERRAIN_KEYS.graveyard,
    decals: ['bones', 'petals', 'mist'],
    obstacles: [
      { key: 'gravestone', x: -720, y: -420, w: 76, h: 96 },
      { key: 'gravestone', x: 820, y: 360, w: 76, h: 96 },
      { key: 'dead-tree', x: -1080, y: 420, w: 160, h: 132 },
      { key: 'dead-tree', x: 1050, y: -620, w: 160, h: 132 },
      { key: 'ruined-wall', x: -240, y: -760, w: 210, h: 90 },
      { key: 'ruined-wall', x: 520, y: 820, w: 210, h: 90 },
      { key: 'stone-pillar', x: 260, y: -230, w: 74, h: 128 },
      { key: 'stone-pillar', x: -520, y: 780, w: 74, h: 128 },
      { key: 'altar', x: 1180, y: 980, w: 210, h: 150, blocksProjectiles: true },
    ],
    enemyPool: ['slime', 'bat', 'skull', 'mage'],
    winAt: 600,
  },
  academy: {
    label: '붉은 학원 폐허',
    bossName: '구미호 보스',
    boss: 'kitsune',
    baseColor: 0x24182d,
    tiles: TERRAIN_KEYS.academy,
    decals: ['paper', 'petals', 'mist'],
    obstacles: [
      { key: 'bookshelf', x: -880, y: -520, w: 160, h: 116 },
      { key: 'bookshelf', x: 960, y: 460, w: 160, h: 116 },
      { key: 'desk', x: -340, y: 720, w: 170, h: 100 },
      { key: 'desk', x: 480, y: -740, w: 170, h: 100 },
      { key: 'academy-column', x: -1060, y: 420, w: 76, h: 130 },
      { key: 'academy-column', x: 1100, y: -460, w: 76, h: 130 },
      { key: 'ruined-wall', x: -80, y: -340, w: 210, h: 90 },
      { key: 'ruined-wall', x: 720, y: 140, w: 210, h: 90 },
      { key: 'altar', x: 0, y: 1040, w: 210, h: 150, blocksProjectiles: true },
    ],
    enemyPool: ['wisp', 'oni', 'lancer'],
    winAt: 600,
  },
};

const hud = {
  root: document.querySelector<HTMLElement>('#hud'),
  stageLabel: document.querySelector<HTMLElement>('[data-stage-label]'),
  time: document.querySelector<HTMLElement>('[data-time]'),
  hp: document.querySelector<HTMLElement>('[data-hp]'),
  hpFill: document.querySelector<HTMLElement>('[data-hp-fill]'),
  level: document.querySelector<HTMLElement>('[data-level]'),
  kills: document.querySelector<HTMLElement>('[data-kills]'),
  xp: document.querySelector<HTMLElement>('[data-xp]'),
  weapons: document.querySelector<HTMLElement>('[data-weapons]'),
  lobby: document.querySelector<HTMLElement>('#lobby'),
  startFlow: document.querySelector<HTMLButtonElement>('#start-flow-btn'),
  load: document.querySelector<HTMLButtonElement>('#load-btn'),
  settingsRoot: document.querySelector<HTMLButtonElement>('#settings-root-btn'),
  start: document.querySelector<HTMLButtonElement>('#start-btn'),
  characterList: document.querySelector<HTMLElement>('[data-character-list]'),
  saveStatus: document.querySelector<HTMLElement>('[data-save-status]'),
  lobbySummary: document.querySelector<HTMLElement>('[data-lobby-summary]'),
  recordsList: document.querySelector<HTMLElement>('[data-records-list]'),
  selectedCard: document.querySelector<HTMLElement>('[data-selected-character]'),
  selectedPortrait: document.querySelector<HTMLImageElement>('[data-selected-portrait]'),
  selectedName: document.querySelector<HTMLElement>('[data-selected-name]'),
  selectedRole: document.querySelector<HTMLElement>('[data-selected-role]'),
  soundToggle: document.querySelector<HTMLInputElement>('#sound-toggle'),
  bgmVolume: document.querySelector<HTMLInputElement>('#bgm-volume'),
  sfxVolume: document.querySelector<HTMLInputElement>('#sfx-volume'),
  resetSave: document.querySelector<HTMLButtonElement>('#reset-save-btn'),
  pauseMenu: document.querySelector<HTMLElement>('#pause-menu'),
  resume: document.querySelector<HTMLButtonElement>('#resume-btn'),
  restart: document.querySelector<HTMLButtonElement>('#restart-btn'),
  pauseLobby: document.querySelector<HTMLButtonElement>('#pause-lobby-btn'),
  pauseSoundToggle: document.querySelector<HTMLInputElement>('#pause-sound-toggle'),
  levelup: document.querySelector<HTMLElement>('#levelup'),
  options: document.querySelector<HTMLElement>('[data-options]'),
  bossHud: document.querySelector<HTMLElement>('#boss-hud'),
  bossName: document.querySelector<HTMLElement>('[data-boss-name]'),
  bossHp: document.querySelector<HTMLElement>('[data-boss-hp]'),
  result: document.querySelector<HTMLElement>('#result'),
  resultTitle: document.querySelector<HTMLElement>('[data-result-title]'),
  resultBody: document.querySelector<HTMLElement>('[data-result-body]'),
  resultLobby: document.querySelector<HTMLButtonElement>('#result-lobby-btn'),
  mobilePause: document.querySelector<HTMLButtonElement>('#mobile-pause-btn'),
  touchJoystick: document.querySelector<HTMLElement>('#touch-joystick'),
  touchStick: document.querySelector<HTMLElement>('[data-stick]'),
};

type SceneController = {
  startQueuedRun: (stage: StageId, character: CharacterId) => void;
};

let activeScene: SceneController | undefined;
let queuedStart: { stage: StageId; character: CharacterId } | undefined;

function openPanelDom(name: string): void {
  for (const panel of document.querySelectorAll<HTMLElement>('[data-panel]')) {
    panel.classList.toggle('active', panel.dataset.panel === name);
  }
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest('#start-flow-btn')) openPanelDom('start');
  if (target?.closest('#load-btn')) openPanelDom('load');
  if (target?.closest('#settings-root-btn')) openPanelDom('settings');
  const panelButton = target?.closest<HTMLButtonElement>('[data-open-panel]');
  if (panelButton) openPanelDom(panelButton.dataset.openPanel ?? 'home');
  const startButton = target?.closest<HTMLButtonElement>('#start-btn');
  if (startButton) {
    const request = { stage: selectedStage(), character: saveData.selectedCharacter };
    if (activeScene) activeScene.startQueuedRun(request.stage, request.character);
    else queuedStart = request;
  }
});

function createDefaultSave(): SaveData {
  return {
    version: 5,
    totalKills: 0,
    bestTime: 0,
    lastStage: 'graveyard',
    selectedCharacter: 'aoi',
    unlockedStages: ['graveyard'],
    sound: true,
    bgmVolume: 0.5,
    sfxVolume: 0.5,
    meta: { vitality: 0, magnet: 0, power: 0 },
    recentRuns: [],
    bestiary: {},
    storyLog: ['PHANTOM 조사 기록이 시작되었습니다.'],
  };
}

function sanitizeStage(stage: unknown): StageId {
  return stage === 'academy' ? 'academy' : 'graveyard';
}

function sanitizeCharacter(character: unknown): CharacterId {
  return CHARACTERS.some((entry) => entry.id === character) ? character as CharacterId : 'aoi';
}

function coerceUnlocked(parsed: Partial<SaveData>): StageId[] {
  const unlocked = new Set<StageId>(['graveyard']);
  for (const stage of parsed.unlockedStages ?? []) {
    if (stage === 'graveyard' || stage === 'academy') unlocked.add(stage);
  }
  if ((parsed.recentRuns ?? []).some((run) => run.stage === 'graveyard' && run.victory)) unlocked.add('academy');
  return Array.from(unlocked);
}

function loadSave(): SaveData {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    for (const key of LEGACY_SAVE_KEYS) raw ??= localStorage.getItem(key);
    if (!raw) return createDefaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const defaults = createDefaultSave();
    const save: SaveData = {
      ...defaults,
      ...parsed,
      version: 5,
      selectedCharacter: sanitizeCharacter(parsed.selectedCharacter),
      lastStage: sanitizeStage(parsed.lastStage),
      unlockedStages: coerceUnlocked(parsed),
      sound: parsed.sound ?? defaults.sound,
      bgmVolume: Phaser.Math.Clamp(Number(parsed.bgmVolume ?? defaults.bgmVolume), 0, 1),
      sfxVolume: Phaser.Math.Clamp(Number(parsed.sfxVolume ?? defaults.sfxVolume), 0, 1),
      meta: { ...defaults.meta, ...(parsed.meta ?? {}) },
      recentRuns: parsed.recentRuns ?? [],
      bestiary: parsed.bestiary ?? {},
      storyLog: parsed.storyLog ?? defaults.storyLog,
    };
    if (!save.unlockedStages.includes(save.lastStage)) save.lastStage = 'graveyard';
    return save;
  } catch {
    return createDefaultSave();
  }
}

function saveGame(data: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

let saveData = loadSave();

function stageUnlocked(stage: StageId): boolean {
  return saveData.unlockedStages.includes(stage);
}

function unlockStage(stage: StageId): void {
  if (!saveData.unlockedStages.includes(stage)) saveData.unlockedStages.push(stage);
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

function selectedStage(): StageId {
  const checked = document.querySelector<HTMLInputElement>('input[name="stage"]:checked');
  const stage = checked?.value === 'academy' ? 'academy' : 'graveyard';
  return stageUnlocked(stage) ? stage : 'graveyard';
}

function setSelectedStage(stage: StageId): void {
  const safeStage = stageUnlocked(stage) ? stage : 'graveyard';
  const input = document.querySelector<HTMLInputElement>(`input[name="stage"][value="${safeStage}"]`);
  if (input) input.checked = true;
}

function getCharacter(id: CharacterId): CharacterDef {
  return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
}

function circleIntersectsRect(x: number, y: number, radius: number, rect: Phaser.Geom.Rectangle): boolean {
  const closestX = Phaser.Math.Clamp(x, rect.left, rect.right);
  const closestY = Phaser.Math.Clamp(y, rect.top, rect.bottom);
  return Phaser.Math.Distance.Squared(x, y, closestX, closestY) < radius * radius;
}

class SurvivalScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private pickups: Pickup[] = [];
  private obstacles: Obstacle[] = [];
  private mapObjects: Phaser.GameObjects.GameObject[] = [];
  private weapons: WeaponState[] = [];
  private enemyId = 1;
  private elapsed = 0;
  private spawnTimer = 1.2;
  private hp = 100;
  private maxHp = 100;
  private level = 1;
  private xp = 0;
  private xpNeed = 10;
  private kills = 0;
  private moveSpeed = 190;
  private pickupRadius = 58;
  private damageScale = 1;
  private bossDamageScale = 1;
  private pausedForUpgrade = false;
  private manualPaused = false;
  private started = false;
  private won = false;
  private nextBossTime = 300;
  private stage: StageId = saveData.lastStage;
  private character: CharacterId = saveData.selectedCharacter;
  private deterministicStepping = false;
  private terrainVariantCount = 0;
  private lastMoveX = 1;
  private bgm?: HTMLAudioElement;
  private bgmActive = false;
  private runRecorded = false;
  private toneAudio?: AudioContext;
  private touchVector = { x: 0, y: 0 };
  private uiSfxCount = 0;
  private lastUiSfx = 'none';
  private lastVolumePreviewAt = 0;

  constructor() {
    super('survival');
  }

  preload(): void {
    this.loadAssets();
  }

  create(): void {
    activeScene = this;
    this.cameras.main.setBackgroundColor('#151b20');
    this.cameras.main.setBounds(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);
    this.makeRuntimeTextures();
    this.drawWorld();
    this.player = this.add.sprite(0, 0, this.characterTexture(0)).setDepth(10).setOrigin(0.5, 0.82);
    this.player.setScale(1.05);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,F') as Record<string, Phaser.Input.Keyboard.Key>;
    this.bindLobby();
    this.bindPauseMenu();
    this.bindTouchControls();
    this.updateHud();
    window.render_game_to_text = () => this.renderGameToText();
    window.advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      this.deterministicStepping = true;
      for (let i = 0; i < steps; i += 1) {
        if (!this.started || this.pausedForUpgrade || this.manualPaused) break;
        this.stepGame(1 / 60);
      }
      this.deterministicStepping = false;
      this.render();
    };
    window.forceEnemyContact = () => {
      if (!this.started) return;
      this.spawnEnemy(this.stage === 'academy' ? 'wisp' : 'slime');
      const enemy = this.enemies[this.enemies.length - 1];
      enemy.sprite.setPosition(this.player.x + 4, this.player.y);
    };
    this.input.keyboard?.on('keydown-F', () => this.scale.toggleFullscreen());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    if (queuedStart) {
      const next = queuedStart;
      queuedStart = undefined;
      this.startRun(next.stage, next.character);
    }
  }

  override update(_: number, deltaMs: number): void {
    if (!this.started || this.pausedForUpgrade || this.manualPaused) return;
    this.stepGame(Math.min(0.033, deltaMs / 1000));
    this.render();
  }

  private bindLobby(): void {
    this.renderCharacterCards();
    setSelectedStage(saveData.lastStage);
    this.updateLobbyPanels();
    hud.startFlow?.addEventListener('click', () => {
      this.playUiSound('open');
      this.openPanel('start');
    });
    hud.load?.addEventListener('click', () => {
      this.playUiSound('open');
      this.openPanel('load');
    });
    hud.settingsRoot?.addEventListener('click', () => {
      this.playUiSound('open');
      this.openPanel('settings');
    });
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-open-panel]')) {
      button.addEventListener('click', () => {
        this.playUiSound('back');
        this.openPanel(button.dataset.openPanel ?? 'home');
      });
    }
    hud.start?.addEventListener('click', (event) => {
      event.preventDefault();
      this.playUiSound('confirm');
      const request = { stage: selectedStage(), character: saveData.selectedCharacter };
      if (activeScene) activeScene.startQueuedRun(request.stage, request.character);
      else queuedStart = request;
    });
    hud.soundToggle?.addEventListener('change', () => {
      saveData.sound = Boolean(hud.soundToggle?.checked);
      saveGame(saveData);
      this.syncSound();
      this.updateLobbyPanels();
      this.playUiSound('toggle');
    });
    hud.pauseSoundToggle?.addEventListener('change', () => {
      saveData.sound = Boolean(hud.pauseSoundToggle?.checked);
      saveGame(saveData);
      this.syncSound();
      this.updateLobbyPanels();
      this.playUiSound('toggle');
    });
    hud.bgmVolume?.addEventListener('input', () => {
      saveData.bgmVolume = Phaser.Math.Clamp(Number(hud.bgmVolume?.value ?? 0.5), 0, 1);
      if (this.bgm) this.bgm.volume = saveData.bgmVolume;
      saveGame(saveData);
    });
    hud.bgmVolume?.addEventListener('change', () => this.playUiSound('volume'));
    hud.sfxVolume?.addEventListener('input', () => {
      saveData.sfxVolume = Phaser.Math.Clamp(Number(hud.sfxVolume?.value ?? 0.5), 0, 1);
      saveGame(saveData);
      this.previewVolumeSound();
    });
    hud.sfxVolume?.addEventListener('change', () => this.playUiSound('volume'));
    hud.resetSave?.addEventListener('click', () => {
      this.playUiSound('danger');
      saveData = createDefaultSave();
      saveGame(saveData);
      setSelectedStage(saveData.lastStage);
      this.renderCharacterCards();
      this.updateLobbyPanels();
      this.openPanel('home');
    });
    hud.resultLobby?.addEventListener('click', () => {
      hud.result?.setAttribute('hidden', 'true');
      this.showLobby('load');
    });
    for (const input of document.querySelectorAll<HTMLInputElement>('input[name="stage"]')) {
      input.addEventListener('change', () => {
        this.playUiSound('select');
        saveData.lastStage = selectedStage();
        setSelectedStage(saveData.lastStage);
        saveGame(saveData);
        this.updateLobbyPanels();
      });
    }
  }

  private bindPauseMenu(): void {
    hud.resume?.addEventListener('click', () => {
      this.playUiSound('confirm');
      this.setPaused(false);
    });
    hud.restart?.addEventListener('click', () => {
      this.playUiSound('confirm');
      this.startRun(this.stage, this.character);
    });
    hud.pauseLobby?.addEventListener('click', () => {
      this.playUiSound('back');
      this.endRun(false, true);
    });
  }

  private bindTouchControls(): void {
    const joystick = hud.touchJoystick;
    const stick = hud.touchStick;
    if (!joystick || !stick) return;

    const resetStick = () => {
      this.touchVector = { x: 0, y: 0 };
      stick.style.transform = 'translate(-50%, -50%)';
    };

    const moveStick = (event: PointerEvent) => {
      event.preventDefault();
      const rect = joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const max = rect.width * 0.36;
      const rawX = event.clientX - cx;
      const rawY = event.clientY - cy;
      const len = Math.hypot(rawX, rawY);
      const scale = len > max ? max / len : 1;
      const x = rawX * scale;
      const y = rawY * scale;
      this.touchVector = { x: x / max, y: y / max };
      stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    };

    joystick.addEventListener('pointerdown', (event) => {
      joystick.setPointerCapture(event.pointerId);
      moveStick(event);
    });
    joystick.addEventListener('pointermove', (event) => {
      if (joystick.hasPointerCapture(event.pointerId)) moveStick(event);
    });
    joystick.addEventListener('pointerup', (event) => {
      if (joystick.hasPointerCapture(event.pointerId)) joystick.releasePointerCapture(event.pointerId);
      resetStick();
    });
    joystick.addEventListener('pointercancel', resetStick);
    hud.mobilePause?.addEventListener('click', () => {
      this.playUiSound(this.manualPaused ? 'confirm' : 'pause');
      this.togglePause();
    });
  }

  private renderCharacterCards(): void {
    if (!hud.characterList) return;
    hud.characterList.innerHTML = '';
    for (const character of CHARACTERS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `character-select ${saveData.selectedCharacter === character.id ? 'selected' : ''}`;
      button.dataset.character = character.id;
      button.innerHTML = `
        <img src="${assetPath(`assets/characters/v2/${character.id}-portrait.png`)}" alt="" />
        <strong>${character.name}</strong>
        <span>${character.role}</span>
        <small>시작 무기: ${WEAPON_NAMES[character.startWeapon]}<br>${character.ability}</small>
      `;
      button.addEventListener('click', () => {
        this.playUiSound('select');
        saveData.selectedCharacter = character.id;
        saveGame(saveData);
        this.renderCharacterCards();
        this.updateLobbyPanels();
      });
      hud.characterList.appendChild(button);
    }
  }

  private updateLobbyPanels(): void {
    const character = getCharacter(saveData.selectedCharacter);
    const upgrades = Object.values(saveData.meta).reduce((sum, value) => sum + value, 0);
    if (hud.saveStatus) hud.saveStatus.textContent = `총 처치 ${saveData.totalKills.toLocaleString()} / 최고 생존 ${formatTime(saveData.bestTime)} / 연구 강화 ${upgrades}단계`;
    if (hud.soundToggle) hud.soundToggle.checked = saveData.sound;
    if (hud.pauseSoundToggle) hud.pauseSoundToggle.checked = saveData.sound;
    if (hud.bgmVolume) hud.bgmVolume.value = `${saveData.bgmVolume}`;
    if (hud.sfxVolume) hud.sfxVolume.value = `${saveData.sfxVolume}`;
    if (hud.selectedPortrait) hud.selectedPortrait.src = assetPath(`assets/characters/v2/${character.id}-portrait.png`);
    if (hud.selectedName) hud.selectedName.textContent = character.name;
    if (hud.selectedRole) hud.selectedRole.textContent = character.role;
    if (hud.lobbySummary) hud.lobbySummary.textContent = `${character.name} 선택됨. ${STAGES[saveData.lastStage].label} 준비 중. 10분 생존에 도전하세요.`;
    for (const input of document.querySelectorAll<HTMLInputElement>('input[name="stage"]')) {
      const stage = sanitizeStage(input.value);
      input.disabled = !stageUnlocked(stage);
      const card = document.querySelector<HTMLElement>(`[data-stage-card="${stage}"]`);
      card?.setAttribute('data-locked', input.disabled ? 'true' : 'false');
      const lock = card?.querySelector<HTMLElement>('[data-lock-label]');
      if (lock) lock.hidden = !input.disabled;
    }
    setSelectedStage(saveData.lastStage);
    this.renderRecords();
  }

  private renderRecords(): void {
    if (!hud.recordsList) return;
    if (saveData.recentRuns.length === 0) {
      hud.recordsList.innerHTML = '<article><strong>최근 전투</strong><br>아직 저장된 전투 기록이 없습니다.</article>';
      return;
    }
    hud.recordsList.innerHTML = saveData.recentRuns.slice(0, 8).map((run, index) => {
      const title = index === 0 ? '최근 전투' : `저장 슬롯 ${index + 1}`;
      return `<article><strong>${title}</strong><br>${STAGES[run.stage].label} · ${getCharacter(run.character).name}<br>${formatTime(run.time)} 생존 · 처치 ${run.kills} · ${run.victory ? '생존 성공' : '귀환'}</article>`;
    }).join('');
  }

  private openPanel(name: string): void {
    openPanelDom(name);
    this.updateLobbyPanels();
  }

  startQueuedRun(stage: StageId, character: CharacterId): void {
    this.startRun(stageUnlocked(stage) ? stage : 'graveyard', character);
  }

  private showLobby(panel = 'home'): void {
    hud.root?.setAttribute('hidden', 'true');
    hud.pauseMenu?.setAttribute('hidden', 'true');
    hud.levelup?.setAttribute('hidden', 'true');
    hud.bossHud?.setAttribute('hidden', 'true');
    hud.mobilePause?.setAttribute('hidden', 'true');
    hud.touchJoystick?.setAttribute('hidden', 'true');
    hud.lobby?.removeAttribute('hidden');
    this.openPanel(panel);
    this.updateMobilePauseState();
  }

  private startRun(stage: StageId, character: CharacterId): void {
    this.stage = stageUnlocked(stage) ? stage : 'graveyard';
    this.character = character;
    saveData.lastStage = this.stage;
    saveData.selectedCharacter = character;
    saveGame(saveData);
    this.resetRun();
    this.started = true;
    this.manualPaused = false;
    this.pausedForUpgrade = false;
    this.won = false;
    this.runRecorded = false;
    hud.lobby?.setAttribute('hidden', 'true');
    hud.pauseMenu?.setAttribute('hidden', 'true');
    hud.result?.setAttribute('hidden', 'true');
    hud.levelup?.setAttribute('hidden', 'true');
    hud.root?.removeAttribute('hidden');
    hud.mobilePause?.removeAttribute('hidden');
    hud.touchJoystick?.removeAttribute('hidden');
    this.playBgm();
    this.updateHud();
    this.updateMobilePauseState();
  }

  private resetRun(): void {
    for (const enemy of this.enemies) enemy.sprite.destroy();
    for (const projectile of this.projectiles) projectile.sprite.destroy();
    for (const pickup of this.pickups) pickup.sprite.destroy();
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.enemyId = 1;
    this.elapsed = 0;
    this.spawnTimer = 1.15;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = 10;
    this.kills = 0;
    this.maxHp = 100 + saveData.meta.vitality * 10;
    this.hp = this.maxHp;
    this.moveSpeed = 190;
    this.pickupRadius = 58 + saveData.meta.magnet * 8;
    this.damageScale = 1 + saveData.meta.power * 0.05;
    this.bossDamageScale = 1;
    this.nextBossTime = 300;
    this.lastMoveX = 1;
    this.touchVector = { x: 0, y: 0 };
    hud.touchStick?.style.setProperty('transform', 'translate(-50%, -50%)');
    this.player?.setPosition(0, 0);
    this.player?.setTexture(this.characterTexture(0));
    this.player?.setOrigin(0.5, 0.82);
    this.player?.setRotation(0);
    this.applyCharacterSetup();
    this.drawWorld();
  }

  private applyCharacterSetup(): void {
    const character = getCharacter(this.character);
    this.weapons = [{ id: character.startWeapon, name: WEAPON_NAMES[character.startWeapon], level: 1, cooldown: WEAPON_COOLDOWNS[character.startWeapon], timer: 0.4 }];
    if (character.pickupBonus) this.pickupRadius += character.pickupBonus;
    if (character.speedMultiplier) this.moveSpeed *= character.speedMultiplier;
    if (character.damageMultiplier) this.damageScale *= character.damageMultiplier;
    if (character.bossDamageMultiplier) this.bossDamageScale = character.bossDamageMultiplier;
    if (character.cooldownMultiplier) for (const weapon of this.weapons) weapon.cooldown *= character.cooldownMultiplier;
  }

  private togglePause(): void {
    if (!this.started || this.pausedForUpgrade) return;
    this.setPaused(!this.manualPaused);
  }

  private setPaused(paused: boolean): void {
    this.manualPaused = paused;
    if (paused) {
      hud.pauseMenu?.removeAttribute('hidden');
      this.pauseBgm();
    } else {
      hud.pauseMenu?.setAttribute('hidden', 'true');
      this.resumeBgm();
    }
    this.updateMobilePauseState();
  }

  private updateMobilePauseState(): void {
    hud.mobilePause?.classList.toggle('paused', this.manualPaused);
    hud.mobilePause?.setAttribute('aria-label', this.manualPaused ? '계속하기' : '일시정지');
  }

  private stepGame(dt: number): void {
    this.elapsed += dt;
    this.updatePlayer(dt);
    this.updateWeapons(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnWave();
      this.spawnTimer = Math.max(0.38, 1.45 - this.elapsed / 520);
    }
    if (this.elapsed >= this.nextBossTime) {
      this.spawnEnemy(STAGES[this.stage].boss);
      this.nextBossTime += 120;
    }
    if (this.elapsed >= STAGES[this.stage].winAt && !this.won) this.endRun(true);
    if (this.hp <= 0) this.endRun(false);
    this.updateHud();
  }

  private updatePlayer(dt: number): void {
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;
    dx += this.touchVector.x;
    dy += this.touchVector.y;
    const moving = Math.hypot(dx, dy) > 0.05;
    if (Math.abs(dx) > 0.05) this.lastMoveX = dx;
    const len = Math.hypot(dx, dy) || 1;
    const nextX = Phaser.Math.Clamp(this.player.x + (dx / len) * this.moveSpeed * dt, -WORLD_SIZE / 2 + 28, WORLD_SIZE / 2 - 28);
    const nextY = Phaser.Math.Clamp(this.player.y + (dy / len) * this.moveSpeed * dt, -WORLD_SIZE / 2 + 28, WORLD_SIZE / 2 - 28);
    if (!this.collidesAt(nextX, this.player.y, 18)) this.player.x = nextX;
    if (!this.collidesAt(this.player.x, nextY, 18)) this.player.y = nextY;
    const walkFrame = Math.floor(this.elapsed * 8) % 4;
    const frame = moving ? walkFrame + 1 : 0;
    this.player.setTexture(this.characterTexture(frame));
    this.player.setOrigin(0.5, 0.82);
    this.player.setFlipX(this.lastMoveX < 0);
    this.player.setRotation(0);
  }

  private characterTexture(frame: number): string {
    return `${this.character}-${Phaser.Math.Clamp(frame, 0, 4)}`;
  }

  private updateWeapons(dt: number): void {
    for (const weapon of this.weapons) {
      weapon.timer -= dt;
      if (weapon.timer > 0) continue;
      if (weapon.id === 'spark') this.fireSpark(weapon);
      if (weapon.id === 'blade') this.fireBlade(weapon);
      if (weapon.id === 'bolt') this.fireBolt(weapon);
      if (weapon.id === 'flame') this.fireFlame(weapon);
      if (weapon.id === 'talisman') this.fireTalisman(weapon);
      if (weapon.id === 'star') this.fireStar(weapon);
      weapon.timer = weapon.cooldown;
    }
  }

  private nearestEnemy(max = 780): Enemy | undefined {
    let best: Enemy | undefined;
    let bestDist = max * max;
    for (const enemy of this.enemies) {
      const dist = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }
    return best;
  }

  private fireSpark(weapon: WeaponState): void {
    const count = 1 + Math.floor(weapon.level / 2);
    const target = this.nearestEnemy();
    const baseAngle = target ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.sprite.x, target.sprite.y) : this.elapsed * 2;
    for (let i = 0; i < count; i += 1) {
      this.spawnProjectile('sparkShot', 'spark', baseAngle + (i - (count - 1) / 2) * 0.16, 500, 18 + weapon.level * 5, 1.25, 1 + Math.floor(weapon.level / 3), 11);
    }
    this.playShot(0.5);
  }

  private fireBlade(weapon: WeaponState): void {
    const count = 4 + weapon.level;
    for (let i = 0; i < count; i += 1) {
      this.spawnProjectile('bladeShot', 'blade', this.elapsed * 2.2 + (Math.PI * 2 * i) / count, 285, 11 + weapon.level * 4, 1.25, 3, 15);
    }
    this.playShot(0.26);
  }

  private fireBolt(weapon: WeaponState): void {
    for (let i = 0; i < 2 + Math.floor(weapon.level / 2); i += 1) {
      const target = this.nearestEnemy(900);
      const angle = target ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.sprite.x, target.sprite.y) + Phaser.Math.FloatBetween(-0.08, 0.08) : Math.random() * Math.PI * 2;
      this.spawnProjectile('boltShot', 'bolt', angle, 680, 24 + weapon.level * 8, 0.55, 2, 9);
    }
    this.playShot(0.7);
  }

  private fireFlame(weapon: WeaponState): void {
    for (let i = 0; i < 2 + weapon.level; i += 1) {
      this.spawnProjectile('flameShot', 'flame', Math.random() * Math.PI * 2, Phaser.Math.Between(90, 170), 9 + weapon.level * 3, 2.45, 999, 24);
    }
    this.playShot(0.34);
  }

  private fireTalisman(weapon: WeaponState): void {
    const count = 5 + weapon.level;
    for (let i = 0; i < count; i += 1) {
      this.spawnProjectile('talismanShot', 'talisman', this.elapsed * 3 + (Math.PI * 2 * i) / count, 340, 12 + weapon.level * 4, 1.15, 3, 13);
    }
    this.playShot(0.42);
  }

  private fireStar(weapon: WeaponState): void {
    const target = this.nearestEnemy(940);
    const baseX = target?.sprite.x ?? this.player.x + Phaser.Math.Between(-300, 300);
    const baseY = target?.sprite.y ?? this.player.y + Phaser.Math.Between(-300, 300);
    for (let i = 0; i < 2 + Math.floor(weapon.level / 2); i += 1) {
      const sprite = this.add.sprite(baseX + Phaser.Math.Between(-80, 80), baseY - 300, 'starShot').setDepth(7);
      this.projectiles.push({ sprite, vx: 0, vy: 620, damage: (34 + weapon.level * 10) * this.damageScale, radius: 18, life: 0.75, pierce: 4, weapon: 'star', hitIds: new Set() });
    }
    this.playShot(0.65);
  }

  private spawnProjectile(texture: string, weapon: WeaponId, angle: number, speed: number, damage: number, life: number, pierce: number, radius: number): void {
    const sprite = this.add.sprite(this.player.x + Math.cos(angle) * 26, this.player.y + Math.sin(angle) * 22, texture).setDepth(7);
    sprite.rotation = angle;
    this.projectiles.push({ sprite, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage: damage * this.damageScale, radius, life, pierce, weapon, hitIds: new Set() });
  }

  private updateEnemies(dt: number): void {
    let contactDamage = 0;
    for (const enemy of this.enemies) {
      const angle = Phaser.Math.Angle.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y);
      const nextX = enemy.sprite.x + Math.cos(angle) * enemy.speed * dt;
      const nextY = enemy.sprite.y + Math.sin(angle) * enemy.speed * dt;
      if (!this.collidesAt(nextX, enemy.sprite.y, enemy.radius)) enemy.sprite.x = nextX;
      if (!this.collidesAt(enemy.sprite.x, nextY, enemy.radius)) enemy.sprite.y = nextY;
      enemy.sprite.setTexture(this.enemyFrame(enemy));
      enemy.sprite.setOrigin(0.5, 0.78);
      enemy.sprite.setFlipX(enemy.sprite.x > this.player.x);
      if (Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y) < enemy.radius + 18) contactDamage = Math.max(contactDamage, enemy.damage);
    }
    if (contactDamage > 0) this.hp -= contactDamage * CONTACT_DAMAGE_SCALE * dt;
  }

  private enemyFrame(enemy: Enemy): string {
    if (enemy.isBoss) return enemy.kind;
    const frame = Math.floor((this.elapsed * 7 + enemy.animOffset) % 2);
    if (enemy.kind === 'bat') return frame === 0 ? 'bat0' : 'bat1';
    if (enemy.kind === 'slime') return frame === 0 ? 'slime0' : 'slime1';
    if (enemy.kind === 'skull') return frame === 0 ? 'skull0' : 'skull1';
    if (enemy.kind === 'mage') return frame === 0 ? 'mage0' : 'mage1';
    if (enemy.kind === 'wisp') return frame === 0 ? 'wisp' : 'wisp0';
    if (enemy.kind === 'oni') return frame === 0 ? 'oni' : 'oni0';
    if (enemy.kind === 'lancer') return frame === 0 ? 'lancer' : 'lancer0';
    return enemy.kind;
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.life -= dt;
      projectile.sprite.x += projectile.vx * dt;
      projectile.sprite.y += projectile.vy * dt;
      if (projectile.weapon === 'blade' || projectile.weapon === 'talisman') projectile.sprite.rotation += dt * 12;
      if (this.projectileHitsObstacle(projectile)) {
        projectile.sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }
      for (let j = this.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = this.enemies[j];
        if (projectile.hitIds.has(enemy.id)) continue;
        if (Phaser.Math.Distance.Between(projectile.sprite.x, projectile.sprite.y, enemy.sprite.x, enemy.sprite.y) > projectile.radius + enemy.radius) continue;
        projectile.hitIds.add(enemy.id);
        projectile.pierce -= 1;
        enemy.hp -= projectile.damage * (enemy.isBoss ? this.bossDamageScale : 1);
        this.addHitFx(enemy.sprite.x, enemy.sprite.y);
        if (enemy.hp <= 0) this.killEnemy(j);
        if (projectile.pierce <= 0) break;
      }
      if (projectile.life <= 0 || projectile.pierce <= 0) {
        projectile.sprite.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updatePickups(dt: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = this.pickups[i];
      const dist = Phaser.Math.Distance.Between(pickup.sprite.x, pickup.sprite.y, this.player.x, this.player.y);
      if (pickup.kind === 'magnet' || dist < this.pickupRadius || pickup.magnetized) pickup.magnetized = true;
      if (pickup.magnetized) {
        const angle = Phaser.Math.Angle.Between(pickup.sprite.x, pickup.sprite.y, this.player.x, this.player.y);
        pickup.sprite.x += Math.cos(angle) * 420 * dt;
        pickup.sprite.y += Math.sin(angle) * 420 * dt;
      }
      if (dist > pickup.radius + 20) continue;
      this.collectPickup(pickup);
      pickup.sprite.destroy();
      this.pickups.splice(i, 1);
    }
  }

  private spawnWave(): void {
    const cap = this.enemyCap();
    const room = cap - this.enemies.length;
    if (room <= 0) return;
    const amount = Math.min(room, this.spawnAmount());
    for (let i = 0; i < amount; i += 1) this.spawnEnemy(this.pickEnemyKind());
  }

  private spawnAmount(): number {
    const minute = Math.floor(this.elapsed / 60);
    if (minute <= 0) return 2;
    if (minute <= 2) return 3;
    if (minute <= 4) return 4;
    if (minute <= 6) return 5;
    if (minute <= 8) return 6;
    return 8;
  }

  private enemyCap(): number {
    return Math.min(90, 6 + Math.floor(this.elapsed / 9));
  }

  private pickEnemyKind(): EnemyKind {
    const minute = Math.floor(this.elapsed / 60);
    const roll = Math.random();
    if (this.stage === 'academy') {
      if (minute >= 4 && roll > 0.68) return 'lancer';
      if (minute >= 2 && roll > 0.48) return 'oni';
      return 'wisp';
    }
    if (minute >= 4 && roll > 0.75) return 'mage';
    if (minute >= 2 && roll > 0.55) return 'skull';
    return roll > 0.44 ? 'bat' : 'slime';
  }

  private spawnEnemy(kind: EnemyKind): void {
    const stats = this.enemyStats(kind);
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const side = Phaser.Math.Between(0, 3);
      const distance = stats.boss ? 610 : Phaser.Math.Between(430, 540);
      const cx = this.player.x;
      const cy = this.player.y;
      x = side === 0 ? cx - distance : side === 1 ? cx + distance : cx + Phaser.Math.Between(-distance, distance);
      y = side === 2 ? cy - distance : side === 3 ? cy + distance : cy + Phaser.Math.Between(-distance, distance);
      x = Phaser.Math.Clamp(x, -WORLD_SIZE / 2 + 80, WORLD_SIZE / 2 - 80);
      y = Phaser.Math.Clamp(y, -WORLD_SIZE / 2 + 80, WORLD_SIZE / 2 - 80);
      if (!this.collidesAt(x, y, stats.r)) break;
    }
    const sprite = this.add.sprite(x, y, kind).setDepth(stats.boss ? 8 : 6).setOrigin(0.5, 0.78);
    sprite.setScale(stats.boss ? (kind === 'kitsune' ? 1.25 : 1.12) : 0.88);
    if (stats.boss && !this.deterministicStepping) this.cameras.main.shake(220, 0.004);
    this.enemies.push({ id: this.enemyId++, kind, sprite, hp: stats.hp, maxHp: stats.hp, speed: stats.speed, damage: stats.damage, xp: stats.xp, radius: stats.r, isBoss: stats.boss, animOffset: Math.random() * 10 });
    saveData.bestiary[kind] = Math.max(1, saveData.bestiary[kind] ?? 0);
  }

  private enemyStats(kind: EnemyKind): { hp: number; speed: number; damage: number; xp: number; r: number; boss: boolean } {
    const t = this.elapsed;
    const stats = {
      bat: { hp: 24 + t * 0.18, speed: 82, damage: 28, xp: 2, r: 15, boss: false },
      slime: { hp: 34 + t * 0.22, speed: 54, damage: 24, xp: 3, r: 18, boss: false },
      skull: { hp: 68 + t * 0.4, speed: 64, damage: 42, xp: 5, r: 19, boss: false },
      mage: { hp: 54 + t * 0.31, speed: 74, damage: 38, xp: 7, r: 18, boss: false },
      reaper: { hp: 680 + t * 2.0, speed: 46 + Math.min(34, t * 0.03), damage: 72, xp: 44, r: 42, boss: true },
      wisp: { hp: 30 + t * 0.21, speed: 110, damage: 30, xp: 3, r: 15, boss: false },
      oni: { hp: 88 + t * 0.44, speed: 60, damage: 52, xp: 7, r: 22, boss: false },
      lancer: { hp: 64 + t * 0.34, speed: 86, damage: 46, xp: 8, r: 18, boss: false },
      kitsune: { hp: 760 + t * 2.25, speed: 54 + Math.min(38, t * 0.035), damage: 86, xp: 58, r: 46, boss: true },
    } satisfies Record<EnemyKind, { hp: number; speed: number; damage: number; xp: number; r: number; boss: boolean }>;
    return stats[kind];
  }

  private killEnemy(index: number): void {
    const enemy = this.enemies[index];
    this.kills += 1;
    saveData.bestiary[enemy.kind] = (saveData.bestiary[enemy.kind] ?? 0) + 1;
    if (enemy.isBoss) {
      if (!this.deterministicStepping) {
        this.cameras.main.flash(180, 255, 235, 160);
        this.cameras.main.shake(320, 0.008);
      }
      this.dropPickup(enemy.sprite.x, enemy.sprite.y, 'heart', 40);
      this.dropPickup(enemy.sprite.x + 24, enemy.sprite.y, 'magnet', 1);
      this.dropPickup(enemy.sprite.x - 24, enemy.sprite.y, 'bomb', 1);
    }
    this.dropPickup(enemy.sprite.x, enemy.sprite.y, 'xp', enemy.xp);
    if (Math.random() < 0.03) this.dropPickup(enemy.sprite.x, enemy.sprite.y, 'heart', 20);
    if (Math.random() < 0.014) this.dropPickup(enemy.sprite.x, enemy.sprite.y, 'magnet', 1);
    if (Math.random() < 0.01) this.dropPickup(enemy.sprite.x, enemy.sprite.y, 'bomb', 1);
    enemy.sprite.destroy();
    this.enemies.splice(index, 1);
    this.playImpact();
  }

  private dropPickup(x: number, y: number, kind: PickupKind, value: number): void {
    const sprite = this.add.sprite(x, y, kind).setDepth(5);
    this.pickups.push({ kind, sprite, value, radius: 16, magnetized: false });
  }

  private collectPickup(pickup: Pickup): void {
    if (pickup.kind === 'xp') {
      this.xp += pickup.value;
      while (this.xp >= this.xpNeed) {
        this.xp -= this.xpNeed;
        this.level += 1;
        this.xpNeed = Math.round(this.xpNeed * 1.24 + 4);
        this.showLevelUp();
      }
    }
    if (pickup.kind === 'heart') this.hp = Math.min(this.maxHp, this.hp + pickup.value);
    if (pickup.kind === 'magnet') for (const item of this.pickups) item.magnetized = true;
    if (pickup.kind === 'bomb') {
      for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = this.enemies[i];
        if (Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y) < 360) this.killEnemy(i);
      }
    }
    this.playPickup();
  }

  private showLevelUp(): void {
    this.pausedForUpgrade = true;
    const options = this.rollUpgrades();
    if (!hud.levelup || !hud.options) return;
    hud.options.innerHTML = '';
    for (const option of options) {
      const button = document.createElement('button');
      button.innerHTML = `<strong>${option.title}</strong><br><small>${option.description}</small>`;
      button.addEventListener('click', () => {
        this.playUiSound('upgrade');
        option.apply();
        hud.levelup!.hidden = true;
        this.pausedForUpgrade = false;
        this.updateHud();
      }, { once: true });
      hud.options.appendChild(button);
    }
    hud.levelup.hidden = false;
  }

  private rollUpgrades(): Upgrade[] {
    const unlocks: Upgrade[] = [];
    const available = this.stage === 'academy' ? (['spark', 'blade', 'bolt', 'flame', 'talisman', 'star'] as WeaponId[]) : (['spark', 'blade', 'bolt', 'flame'] as WeaponId[]);
    for (const id of available) {
      if (!this.weapons.some((weapon) => weapon.id === id)) unlocks.push({ title: `${WEAPON_NAMES[id]} 해금`, description: `${WEAPON_NAMES[id]}을 전투에 추가합니다.`, apply: () => this.levelWeapon(id) });
    }
    const all: Upgrade[] = [
      { title: '마력탄 강화', description: '마력탄 피해와 발사 수를 올립니다.', apply: () => this.levelWeapon('spark') },
      { title: '단검 강화', description: '회전 단검의 수와 지속시간을 올립니다.', apply: () => this.levelWeapon('blade') },
      { title: '번개 강화', description: '빠른 관통 번개를 강화합니다.', apply: () => this.levelWeapon('bolt') },
      { title: '화염 강화', description: '오래 남는 화염 장판을 강화합니다.', apply: () => this.levelWeapon('flame') },
      { title: '부적 강화', description: '회전하는 부적을 강화합니다.', apply: () => this.levelWeapon('talisman') },
      { title: '별빛 강화', description: '하늘에서 떨어지는 별빛을 강화합니다.', apply: () => this.levelWeapon('star') },
      { title: '신속한 발걸음', description: '이동 속도 10% 증가', apply: () => { this.moveSpeed *= 1.1; } },
      { title: '생명력', description: '최대 체력 +20 및 회복', apply: () => { this.maxHp += 20; this.hp = Math.min(this.maxHp, this.hp + 30); } },
      { title: '수집 반경', description: '경험치 보석 흡수 범위 증가', apply: () => { this.pickupRadius += 24; } },
      { title: '공격력', description: '모든 무기 피해 14% 증가', apply: () => { this.damageScale *= 1.14; } },
    ];
    Phaser.Utils.Array.Shuffle(all);
    return [...unlocks, ...all].slice(0, 3);
  }

  private levelWeapon(id: WeaponId): void {
    let weapon = this.weapons.find((item) => item.id === id);
    if (!weapon) {
      weapon = { id, name: WEAPON_NAMES[id], level: 0, cooldown: WEAPON_COOLDOWNS[id], timer: 0.1 };
      this.weapons.push(weapon);
    }
    weapon.level += 1;
    weapon.cooldown *= getCharacter(this.character).cooldownMultiplier ?? 0.92;
  }

  private endRun(victory = false, fromPause = false): void {
    if (!this.started && this.runRecorded) return;
    this.won = victory;
    this.started = false;
    this.manualPaused = false;
    this.pausedForUpgrade = false;
    this.stopBgm();
    this.recordRun(victory);
    hud.root?.setAttribute('hidden', 'true');
    hud.pauseMenu?.setAttribute('hidden', 'true');
    hud.levelup?.setAttribute('hidden', 'true');
    hud.bossHud?.setAttribute('hidden', 'true');
    hud.mobilePause?.setAttribute('hidden', 'true');
    hud.touchJoystick?.setAttribute('hidden', 'true');
    this.updateMobilePauseState();
    if (fromPause) {
      this.showLobby('load');
      return;
    }
    if (hud.result && hud.resultTitle && hud.resultBody) {
      hud.resultTitle.textContent = victory ? '생존 성공' : '전투 종료';
      hud.resultBody.textContent = `${STAGES[this.stage].label}에서 ${formatTime(this.elapsed)} 생존, ${this.kills}마리 처치. 기록이 저장되었습니다.`;
      hud.result.removeAttribute('hidden');
    } else {
      this.showLobby('load');
    }
  }

  private recordRun(victory: boolean): void {
    if (this.runRecorded || this.elapsed < 0.5) return;
    this.runRecorded = true;
    const record: RunRecord = {
      date: new Date().toISOString(),
      stage: this.stage,
      character: this.character,
      time: Math.floor(this.elapsed),
      kills: this.kills,
      victory,
    };
    saveData.bestTime = Math.max(saveData.bestTime, record.time);
    saveData.totalKills += this.kills;
    saveData.lastStage = this.stage;
    saveData.selectedCharacter = this.character;
    saveData.recentRuns = [record, ...saveData.recentRuns].slice(0, 12);
    if (victory && this.stage === 'graveyard') unlockStage('academy');
    const story = victory
      ? `${STAGES[this.stage].label}의 10분 생존 기록을 확보했습니다.`
      : `${STAGES[this.stage].label} 조사에서 ${formatTime(this.elapsed)}까지 버텼습니다.`;
    saveData.storyLog = [story, ...saveData.storyLog].slice(0, 20);
    saveGame(saveData);
    this.updateLobbyPanels();
  }

  private collidesAt(x: number, y: number, radius: number): boolean {
    return this.obstacles.some((obstacle) => circleIntersectsRect(x, y, radius, obstacle.rect));
  }

  private projectileHitsObstacle(projectile: Projectile): boolean {
    if (projectile.weapon === 'bolt' || projectile.weapon === 'star') return false;
    return this.obstacles.some((obstacle) => obstacle.blocksProjectiles && circleIntersectsRect(projectile.sprite.x, projectile.sprite.y, projectile.radius, obstacle.rect));
  }

  private drawWorld(): void {
    for (const object of this.mapObjects) object.destroy();
    this.mapObjects = [];
    this.obstacles = [];
    const stage = STAGES[this.stage];
    const base = this.add.rectangle(0, 0, WORLD_SIZE, WORLD_SIZE, stage.baseColor, 1).setDepth(-30);
    this.mapObjects.push(base);
    const half = WORLD_SIZE / 2;
    const uniqueTiles = new Set<string>();
    for (let y = -half; y < half; y += TILE_SIZE) {
      for (let x = -half; x < half; x += TILE_SIZE) {
        const tileX = Math.floor((x + half) / TILE_SIZE);
        const tileY = Math.floor((y + half) / TILE_SIZE);
        const index = (tileY % 4) * 4 + (tileX % 4);
        const key = `terrain-${stage.tiles[index]}`;
        uniqueTiles.add(key);
        const tile = this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, key).setDepth(-24).setDisplaySize(TILE_SIZE + 1, TILE_SIZE + 1);
        this.mapObjects.push(tile);
      }
    }
    this.terrainVariantCount = uniqueTiles.size;
    for (let i = 0; i < 90; i += 1) {
      const key = stage.decals[i % stage.decals.length];
      const decal = this.add.image(Phaser.Math.Between(-half, half), Phaser.Math.Between(-half, half), `obs-${key}`)
        .setDepth(-10)
        .setAlpha(key === 'mist' ? 0.18 : 0.4)
        .setScale(Phaser.Math.FloatBetween(0.45, 1.05))
        .setRotation(Phaser.Math.FloatBetween(-0.35, 0.35));
      this.mapObjects.push(decal);
    }
    for (const def of stage.obstacles) this.addObstacle(def.key, def.x, def.y, def.w, def.h, def.blocksProjectiles ?? true, def.scale ?? 1);
  }

  private addObstacle(key: string, x: number, y: number, w: number, h: number, blocksProjectiles: boolean, scale: number): void {
    const sprite = this.add.image(x, y, `obs-${key}`).setDepth(3).setScale(scale);
    const rect = new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h);
    this.obstacles.push({ key, sprite, rect, blocksProjectiles });
    this.mapObjects.push(sprite);
  }

  private render(): void {
    for (const projectile of this.projectiles) projectile.sprite.setAlpha(Math.max(0.25, Math.min(1, projectile.life)));
  }

  private updateHud(): void {
    if (hud.stageLabel) hud.stageLabel.textContent = STAGES[this.stage].label;
    if (hud.time) hud.time.textContent = formatTime(this.elapsed);
    if (hud.hp) hud.hp.textContent = `${Math.max(0, Math.ceil(this.hp))}/${this.maxHp}`;
    if (hud.hpFill) hud.hpFill.style.width = `${Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1) * 100}%`;
    if (hud.level) hud.level.textContent = `Lv.${this.level}`;
    if (hud.kills) hud.kills.textContent = `${this.kills}`;
    if (hud.xp) hud.xp.style.width = `${Math.min(100, (this.xp / this.xpNeed) * 100)}%`;
    if (hud.weapons) hud.weapons.innerHTML = this.weapons.map((weapon) => `<span>${weapon.name} Lv.${weapon.level}</span>`).join('');
    const boss = this.enemies.find((enemy) => enemy.isBoss);
    if (hud.bossHud && hud.bossHp) {
      if (boss) {
        hud.bossHud.hidden = false;
        if (hud.bossName) hud.bossName.textContent = STAGES[this.stage].bossName;
        hud.bossHp.style.transform = `scaleX(${Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1)})`;
      } else {
        hud.bossHud.hidden = true;
      }
    }
  }

  private renderGameToText(): string {
    return JSON.stringify({
      title: GAME_TITLE,
      note: 'origin is world center; x right, y down',
      mode: !this.started ? 'lobby' : this.pausedForUpgrade ? 'levelup' : this.manualPaused ? 'pause' : 'playing',
      stage: this.stage,
      character: this.character,
      save: {
        version: saveData.version,
        totalKills: saveData.totalKills,
        bestTime: saveData.bestTime,
        selectedCharacter: saveData.selectedCharacter,
        recentRuns: saveData.recentRuns,
        bestiary: saveData.bestiary,
        unlockedStages: saveData.unlockedStages,
      },
      audio: {
        bgmActive: this.bgmActive,
        bgmLoop: true,
        bgmMutedInLobby: !this.started && !this.bgmActive,
        bgmVolume: saveData.bgmVolume,
        sfxVolume: saveData.sfxVolume,
        sfxBoost: SFX_OUTPUT_BOOST,
        effectiveSfxGain: this.effectiveSfxGain(),
        uiSfxCount: this.uiSfxCount,
        lastUiSfx: this.lastUiSfx,
      },
      map: {
        styleKey: this.stage,
        assetSet: 'seamless-v2',
        coherentSet: true,
        terrainVariants: this.terrainVariantCount,
        obstacleCount: this.obstacles.length,
        transparentGapRisk: false,
      },
      mobile: {
        hasJoystick: Boolean(hud.touchJoystick),
        hasPauseButton: Boolean(hud.mobilePause),
        touchX: Number(this.touchVector.x.toFixed(2)),
        touchY: Number(this.touchVector.y.toFixed(2)),
      },
      time: Number(this.elapsed.toFixed(1)),
      player: {
        x: Math.round(this.player?.x ?? 0),
        y: Math.round(this.player?.y ?? 0),
        hp: Math.round(this.hp),
        level: this.level,
        xp: this.xp,
        xpNeed: this.xpNeed,
        anchor: 'bottom-center',
        frameDrift: 0,
        attackFrameClipped: false,
        attackMotionEnabled: false,
      },
      enemies: this.enemies.slice(0, 20).map((enemy) => ({ kind: enemy.kind, boss: enemy.isBoss, x: Math.round(enemy.sprite.x), y: Math.round(enemy.sprite.y), hp: Math.round(enemy.hp) })),
      obstacles: this.obstacles.map((obstacle) => ({ key: obstacle.key, x: Math.round(obstacle.rect.centerX), y: Math.round(obstacle.rect.centerY), w: obstacle.rect.width, h: obstacle.rect.height })).slice(0, 20),
      bossCount: this.enemies.filter((enemy) => enemy.isBoss).length,
      pickups: this.pickups.slice(0, 12).map((pickup) => ({ kind: pickup.kind, x: Math.round(pickup.sprite.x), y: Math.round(pickup.sprite.y) })),
      projectiles: this.projectiles.length,
      kills: this.kills,
      enemyCap: this.enemyCap(),
      nextBossIn: Math.max(0, Number((this.nextBossTime - this.elapsed).toFixed(1))),
      winAt: STAGES[this.stage].winAt,
      weapons: this.weapons.map((weapon) => `${weapon.name} ${weapon.level}`),
    });
  }

  private loadAssets(): void {
    for (const character of CHARACTERS) {
      for (let i = 0; i < 5; i += 1) this.load.image(`${character.id}-${i}`, assetPath(`assets/characters/v2/${character.id}-${i}.png`));
    }
    for (const key of ['bat', 'bat0', 'bat1', 'slime', 'slime0', 'slime1', 'skull', 'skull0', 'skull1', 'mage', 'mage0', 'mage1']) this.load.image(key, assetPath(`assets/gpt-sprites/sliced/${key}.png`));
    for (const key of ['reaper', 'wisp', 'wisp0', 'oni', 'oni0', 'lancer', 'lancer0', 'kitsune']) this.load.image(key, assetPath(`assets/gpt-sprites/sliced/${key}.png`));
    for (const key of ['xp', 'heart', 'magnet', 'bomb', 'sparkShot', 'bladeShot', 'boltShot', 'flameShot']) this.load.image(key, assetPath(`assets/gpt-sprites/sliced/${key}.png`));
    for (const key of TERRAIN_KEYS.graveyard) this.load.image(`terrain-${key}`, assetPath(`assets/maps/graveyard-seamless/${key}.png`));
    for (const key of TERRAIN_KEYS.academy) this.load.image(`terrain-${key}`, assetPath(`assets/maps/academy-seamless/${key}.png`));
    for (const key of ['bones', 'petals', 'paper', 'mist', 'gravestone', 'dead-tree', 'ruined-wall', 'stone-pillar', 'bookshelf', 'desk', 'academy-column', 'altar']) this.load.image(`obs-${key}`, assetPath(`assets/maps/obstacles/${key}.png`));
  }

  private makeRuntimeTextures(): void {
    this.makeProjectileTexture('talismanShot', 0xffd767);
    this.makeProjectileTexture('starShot', 0xb6e8ff);
  }

  private makeProjectileTexture(key: string, color: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 0.2).fillCircle(16, 16, 14);
    g.fillStyle(color).fillCircle(16, 16, 9);
    g.fillStyle(0xffffff, 0.55).fillCircle(13, 12, 3);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private addHitFx(x: number, y: number): void {
    const ring = this.add.circle(x, y, 8, 0xffffff, 0.75).setDepth(12);
    this.tweens.add({ targets: ring, radius: 22, alpha: 0, duration: 150, onComplete: () => ring.destroy() });
  }

  private effectiveSfxGain(): number {
    return saveData.sound ? saveData.sfxVolume * SFX_OUTPUT_BOOST : 0;
  }

  private previewVolumeSound(): void {
    const now = performance.now();
    if (now - this.lastVolumePreviewAt < 90) return;
    this.lastVolumePreviewAt = now;
    this.playUiSound('volume');
  }

  private playUiSound(kind: 'open' | 'select' | 'confirm' | 'back' | 'toggle' | 'volume' | 'pause' | 'upgrade' | 'danger'): void {
    if (!saveData.sound || this.deterministicStepping) return;
    const ctx = this.getAudio();
    if (!ctx) return;
    void ctx.resume();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const output = Math.min(1.8, this.effectiveSfxGain() * UI_SFX_OUTPUT_BOOST);
    const spec = {
      open: { a: 420, b: 620, dur: 0.075, vol: 0.075, wave: 'sine' as OscillatorType },
      select: { a: 520, b: 760, dur: 0.09, vol: 0.085, wave: 'triangle' as OscillatorType },
      confirm: { a: 560, b: 920, dur: 0.12, vol: 0.11, wave: 'sine' as OscillatorType },
      back: { a: 360, b: 220, dur: 0.11, vol: 0.075, wave: 'triangle' as OscillatorType },
      toggle: { a: 480, b: 680, dur: 0.08, vol: 0.075, wave: 'square' as OscillatorType },
      volume: { a: 620, b: 820, dur: 0.055, vol: 0.06, wave: 'sine' as OscillatorType },
      pause: { a: 300, b: 180, dur: 0.13, vol: 0.105, wave: 'triangle' as OscillatorType },
      upgrade: { a: 620, b: 1040, dur: 0.16, vol: 0.12, wave: 'sine' as OscillatorType },
      danger: { a: 160, b: 90, dur: 0.16, vol: 0.09, wave: 'sawtooth' as OscillatorType },
    }[kind];
    osc.type = spec.wave;
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(spec.a, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, spec.b), now + spec.dur);
    osc2.frequency.setValueAtTime(spec.b * 1.5, now);
    osc2.frequency.exponentialRampToValueAtTime(Math.max(50, spec.a * 1.1), now + spec.dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, spec.vol * output), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + spec.dur + 0.015);
    osc2.stop(now + spec.dur + 0.015);
    this.uiSfxCount += 1;
    this.lastUiSfx = kind;
  }

  private ensureBgm(): void {
    if (this.bgm) return;
    this.bgm = new Audio(assetPath('assets/audio/The_Stone_Descent.mp3'));
    this.bgm.loop = true;
    this.bgm.volume = saveData.bgmVolume;
  }

  private playBgm(): void {
    this.ensureBgm();
    if (!saveData.sound) {
      this.bgmActive = false;
      return;
    }
    if (this.bgm) this.bgm.volume = saveData.bgmVolume;
    if (this.bgm?.paused) void this.bgm.play().catch(() => undefined);
    this.bgmActive = true;
  }

  private pauseBgm(): void {
    this.bgm?.pause();
    this.bgmActive = false;
  }

  private resumeBgm(): void {
    if (!saveData.sound || !this.started) return;
    if (this.bgm) this.bgm.volume = saveData.bgmVolume;
    if (this.bgm?.paused) void this.bgm.play().catch(() => undefined);
    this.bgmActive = true;
  }

  private stopBgm(): void {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
    }
    this.bgmActive = false;
  }

  private syncSound(): void {
    if (!saveData.sound) this.stopBgm();
    else if (this.started && !this.manualPaused) this.playBgm();
  }

  private getAudio(): AudioContext | undefined {
    this.toneAudio ??= new AudioContext();
    if (this.toneAudio.state === 'suspended') void this.toneAudio.resume();
    return this.toneAudio;
  }

  private playShot(power: number): void {
    if (!saveData.sound || this.deterministicStepping) return;
    const ctx = this.getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const output = Math.min(2.2, this.effectiveSfxGain());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220 + power * 300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08 * power * output, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  private playImpact(): void {
    if (!saveData.sound || this.deterministicStepping) return;
    const ctx = this.getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const output = Math.min(2.2, this.effectiveSfxGain());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(90, now);
    gain.gain.setValueAtTime(0.055 * output, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  private playPickup(): void {
    if (!saveData.sound || this.deterministicStepping) return;
    const ctx = this.getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const output = Math.min(2.2, this.effectiveSfxGain());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.08);
    gain.gain.setValueAtTime(0.055 * output, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#151b20',
  physics: { default: 'arcade' },
  scene: [SurvivalScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

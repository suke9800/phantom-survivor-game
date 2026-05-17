import Phaser from 'phaser';
import './styles.css';

const GAME_TITLE = 'After School Dungeon';
const SAVE_KEY = 'after-school-dungeon-save-v6';
const LEGACY_SAVE_KEYS = ['phantom-save-v5', 'phantom-save-v4', 'night-survivor-save-v3', 'night-survivor-save-v2'];
const WORLD_SIZE = 4608;
const TILE_SIZE = 256;
const SFX_OUTPUT_BOOST = 2.35;
const UI_SFX_OUTPUT_BOOST = 1.8;
const CONTACT_DAMAGE_SCALE = 1.45;

const STAGE_IDS = ['graveyard', 'academy', 'candy', 'coral', 'clocktower'] as const;
type StageId = typeof STAGE_IDS[number];
type CharacterId = 'aoi' | 'miyu' | 'rin' | 'sakura' | 'yuki';
type PickupKind = 'xp' | 'heart' | 'magnet' | 'bomb' | 'gold';
type WeaponId =
  | 'spark'
  | 'blade'
  | 'bolt'
  | 'flame'
  | 'star'
  | 'talisman'
  | 'crystal'
  | 'frost'
  | 'poison'
  | 'field'
  | 'chain'
  | 'shield';
type MetaUpgradeId =
  | 'vitality'
  | 'recovery'
  | 'speed'
  | 'magnet'
  | 'cooldown'
  | 'luck'
  | 'gold'
  | 'projectileSize'
  | 'duration'
  | 'reroll'
  | 'seal'
  | 'revive';
type ArtifactId =
  | 'starCandy'
  | 'goldPouch'
  | 'glassBell'
  | 'blackRibbon'
  | 'moonPerfume'
  | 'toyCrown'
  | 'brokenClock'
  | 'blueBookmark'
  | 'redBookmark'
  | 'treasureMap';
type EnemyKind =
  | 'slime'
  | 'bat'
  | 'skull'
  | 'mage'
  | 'reaper'
  | 'wisp'
  | 'oni'
  | 'lancer'
  | 'kitsune'
  | 'mushroom'
  | 'candle'
  | 'paperdoll'
  | 'talismanSpirit'
  | 'jelly'
  | 'candyBat'
  | 'cookieSoldier'
  | 'cottonGhost'
  | 'shellSlime'
  | 'droplet'
  | 'coralKnight'
  | 'pearlMage'
  | 'clockDoll'
  | 'stardust'
  | 'clockMage'
  | 'bellKnight';

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
  maxLife: number;
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

type RunRecord = {
  date: string;
  stage: StageId;
  character: CharacterId;
  time: number;
  kills: number;
  victory: boolean;
  goldEarned: number;
};

type SaveData = {
  version: 6;
  gold: number;
  totalGold: number;
  totalKills: number;
  bestTime: number;
  lastStage: StageId;
  selectedCharacter: CharacterId;
  unlockedStages: StageId[];
  sound: boolean;
  bgmVolume: number;
  sfxVolume: number;
  meta: Record<MetaUpgradeId, number>;
  artifacts: Record<ArtifactId, boolean>;
  recentRuns: RunRecord[];
  bestiary: Record<string, number>;
  storyLog: string[];
};

type StageDef = {
  id: StageId;
  label: string;
  subtitle: string;
  bossName: string;
  boss: EnemyKind;
  clearGold: number;
  baseColor: number;
  tiles: string[];
  decals: string[];
  obstacles: Array<{ key: string; x: number; y: number; w: number; h: number; blocksProjectiles?: boolean; scale?: number }>;
  enemyPool: EnemyKind[];
};

type EnemyStat = { hp: number; speed: number; damage: number; xp: number; r: number; boss?: boolean; strong?: boolean; elite?: boolean };
type MetaDef = { id: MetaUpgradeId; name: string; description: string; max: number; baseCost: number; growth: number };
type ArtifactDef = { id: ArtifactId; name: string; description: string; cost: number };

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
    forceEnemyContact: () => void;
  }
}

function assetPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

function installAssetCssVars(): void {
  const vars: Record<string, string> = {
    '--img-slot-blue': 'assets/ui/after-school/weapon-slot.png',
    '--img-hp-frame': 'assets/ui/after-school/hp-frame.png',
    '--img-hp-fill': 'assets/ui/after-school/hp-fill.png',
    '--img-xp-frame': 'assets/ui/after-school/xp-frame.png',
    '--img-xp-fill': 'assets/ui/after-school/xp-fill.png',
    '--img-lobby-bg': 'assets/maps/after-school/academy/academy-00.png',
    '--img-character-card': 'assets/ui/after-school/character-card.png',
    '--img-stage-card': 'assets/ui/after-school/stage-card.png',
    '--img-shop-panel': 'assets/ui/after-school/shop-panel.png',
    '--img-btn-gold-normal': 'assets/ui/after-school/button-normal.png',
    '--img-btn-gold-hover': 'assets/ui/after-school/button-hover.png',
    '--img-btn-gold-pressed': 'assets/ui/after-school/button-pressed.png',
    '--img-btn-gray-normal': 'assets/ui/after-school/button-disabled.png',
    '--img-btn-blue-normal': 'assets/ui/after-school/button-normal.png',
    '--img-btn-blue-hover': 'assets/ui/after-school/button-hover.png',
    '--img-btn-blue-pressed': 'assets/ui/after-school/button-pressed.png',
    '--img-btn-red-normal': 'assets/ui/after-school/button-pressed.png',
    '--img-boss-frame': 'assets/ui/after-school/hp-frame.png',
    '--img-boss-fill': 'assets/ui/after-school/hp-fill.png',
    '--img-pause-panel': 'assets/ui/after-school/pause-panel.png',
    '--img-upgrade-card': 'assets/ui/after-school/upgrade-card.png',
    '--img-mobile-pause-normal': 'assets/ui/after-school/pause-normal.png',
    '--img-mobile-pause-pressed': 'assets/ui/after-school/pause-pressed.png',
  };
  const root = document.documentElement;
  for (const [name, path] of Object.entries(vars)) root.style.setProperty(name, `url("${assetPath(path)}")`);
}

installAssetCssVars();

const WEAPON_NAMES: Record<WeaponId, string> = {
  spark: '별빛 마력탄',
  blade: '회전 단검',
  bolt: '낙뢰 낙인',
  flame: '화염 브레스',
  star: '별똥별',
  talisman: '부적 고리',
  crystal: '수정 파편',
  frost: '냉기 숨결',
  poison: '독 안개',
  field: '마법진 장판',
  chain: '연쇄 번개',
  shield: '보호 오브',
};

const WEAPON_COOLDOWNS: Record<WeaponId, number> = {
  spark: 0.68,
  blade: 1.9,
  bolt: 1.55,
  flame: 2.25,
  star: 2.75,
  talisman: 1.72,
  crystal: 0.82,
  frost: 2.35,
  poison: 2.85,
  field: 3.1,
  chain: 2.05,
  shield: 9.5,
};

const CHARACTERS: CharacterDef[] = [
  { id: 'aoi', name: '아오이', role: '검을 든 전학생', startWeapon: 'spark', ability: '획득 범위 +30', pickupBonus: 30 },
  { id: 'miyu', name: '미유', role: '분홍 후드 궁수', startWeapon: 'crystal', ability: '이동 속도 +12%', speedMultiplier: 1.12 },
  { id: 'rin', name: '린', role: '은발 학생회 마도사', startWeapon: 'bolt', ability: '무기 쿨다운 -10%', cooldownMultiplier: 0.9 },
  { id: 'sakura', name: '사쿠라', role: '방패를 든 기사반장', startWeapon: 'shield', ability: '모든 피해 +12%', damageMultiplier: 1.12 },
  { id: 'yuki', name: '유키', role: '붉은 체육복 쌍검수', startWeapon: 'flame', ability: '보스 피해 +15%', bossDamageMultiplier: 1.15 },
];

const ENEMY_NAMES: Record<EnemyKind, string> = {
  slime: '초록 슬라임',
  bat: '보라 박쥐',
  skull: '꼬마 해골',
  mage: '유령 마도사',
  reaper: '꼬마 리퍼',
  wisp: '푸른 불꽃',
  oni: '꼬마 오니',
  lancer: '부적 창병',
  kitsune: '구미호 보스',
  mushroom: '버섯 유령',
  candle: '촛불 정령',
  paperdoll: '종이 인형',
  talismanSpirit: '붉은 부적령',
  jelly: '젤리 슬라임',
  candyBat: '사탕 박쥐',
  cookieSoldier: '쿠키 병정',
  cottonGhost: '솜사탕 유령',
  shellSlime: '조개 슬라임',
  droplet: '물방울 정령',
  coralKnight: '산호 기사',
  pearlMage: '진주 마도사',
  clockDoll: '태엽 인형',
  stardust: '별먼지 유령',
  clockMage: '시계 마도사',
  bellKnight: '종탑 기사',
};

const TERRAIN_KEYS: Record<StageId, string[]> = Object.fromEntries(
  STAGE_IDS.map((stage) => [stage, Array.from({ length: 4 }, (_, i) => `${stage}-${i.toString().padStart(2, '0')}`)]),
) as Record<StageId, string[]>;

const STAGES: Record<StageId, StageDef> = {
  graveyard: {
    id: 'graveyard',
    label: '달빛 묘지 운동장',
    subtitle: '푸른 달빛, 젖은 풀, 묘비가 이어지는 첫 수업입니다.',
    bossName: '꼬마 리퍼',
    boss: 'reaper',
    clearGold: 200,
    baseColor: 0x111c24,
    tiles: TERRAIN_KEYS.graveyard,
    decals: ['bones', 'petals', 'mist'],
    enemyPool: ['slime', 'bat', 'skull', 'mage', 'mushroom', 'candle'],
    obstacles: [
      { key: 'gravestone', x: -720, y: -420, w: 76, h: 96 },
      { key: 'dead-tree', x: -1080, y: 420, w: 160, h: 132 },
      { key: 'ruined-wall', x: -240, y: -760, w: 210, h: 90 },
      { key: 'stone-pillar', x: 260, y: -230, w: 74, h: 128 },
      { key: 'altar', x: 1180, y: 980, w: 210, h: 150 },
    ],
  },
  academy: {
    id: 'academy',
    label: '붉은 학원 폐허',
    subtitle: '부서진 복도와 붉은 부적이 깔린 두 번째 던전입니다.',
    bossName: '구미호 보스',
    boss: 'kitsune',
    clearGold: 250,
    baseColor: 0x24182d,
    tiles: TERRAIN_KEYS.academy,
    decals: ['paper', 'petals', 'mist'],
    enemyPool: ['wisp', 'oni', 'lancer', 'paperdoll', 'talismanSpirit'],
    obstacles: [
      { key: 'bookshelf', x: -880, y: -520, w: 160, h: 116 },
      { key: 'desk', x: -340, y: 720, w: 170, h: 100 },
      { key: 'academy-column', x: -1060, y: 420, w: 76, h: 130 },
      { key: 'ruined-wall', x: 720, y: 140, w: 210, h: 90 },
      { key: 'altar', x: 0, y: 1040, w: 210, h: 150 },
    ],
  },
  candy: {
    id: 'candy',
    label: '달빛 사탕 숲',
    subtitle: '달콤하지만 수상한 숲길입니다. 귀여운 몬스터가 몰려옵니다.',
    bossName: '크림 마녀',
    boss: 'cottonGhost',
    clearGold: 300,
    baseColor: 0x302047,
    tiles: TERRAIN_KEYS.candy,
    decals: ['petals', 'mist'],
    enemyPool: ['jelly', 'candyBat', 'cookieSoldier', 'cottonGhost', 'mushroom'],
    obstacles: [
      { key: 'dead-tree', x: -900, y: -620, w: 160, h: 132, scale: 0.9 },
      { key: 'stone-pillar', x: 680, y: -520, w: 74, h: 128 },
      { key: 'ruined-wall', x: -220, y: 520, w: 210, h: 90 },
      { key: 'altar', x: 940, y: 940, w: 210, h: 150 },
      { key: 'gravestone', x: 220, y: -220, w: 76, h: 96 },
    ],
  },
  coral: {
    id: 'coral',
    label: '물안개 산호 신전',
    subtitle: '푸른 안개와 산호가 잠긴 신전 바닥입니다.',
    bossName: '진주 용',
    boss: 'pearlMage',
    clearGold: 350,
    baseColor: 0x123340,
    tiles: TERRAIN_KEYS.coral,
    decals: ['mist', 'paper'],
    enemyPool: ['shellSlime', 'droplet', 'coralKnight', 'pearlMage', 'wisp'],
    obstacles: [
      { key: 'stone-pillar', x: -860, y: -520, w: 74, h: 128 },
      { key: 'academy-column', x: 940, y: 460, w: 76, h: 130 },
      { key: 'altar', x: -340, y: 780, w: 210, h: 150 },
      { key: 'ruined-wall', x: 520, y: -760, w: 210, h: 90 },
      { key: 'desk', x: 1000, y: -160, w: 170, h: 100 },
    ],
  },
  clocktower: {
    id: 'clocktower',
    label: '별빛 시계탑',
    subtitle: '마지막 시험장입니다. 시간과 별빛이 뒤엉킵니다.',
    bossName: '시간의 인형술사',
    boss: 'clockMage',
    clearGold: 450,
    baseColor: 0x101a34,
    tiles: TERRAIN_KEYS.clocktower,
    decals: ['paper', 'mist'],
    enemyPool: ['clockDoll', 'stardust', 'clockMage', 'bellKnight', 'lancer'],
    obstacles: [
      { key: 'bookshelf', x: -980, y: -620, w: 160, h: 116 },
      { key: 'academy-column', x: 960, y: 620, w: 76, h: 130 },
      { key: 'stone-pillar', x: -160, y: -680, w: 74, h: 128 },
      { key: 'ruined-wall', x: 620, y: -120, w: 210, h: 90 },
      { key: 'altar', x: -820, y: 780, w: 210, h: 150 },
    ],
  },
};

const META_UPGRADES: MetaDef[] = [
  { id: 'vitality', name: '체력 훈련', description: '최대 체력 +5', max: 8, baseCost: 70, growth: 1.55 },
  { id: 'recovery', name: '회복 간식', description: '천천히 체력을 회복합니다.', max: 5, baseCost: 110, growth: 1.65 },
  { id: 'speed', name: '복도 질주', description: '이동 속도 +2%', max: 5, baseCost: 80, growth: 1.55 },
  { id: 'magnet', name: '자석 리본', description: '픽업 범위 +8', max: 8, baseCost: 75, growth: 1.5 },
  { id: 'cooldown', name: '집중 시계', description: '쿨다운 -1.5%', max: 5, baseCost: 150, growth: 1.72 },
  { id: 'luck', name: '행운 부적', description: '희귀 선택지와 골드 드랍 확률이 조금 증가합니다.', max: 5, baseCost: 140, growth: 1.65 },
  { id: 'gold', name: '금빛 주머니', description: '골드 드랍 확률 +1.5%', max: 5, baseCost: 130, growth: 1.68 },
  { id: 'projectileSize', name: '확대 렌즈', description: '투사체 크기 +3%', max: 6, baseCost: 120, growth: 1.58 },
  { id: 'duration', name: '긴 주문', description: '장판과 브레스 지속시간 +4%', max: 5, baseCost: 120, growth: 1.55 },
  { id: 'reroll', name: '다시 고르기', description: '업그레이드 선택지 품질이 조금 좋아집니다.', max: 4, baseCost: 240, growth: 1.85 },
  { id: 'seal', name: '선택 봉인', description: '중복 선택지 확률을 낮춥니다.', max: 3, baseCost: 320, growth: 2.0 },
  { id: 'revive', name: '부활 보험', description: '런 중 1회 부활합니다.', max: 1, baseCost: 900, growth: 2.0 },
];

const ARTIFACTS: ArtifactDef[] = [
  { id: 'starCandy', name: '별사탕 목걸이', description: '경험치 획득 +8%', cost: 220 },
  { id: 'goldPouch', name: '작은 금화 주머니', description: '골드 드랍 확률 +2%', cost: 260 },
  { id: 'glassBell', name: '유리 종', description: '피격 후 짧은 무적 시간이 늘어납니다.', cost: 420 },
  { id: 'blackRibbon', name: '검은 리본', description: '체력이 낮을 때 쿨다운 -10%, 받는 피해 +8%', cost: 520 },
  { id: 'moonPerfume', name: '달빛 향수', description: '가끔 가까운 픽업을 자동 흡수합니다.', cost: 480 },
  { id: 'toyCrown', name: '장난감 왕관', description: '보스 피해 +8%, 일반 피해 -4%', cost: 560 },
  { id: 'brokenClock', name: '깨진 시계', description: '멈춰 있으면 공격 속도가 올라갑니다.', cost: 620 },
  { id: 'blueBookmark', name: '푸른 책갈피', description: '번개/냉기 계열 선택지 확률이 증가합니다.', cost: 360 },
  { id: 'redBookmark', name: '붉은 책갈피', description: '화염/독 계열 선택지 확률이 증가합니다.', cost: 360 },
  { id: 'treasureMap', name: '작은 보물지도', description: '보스 처치 후 픽업 보상이 조금 좋아집니다.', cost: 700 },
];

const hud = {
  root: document.querySelector<HTMLElement>('#hud'),
  stageLabel: document.querySelector<HTMLElement>('[data-stage-label]'),
  time: document.querySelector<HTMLElement>('[data-time]'),
  hp: document.querySelector<HTMLElement>('[data-hp]'),
  hpFill: document.querySelector<HTMLElement>('[data-hp-fill]'),
  level: document.querySelector<HTMLElement>('[data-level]'),
  kills: document.querySelector<HTMLElement>('[data-kills]'),
  goldRun: document.querySelector<HTMLElement>('[data-gold-run]'),
  xp: document.querySelector<HTMLElement>('[data-xp]'),
  weapons: document.querySelector<HTMLElement>('[data-weapons]'),
  lobby: document.querySelector<HTMLElement>('#lobby'),
  startFlow: document.querySelector<HTMLButtonElement>('#start-flow-btn'),
  shopRoot: document.querySelector<HTMLButtonElement>('#shop-root-btn'),
  load: document.querySelector<HTMLButtonElement>('#load-btn'),
  settingsRoot: document.querySelector<HTMLButtonElement>('#settings-root-btn'),
  start: document.querySelector<HTMLButtonElement>('#start-btn'),
  characterList: document.querySelector<HTMLElement>('[data-character-list]'),
  saveStatus: document.querySelector<HTMLElement>('[data-save-status]'),
  lobbySummary: document.querySelector<HTMLElement>('[data-lobby-summary]'),
  shopList: document.querySelector<HTMLElement>('[data-shop-list]'),
  artifactList: document.querySelector<HTMLElement>('[data-artifact-list]'),
  recordsList: document.querySelector<HTMLElement>('[data-records-list]'),
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

type SceneController = { startQueuedRun: (stage: StageId, character: CharacterId) => void };
let activeScene: SceneController | undefined;
let queuedStart: { stage: StageId; character: CharacterId } | undefined;

function openPanelDom(name: string): void {
  for (const panel of document.querySelectorAll<HTMLElement>('[data-panel]')) {
    panel.classList.toggle('active', panel.dataset.panel === name);
  }
}

function stageFromValue(value: unknown): StageId {
  return STAGE_IDS.includes(value as StageId) ? value as StageId : 'graveyard';
}

function selectedStage(): StageId {
  return stageFromValue(document.querySelector<HTMLInputElement>('input[name="stage"]:checked')?.value);
}

function setSelectedStage(stage: StageId): void {
  const input = document.querySelector<HTMLInputElement>(`input[name="stage"][value="${stage}"]`);
  if (input) input.checked = true;
}

function getCharacter(id: CharacterId): CharacterDef {
  return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

function createMetaDefaults(): Record<MetaUpgradeId, number> {
  return Object.fromEntries(META_UPGRADES.map((upgrade) => [upgrade.id, 0])) as Record<MetaUpgradeId, number>;
}

function createArtifactDefaults(): Record<ArtifactId, boolean> {
  return Object.fromEntries(ARTIFACTS.map((artifact) => [artifact.id, false])) as Record<ArtifactId, boolean>;
}

function createDefaultSave(): SaveData {
  return {
    version: 6,
    gold: 160,
    totalGold: 160,
    totalKills: 0,
    bestTime: 0,
    lastStage: 'graveyard',
    selectedCharacter: 'aoi',
    unlockedStages: [...STAGE_IDS],
    sound: true,
    bgmVolume: 0.5,
    sfxVolume: 0.5,
    meta: createMetaDefaults(),
    artifacts: createArtifactDefaults(),
    recentRuns: [],
    bestiary: {},
    storyLog: ['After School Dungeon 조사 기록이 시작되었습니다.'],
  };
}

function loadSave(): SaveData {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    for (const key of LEGACY_SAVE_KEYS) raw ??= localStorage.getItem(key);
    if (!raw) return createDefaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData> & { meta?: Partial<Record<MetaUpgradeId, number>>; artifacts?: Partial<Record<ArtifactId, boolean>> };
    const defaults = createDefaultSave();
    const meta = createMetaDefaults();
    for (const upgrade of META_UPGRADES) meta[upgrade.id] = Phaser.Math.Clamp(Number(parsed.meta?.[upgrade.id] ?? 0), 0, upgrade.max);
    const artifacts = createArtifactDefaults();
    for (const artifact of ARTIFACTS) artifacts[artifact.id] = Boolean(parsed.artifacts?.[artifact.id]);
    return {
      ...defaults,
      ...parsed,
      version: 6,
      gold: Math.max(0, Number(parsed.gold ?? defaults.gold)),
      totalGold: Math.max(0, Number(parsed.totalGold ?? parsed.gold ?? defaults.totalGold)),
      lastStage: stageFromValue(parsed.lastStage),
      selectedCharacter: CHARACTERS.some((entry) => entry.id === parsed.selectedCharacter) ? parsed.selectedCharacter as CharacterId : 'aoi',
      unlockedStages: [...STAGE_IDS],
      bgmVolume: Phaser.Math.Clamp(Number(parsed.bgmVolume ?? defaults.bgmVolume), 0, 1),
      sfxVolume: Phaser.Math.Clamp(Number(parsed.sfxVolume ?? defaults.sfxVolume), 0, 1),
      meta,
      artifacts,
      recentRuns: parsed.recentRuns ?? [],
      bestiary: parsed.bestiary ?? {},
      storyLog: parsed.storyLog ?? defaults.storyLog,
    };
  } catch {
    return createDefaultSave();
  }
}

function saveGame(data: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function metaCost(def: MetaDef, current: number): number {
  return Math.round(def.baseCost * def.growth ** current / 10) * 10;
}

function circleIntersectsRect(x: number, y: number, radius: number, rect: Phaser.Geom.Rectangle): boolean {
  const closestX = Phaser.Math.Clamp(x, rect.left, rect.right);
  const closestY = Phaser.Math.Clamp(y, rect.top, rect.bottom);
  return Phaser.Math.Distance.Squared(x, y, closestX, closestY) < radius * radius;
}

let saveData = loadSave();

document.title = GAME_TITLE;

document.addEventListener('click', (event) => {
  if (event.defaultPrevented) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest('#start-flow-btn')) openPanelDom('start');
  if (target?.closest('#shop-root-btn')) openPanelDom('shop');
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
  private runGold = 0;
  private moveSpeed = 190;
  private pickupRadius = 58;
  private damageScale = 1;
  private cooldownScale = 1;
  private projectileScale = 1;
  private durationScale = 1;
  private luck = 0;
  private goldDropBonus = 0;
  private reviveCharges = 0;
  private bossDamageScale = 1;
  private shieldTimer = 0;
  private hurtGrace = 0;
  private stillTime = 0;
  private perfumeTimer = 0;
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
    this.cameras.main.setBackgroundColor('#111927');
    this.cameras.main.setBounds(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);
    this.makeRuntimeTextures();
    this.drawWorld();
    this.player = this.add.sprite(0, 0, this.characterTexture(0)).setDepth(10).setOrigin(0.5, 0.88).setScale(0.42);
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
      this.spawnEnemy(STAGES[this.stage].enemyPool[0]);
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
    hud.shopRoot?.addEventListener('click', () => {
      this.playUiSound('open');
      this.openPanel('shop');
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
      this.startQueuedRun(selectedStage(), saveData.selectedCharacter);
    });
    hud.soundToggle?.addEventListener('change', () => this.setSound(Boolean(hud.soundToggle?.checked)));
    hud.pauseSoundToggle?.addEventListener('change', () => this.setSound(Boolean(hud.pauseSoundToggle?.checked)));
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

  private setSound(enabled: boolean): void {
    saveData.sound = enabled;
    saveGame(saveData);
    this.syncSound();
    this.updateLobbyPanels();
    this.playUiSound('toggle');
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
        <img src="${assetPath(`assets/characters/after-school/${character.id}-portrait.png`)}" alt="" />
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

  private renderShop(): void {
    for (const node of document.querySelectorAll<HTMLElement>('[data-gold-total]')) node.textContent = `${Math.floor(saveData.gold).toLocaleString()} G`;
    if (hud.shopList) {
      hud.shopList.innerHTML = '';
      for (const def of META_UPGRADES) {
        const level = saveData.meta[def.id];
        const cost = metaCost(def, level);
        const maxed = level >= def.max;
        const button = document.createElement('button');
        button.className = 'shop-card';
        button.disabled = maxed || saveData.gold < cost;
        button.innerHTML = `<strong>${def.name} <em>${level}/${def.max}</em></strong><span>${def.description}</span><b>${maxed ? '완료' : `${cost} G`}</b>`;
        button.addEventListener('click', () => {
          if (maxed || saveData.gold < cost) return;
          saveData.gold -= cost;
          saveData.meta[def.id] += 1;
          saveGame(saveData);
          this.playUiSound('upgrade');
          this.updateLobbyPanels();
        });
        hud.shopList.appendChild(button);
      }
    }
    if (hud.artifactList) {
      hud.artifactList.innerHTML = '';
      for (const artifact of ARTIFACTS) {
        const owned = saveData.artifacts[artifact.id];
        const button = document.createElement('button');
        button.className = 'shop-card artifact-card';
        button.disabled = owned || saveData.gold < artifact.cost;
        button.innerHTML = `<strong>${artifact.name}</strong><span>${artifact.description}</span><b>${owned ? '보유' : `${artifact.cost} G`}</b>`;
        button.addEventListener('click', () => {
          if (owned || saveData.gold < artifact.cost) return;
          saveData.gold -= artifact.cost;
          saveData.artifacts[artifact.id] = true;
          saveGame(saveData);
          this.playUiSound('upgrade');
          this.updateLobbyPanels();
        });
        hud.artifactList.appendChild(button);
      }
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
    if (hud.selectedPortrait) hud.selectedPortrait.src = assetPath(`assets/characters/after-school/${character.id}-portrait.png`);
    if (hud.selectedName) hud.selectedName.textContent = character.name;
    if (hud.selectedRole) hud.selectedRole.textContent = character.role;
    if (hud.lobbySummary) hud.lobbySummary.textContent = `${character.name} 선택됨. ${STAGES[saveData.lastStage].label} 준비 중. 방과 후 열린 던전에서 10분을 버티세요.`;
    for (const input of document.querySelectorAll<HTMLInputElement>('input[name="stage"]')) {
      input.disabled = false;
      const card = document.querySelector<HTMLElement>(`[data-stage-card="${input.value}"]`);
      card?.setAttribute('data-locked', 'false');
      const lock = card?.querySelector<HTMLElement>('[data-lock-label]');
      if (lock) lock.hidden = true;
    }
    setSelectedStage(saveData.lastStage);
    this.renderRecords();
    this.renderShop();
  }

  private renderRecords(): void {
    if (!hud.recordsList) return;
    if (saveData.recentRuns.length === 0) {
      hud.recordsList.innerHTML = '<article><strong>최근 전투</strong><br>아직 저장된 전투 기록이 없습니다.</article>';
      return;
    }
    hud.recordsList.innerHTML = saveData.recentRuns.slice(0, 8).map((run, index) => {
      const title = index === 0 ? '최근 전투' : `저장 슬롯 ${index + 1}`;
      return `<article><strong>${title}</strong><br>${STAGES[run.stage].label} · ${getCharacter(run.character).name}<br>${formatTime(run.time)} 생존 · 처치 ${run.kills} · 획득 ${run.goldEarned ?? 0}G · ${run.victory ? '생존 성공' : '귀환'}</article>`;
    }).join('');
  }

  private openPanel(name: string): void {
    openPanelDom(name);
    this.updateLobbyPanels();
  }

  startQueuedRun(stage: StageId, character: CharacterId): void {
    this.startRun(stage, character);
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
    this.stage = stage;
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
    this.runGold = 0;
    this.maxHp = 100 + saveData.meta.vitality * 5;
    this.hp = this.maxHp;
    this.moveSpeed = 190 * (1 + saveData.meta.speed * 0.02);
    this.pickupRadius = 58 + saveData.meta.magnet * 8;
    this.damageScale = 1;
    this.cooldownScale = 1 - saveData.meta.cooldown * 0.015;
    this.projectileScale = Math.min(1.45, 1 + saveData.meta.projectileSize * 0.03);
    this.durationScale = 1 + saveData.meta.duration * 0.04;
    this.luck = saveData.meta.luck * 0.03;
    this.goldDropBonus = saveData.meta.gold * 0.015;
    this.reviveCharges = saveData.meta.revive;
    this.bossDamageScale = 1;
    this.shieldTimer = 0;
    this.hurtGrace = 0;
    this.stillTime = 0;
    this.perfumeTimer = 0;
    this.nextBossTime = 300;
    this.lastMoveX = 1;
    this.touchVector = { x: 0, y: 0 };
    hud.touchStick?.style.setProperty('transform', 'translate(-50%, -50%)');
    this.player?.setPosition(0, 0);
    this.player?.setTexture(this.characterTexture(0));
    this.player?.setOrigin(0.5, 0.88);
    this.player?.setScale(0.42);
    this.player?.setRotation(0);
    this.applyCharacterAndArtifacts();
    this.drawWorld();
  }

  private applyCharacterAndArtifacts(): void {
    const character = getCharacter(this.character);
    this.weapons = [{ id: character.startWeapon, name: WEAPON_NAMES[character.startWeapon], level: 1, cooldown: WEAPON_COOLDOWNS[character.startWeapon] * this.cooldownScale, timer: 0.35 }];
    if (character.pickupBonus) this.pickupRadius += character.pickupBonus;
    if (character.speedMultiplier) this.moveSpeed *= character.speedMultiplier;
    if (character.damageMultiplier) this.damageScale *= character.damageMultiplier;
    if (character.bossDamageMultiplier) this.bossDamageScale = character.bossDamageMultiplier;
    if (character.cooldownMultiplier) {
      this.cooldownScale *= character.cooldownMultiplier;
      for (const weapon of this.weapons) weapon.cooldown *= character.cooldownMultiplier;
    }
    if (saveData.artifacts.starCandy) this.xpNeed = Math.max(8, Math.round(this.xpNeed * 0.92));
    if (saveData.artifacts.goldPouch) this.goldDropBonus += 0.02;
    if (saveData.artifacts.toyCrown) {
      this.bossDamageScale *= 1.08;
      this.damageScale *= 0.96;
    }
    if (saveData.artifacts.redBookmark) this.damageScale *= 1.02;
    if (saveData.artifacts.blueBookmark) this.cooldownScale *= 0.98;
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
    this.hurtGrace = Math.max(0, this.hurtGrace - dt);
    this.updatePlayer(dt);
    this.updateWeapons(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateArtifactTimers(dt);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnWave();
      this.spawnTimer = Math.max(0.34, 1.36 - this.elapsed / 560);
    }
    if (this.elapsed >= this.nextBossTime) {
      this.spawnEnemy(STAGES[this.stage].boss);
      this.nextBossTime += 120;
    }
    if (this.elapsed >= 600 && !this.won) this.endRun(true);
    if (this.hp <= 0) {
      if (this.reviveCharges > 0) {
        this.reviveCharges -= 1;
        this.hp = Math.max(35, this.maxHp * 0.45);
        this.hurtGrace = 2.2;
        if (!this.deterministicStepping) this.cameras.main.flash(260, 120, 220, 255);
      } else {
        this.endRun(false);
      }
    }
    this.updateHud();
  }

  private updateArtifactTimers(dt: number): void {
    if (saveData.artifacts.moonPerfume) {
      this.perfumeTimer -= dt;
      if (this.perfumeTimer <= 0) {
        this.perfumeTimer = 8;
        let best: Pickup | undefined;
        let bestDist = 280 * 280;
        for (const pickup of this.pickups) {
          const dist = Phaser.Math.Distance.Squared(this.player.x, this.player.y, pickup.sprite.x, pickup.sprite.y);
          if (dist < bestDist) {
            best = pickup;
            bestDist = dist;
          }
        }
        if (best) best.magnetized = true;
      }
    }
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
    this.stillTime = moving ? 0 : this.stillTime + dt;
    if (Math.abs(dx) > 0.05) this.lastMoveX = dx;
    const len = Math.hypot(dx, dy) || 1;
    const nextX = Phaser.Math.Clamp(this.player.x + (dx / len) * this.moveSpeed * dt, -WORLD_SIZE / 2 + 28, WORLD_SIZE / 2 - 28);
    const nextY = Phaser.Math.Clamp(this.player.y + (dy / len) * this.moveSpeed * dt, -WORLD_SIZE / 2 + 28, WORLD_SIZE / 2 - 28);
    if (!this.collidesAt(nextX, this.player.y, 18)) this.player.x = nextX;
    if (!this.collidesAt(this.player.x, nextY, 18)) this.player.y = nextY;
    const walkFrame = Math.floor(this.elapsed * 8) % 4;
    this.player.setTexture(this.characterTexture(moving ? walkFrame + 1 : 0));
    this.player.setOrigin(0.5, 0.88);
    this.player.setFlipX(this.lastMoveX < 0);
    this.player.setRotation(0);
  }

  private characterTexture(frame: number): string {
    return `${this.character}-${Phaser.Math.Clamp(frame, 0, 4)}`;
  }

  private updateWeapons(dt: number): void {
    const lowHpBoost = saveData.artifacts.blackRibbon && this.hp / this.maxHp < 0.4 ? 0.9 : 1;
    const stillBoost = saveData.artifacts.brokenClock && this.stillTime > 2 ? 0.88 : 1;
    for (const weapon of this.weapons) {
      weapon.timer -= dt;
      if (weapon.timer > 0) continue;
      this.fireWeapon(weapon);
      weapon.timer = Math.max(0.16, weapon.cooldown * lowHpBoost * stillBoost);
    }
  }

  private fireWeapon(weapon: WeaponState): void {
    if (weapon.id === 'spark') this.fireSpark(weapon);
    if (weapon.id === 'blade') this.fireBlade(weapon);
    if (weapon.id === 'bolt') this.fireBolt(weapon);
    if (weapon.id === 'flame') this.fireFlame(weapon);
    if (weapon.id === 'star') this.fireStar(weapon);
    if (weapon.id === 'talisman') this.fireTalisman(weapon);
    if (weapon.id === 'crystal') this.fireCrystal(weapon);
    if (weapon.id === 'frost') this.fireFrost(weapon);
    if (weapon.id === 'poison') this.firePoison(weapon);
    if (weapon.id === 'field') this.fireField(weapon);
    if (weapon.id === 'chain') this.fireChain(weapon);
    if (weapon.id === 'shield') this.fireShield(weapon);
  }

  private nearestEnemy(max = 840): Enemy | undefined {
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
    for (let i = 0; i < count; i += 1) this.spawnProjectile('starShot', 'spark', baseAngle + (i - (count - 1) / 2) * 0.16, 540, 19 + weapon.level * 5, 1.22, 1 + Math.floor(weapon.level / 3), 12);
    this.playShot(0.55);
  }

  private fireCrystal(weapon: WeaponState): void {
    const count = 2 + Math.floor(weapon.level / 2);
    const baseAngle = this.nearestEnemy() ? Phaser.Math.Angle.Between(this.player.x, this.player.y, this.nearestEnemy()!.sprite.x, this.nearestEnemy()!.sprite.y) : Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i += 1) this.spawnProjectile('crystalShot', 'crystal', baseAngle + (i - (count - 1) / 2) * 0.22, 620, 15 + weapon.level * 4, 1.05, 2, 11);
    this.playShot(0.5);
  }

  private fireBlade(weapon: WeaponState): void {
    const count = 4 + weapon.level;
    for (let i = 0; i < count; i += 1) this.spawnProjectile('bladeShot', 'blade', this.elapsed * 2.2 + (Math.PI * 2 * i) / count, 285, 11 + weapon.level * 4, 1.25, 3, 15);
    this.playShot(0.28);
  }

  private fireTalisman(weapon: WeaponState): void {
    const count = 5 + weapon.level;
    for (let i = 0; i < count; i += 1) this.spawnProjectile('talismanShot', 'talisman', this.elapsed * 3 + (Math.PI * 2 * i) / count, 340, 12 + weapon.level * 4, 1.15, 3, 13);
    this.playShot(0.42);
  }

  private fireBolt(weapon: WeaponState): void {
    const count = 1 + Math.floor(weapon.level / 2);
    for (let i = 0; i < count; i += 1) {
      const target = this.nearestEnemy(960);
      const x = (target?.sprite.x ?? this.player.x + Phaser.Math.Between(-360, 360)) + Phaser.Math.Between(-40, 40);
      const y = (target?.sprite.y ?? this.player.y + Phaser.Math.Between(-360, 360)) + Phaser.Math.Between(-40, 40);
      this.spawnStaticProjectile('lightningStrike', 'bolt', x, y, 36 + weapon.level * 10, 0.36, 999, 48);
    }
    this.playShot(0.8);
  }

  private fireFlame(weapon: WeaponState): void {
    const target = this.nearestEnemy(760);
    const angle = target ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.sprite.x, target.sprite.y) : (this.lastMoveX < 0 ? Math.PI : 0);
    const sprite = this.spawnProjectile('flameBreath', 'flame', angle, 190, 10 + weapon.level * 4, 0.7 * this.durationScale, 999, 38 + weapon.level * 2);
    sprite.sprite.setScale(0.3 * this.projectileScale, 0.55 * this.projectileScale);
    this.playShot(0.65);
  }

  private fireFrost(weapon: WeaponState): void {
    const angle = this.nearestEnemy() ? Phaser.Math.Angle.Between(this.player.x, this.player.y, this.nearestEnemy()!.sprite.x, this.nearestEnemy()!.sprite.y) : Math.random() * Math.PI * 2;
    const projectile = this.spawnProjectile('iceBreath', 'frost', angle, 170, 8 + weapon.level * 3, 0.9 * this.durationScale, 999, 42 + weapon.level * 2);
    projectile.sprite.setScale(0.28 * this.projectileScale, 0.52 * this.projectileScale);
    this.playShot(0.45);
  }

  private firePoison(weapon: WeaponState): void {
    const target = this.nearestEnemy(820);
    const x = target?.sprite.x ?? this.player.x + Phaser.Math.Between(-280, 280);
    const y = target?.sprite.y ?? this.player.y + Phaser.Math.Between(-280, 280);
    const projectile = this.spawnStaticProjectile('poisonCloud', 'poison', x, y, 7 + weapon.level * 3, 2.4 * this.durationScale, 999, 58 + weapon.level * 4);
    projectile.sprite.setAlpha(0.82).setScale(0.23 * this.projectileScale);
    this.playShot(0.32);
  }

  private fireField(weapon: WeaponState): void {
    const target = this.nearestEnemy(760);
    const x = target?.sprite.x ?? this.player.x;
    const y = target?.sprite.y ?? this.player.y;
    const projectile = this.spawnStaticProjectile('magicField', 'field', x, y, 9 + weapon.level * 4, 2.1 * this.durationScale, 999, 62 + weapon.level * 5);
    projectile.sprite.setScale(0.22 * this.projectileScale);
    this.playShot(0.36);
  }

  private fireStar(weapon: WeaponState): void {
    const target = this.nearestEnemy(940);
    const baseX = target?.sprite.x ?? this.player.x + Phaser.Math.Between(-300, 300);
    const baseY = target?.sprite.y ?? this.player.y + Phaser.Math.Between(-300, 300);
    for (let i = 0; i < 2 + Math.floor(weapon.level / 2); i += 1) {
      const sprite = this.add.sprite(baseX + Phaser.Math.Between(-90, 90), baseY - 300, 'starTrail').setDepth(7).setScale(0.38 * this.projectileScale);
      this.projectiles.push({ sprite, vx: 0, vy: 620, damage: (34 + weapon.level * 10) * this.damageScale, radius: 18 * this.projectileScale, life: 0.75, maxLife: 0.75, pierce: 4, weapon: 'star', hitIds: new Set() });
    }
    this.playShot(0.68);
  }

  private fireChain(weapon: WeaponState): void {
    const target = this.nearestEnemy(940);
    if (!target) return;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.sprite.x, target.sprite.y);
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.sprite.x, target.sprite.y);
    const sprite = this.add.sprite((this.player.x + target.sprite.x) / 2, (this.player.y + target.sprite.y) / 2, 'chainLightning').setDepth(8).setRotation(angle).setDisplaySize(dist, 52 * this.projectileScale);
    this.projectiles.push({ sprite, vx: 0, vy: 0, damage: (23 + weapon.level * 7) * this.damageScale, radius: 52 * this.projectileScale, life: 0.22, maxLife: 0.22, pierce: 3 + Math.floor(weapon.level / 2), weapon: 'chain', hitIds: new Set() });
    this.playShot(0.72);
  }

  private fireShield(weapon: WeaponState): void {
    this.shieldTimer = Math.max(this.shieldTimer, 1.8 + weapon.level * 0.45);
    const projectile = this.spawnStaticProjectile('shieldOrb', 'shield', this.player.x, this.player.y, 9 + weapon.level * 3, this.shieldTimer, 999, 52 + weapon.level * 3);
    projectile.sprite.setScale(0.34 * this.projectileScale).setAlpha(0.65);
    this.playShot(0.25);
  }

  private spawnProjectile(texture: string, weapon: WeaponId, angle: number, speed: number, damage: number, life: number, pierce: number, radius: number): Projectile {
    const sprite = this.add.sprite(this.player.x + Math.cos(angle) * 30, this.player.y + Math.sin(angle) * 24, texture).setDepth(7);
    sprite.rotation = angle;
    sprite.setScale(this.projectileScale);
    const projectile = { sprite, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage: damage * this.damageScale, radius: radius * this.projectileScale, life, maxLife: life, pierce, weapon, hitIds: new Set<number>() };
    this.projectiles.push(projectile);
    return projectile;
  }

  private spawnStaticProjectile(texture: string, weapon: WeaponId, x: number, y: number, damage: number, life: number, pierce: number, radius: number): Projectile {
    const sprite = this.add.sprite(x, y, texture).setDepth(7).setScale(this.projectileScale);
    const projectile = { sprite, vx: 0, vy: 0, damage: damage * this.damageScale, radius: radius * this.projectileScale, life, maxLife: life, pierce, weapon, hitIds: new Set<number>() };
    this.projectiles.push(projectile);
    return projectile;
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
    if (contactDamage > 0 && this.hurtGrace <= 0) {
      const artifactPenalty = saveData.artifacts.blackRibbon && this.hp / this.maxHp < 0.4 ? 1.08 : 1;
      const shieldCut = this.shieldTimer > 0 || saveData.artifacts.glassBell ? 0.72 : 1;
      this.hp -= contactDamage * CONTACT_DAMAGE_SCALE * artifactPenalty * shieldCut * dt;
      if (saveData.artifacts.glassBell) this.hurtGrace = 0.18;
    }
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
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
      if (projectile.weapon === 'shield') projectile.sprite.setPosition(this.player.x, this.player.y);
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
        pickup.sprite.x += Math.cos(angle) * 460 * dt;
        pickup.sprite.y += Math.sin(angle) * 460 * dt;
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
    return Math.min(96, 7 + Math.floor(this.elapsed / 8));
  }

  private pickEnemyKind(): EnemyKind {
    const pool = STAGES[this.stage].enemyPool;
    const minute = Math.floor(this.elapsed / 60);
    const maxIndex = Phaser.Math.Clamp(2 + Math.floor(minute / 2), 2, pool.length);
    return pool[Phaser.Math.Between(0, maxIndex - 1)];
  }

  private spawnEnemy(kind: EnemyKind): void {
    const stats = this.enemyStats(kind);
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const side = Phaser.Math.Between(0, 3);
      const distance = stats.boss ? 650 : Phaser.Math.Between(450, 580);
      const cx = this.player.x;
      const cy = this.player.y;
      x = side === 0 ? cx - distance : side === 1 ? cx + distance : cx + Phaser.Math.Between(-distance, distance);
      y = side === 2 ? cy - distance : side === 3 ? cy + distance : cy + Phaser.Math.Between(-distance, distance);
      x = Phaser.Math.Clamp(x, -WORLD_SIZE / 2 + 80, WORLD_SIZE / 2 - 80);
      y = Phaser.Math.Clamp(y, -WORLD_SIZE / 2 + 80, WORLD_SIZE / 2 - 80);
      if (!this.collidesAt(x, y, stats.r)) break;
    }
    const sprite = this.add.sprite(x, y, kind).setDepth(stats.boss ? 8 : 6).setOrigin(0.5, 0.78);
    sprite.setScale(stats.boss ? 0.88 : 0.48);
    if (stats.boss && !this.deterministicStepping) this.cameras.main.shake(220, 0.004);
    this.enemies.push({ id: this.enemyId++, kind, sprite, hp: stats.hp, maxHp: stats.hp, speed: stats.speed, damage: stats.damage, xp: stats.xp, radius: stats.r, isBoss: Boolean(stats.boss), animOffset: Math.random() * 10 });
    saveData.bestiary[kind] = Math.max(1, saveData.bestiary[kind] ?? 0);
  }

  private enemyStats(kind: EnemyKind): EnemyStat {
    const t = this.elapsed;
    const bossScale = 1 + STAGE_IDS.indexOf(this.stage) * 0.18;
    const stats: Record<EnemyKind, EnemyStat> = {
      bat: { hp: 24 + t * 0.18, speed: 82, damage: 28, xp: 2, r: 15 },
      slime: { hp: 34 + t * 0.22, speed: 54, damage: 24, xp: 3, r: 18 },
      skull: { hp: 68 + t * 0.4, speed: 64, damage: 42, xp: 5, r: 19, strong: true },
      mage: { hp: 54 + t * 0.31, speed: 74, damage: 38, xp: 7, r: 18, strong: true },
      reaper: { hp: (680 + t * 2.0) * bossScale, speed: 48, damage: 72, xp: 44, r: 42, boss: true },
      wisp: { hp: 30 + t * 0.21, speed: 110, damage: 30, xp: 3, r: 15 },
      oni: { hp: 88 + t * 0.44, speed: 60, damage: 52, xp: 7, r: 22, strong: true },
      lancer: { hp: 64 + t * 0.34, speed: 86, damage: 46, xp: 8, r: 18, strong: true },
      kitsune: { hp: (760 + t * 2.25) * bossScale, speed: 56, damage: 86, xp: 58, r: 46, boss: true },
      mushroom: { hp: 42 + t * 0.24, speed: 58, damage: 28, xp: 4, r: 19 },
      candle: { hp: 38 + t * 0.22, speed: 76, damage: 32, xp: 4, r: 17 },
      paperdoll: { hp: 44 + t * 0.28, speed: 90, damage: 34, xp: 5, r: 17 },
      talismanSpirit: { hp: 72 + t * 0.36, speed: 72, damage: 42, xp: 7, r: 19, strong: true },
      jelly: { hp: 40 + t * 0.24, speed: 62, damage: 30, xp: 4, r: 18 },
      candyBat: { hp: 34 + t * 0.24, speed: 118, damage: 32, xp: 4, r: 16 },
      cookieSoldier: { hp: 82 + t * 0.42, speed: 58, damage: 48, xp: 7, r: 22, strong: true },
      cottonGhost: { hp: (700 + t * 2.1) * bossScale, speed: 54, damage: 74, xp: 54, r: 44, boss: true },
      shellSlime: { hp: 74 + t * 0.36, speed: 50, damage: 38, xp: 6, r: 21, strong: true },
      droplet: { hp: 36 + t * 0.2, speed: 122, damage: 32, xp: 4, r: 16 },
      coralKnight: { hp: 96 + t * 0.5, speed: 58, damage: 54, xp: 9, r: 23, strong: true },
      pearlMage: { hp: (790 + t * 2.25) * bossScale, speed: 52, damage: 84, xp: 58, r: 46, boss: true },
      clockDoll: { hp: 54 + t * 0.3, speed: 96, damage: 38, xp: 5, r: 18 },
      stardust: { hp: 42 + t * 0.26, speed: 132, damage: 34, xp: 5, r: 16 },
      clockMage: { hp: (840 + t * 2.4) * bossScale, speed: 60, damage: 88, xp: 62, r: 46, boss: true },
      bellKnight: { hp: 112 + t * 0.55, speed: 54, damage: 58, xp: 10, r: 24, strong: true },
    };
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
      if (saveData.artifacts.treasureMap) this.dropPickup(enemy.sprite.x, enemy.sprite.y - 24, 'gold', Phaser.Math.Between(6, 12));
    }
    this.dropPickup(enemy.sprite.x, enemy.sprite.y, 'xp', Math.round(enemy.xp * (saveData.artifacts.starCandy ? 1.08 : 1)));
    this.maybeDropGold(enemy);
    if (Math.random() < 0.03 + this.luck * 0.1) this.dropPickup(enemy.sprite.x, enemy.sprite.y, 'heart', 20);
    if (Math.random() < 0.014 + this.luck * 0.04) this.dropPickup(enemy.sprite.x, enemy.sprite.y, 'magnet', 1);
    if (Math.random() < 0.01 + this.luck * 0.03) this.dropPickup(enemy.sprite.x, enemy.sprite.y, 'bomb', 1);
    enemy.sprite.destroy();
    this.enemies.splice(index, 1);
    this.playImpact();
  }

  private maybeDropGold(enemy: Enemy): void {
    const stats = this.enemyStats(enemy.kind);
    const base = stats.boss ? 0.18 : stats.elite ? 0.15 : stats.strong ? 0.07 : 0.04;
    const chance = base + this.goldDropBonus + this.luck * 0.22;
    if (Math.random() > chance) return;
    const value = stats.boss ? Phaser.Math.Between(8, 14) : stats.strong ? Phaser.Math.Between(1, 2) : 1;
    this.dropPickup(enemy.sprite.x + Phaser.Math.Between(-12, 12), enemy.sprite.y + Phaser.Math.Between(-12, 12), 'gold', value);
  }

  private dropPickup(x: number, y: number, kind: PickupKind, value: number): void {
    const texture = kind === 'gold' ? (value >= 5 ? 'goldBig' : 'goldSmall') : kind;
    const sprite = this.add.sprite(x, y, texture).setDepth(5).setScale(kind === 'gold' ? 0.55 : 1);
    this.pickups.push({ kind, sprite, value, radius: kind === 'gold' ? 18 : 16, magnetized: false });
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
    if (pickup.kind === 'gold') {
      this.runGold += pickup.value;
      saveData.gold += pickup.value;
      saveData.totalGold += pickup.value;
      saveGame(saveData);
    }
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
    let available: WeaponId[] = ['spark', 'blade', 'bolt', 'flame', 'star', 'talisman', 'crystal', 'frost', 'poison', 'field', 'chain', 'shield'];
    if (saveData.artifacts.blueBookmark) available = [...available, 'bolt', 'frost', 'chain'];
    if (saveData.artifacts.redBookmark) available = [...available, 'flame', 'poison'];
    for (const id of available) {
      if (!this.weapons.some((weapon) => weapon.id === id)) unlocks.push({ title: `${WEAPON_NAMES[id]} 해금`, description: `${WEAPON_NAMES[id]}을 전투에 추가합니다.`, apply: () => this.levelWeapon(id) });
    }
    const all: Upgrade[] = [
      { title: '피해량 강화', description: '모든 무기 피해 +8%', apply: () => { this.damageScale *= 1.08; } },
      { title: '쿨다운 단축', description: '모든 무기 쿨다운 -5%', apply: () => { for (const weapon of this.weapons) weapon.cooldown *= 0.95; } },
      { title: '투사체 크기', description: '투사체와 장판 크기 +6%. 최대 45%까지만 커집니다.', apply: () => { this.projectileScale = Math.min(1.45, this.projectileScale * 1.06); } },
      { title: '지속시간 강화', description: '브레스와 장판 지속시간 +10%', apply: () => { this.durationScale *= 1.1; } },
      { title: '행운 수업', description: '희귀 선택지와 골드 드랍 확률이 조금 증가합니다.', apply: () => { this.luck += 0.05; } },
      { title: '자석 리본', description: '픽업 범위 +24', apply: () => { this.pickupRadius += 24; } },
      { title: '체력 간식', description: '최대 체력 +20, 체력 30 회복', apply: () => { this.maxHp += 20; this.hp = Math.min(this.maxHp, this.hp + 30); } },
      { title: '관통 훈련', description: '현재 무기들의 레벨을 올립니다.', apply: () => { for (const weapon of this.weapons) this.levelWeapon(weapon.id); } },
    ];
    for (const weapon of this.weapons) {
      all.push({ title: `${weapon.name} 강화`, description: `${weapon.name} 레벨 +1`, apply: () => this.levelWeapon(weapon.id) });
    }
    Phaser.Utils.Array.Shuffle(all);
    const count = saveData.meta.reroll > 0 ? 4 : 3;
    return [...unlocks, ...all].slice(0, count);
  }

  private levelWeapon(id: WeaponId): void {
    let weapon = this.weapons.find((item) => item.id === id);
    if (!weapon) {
      weapon = { id, name: WEAPON_NAMES[id], level: 0, cooldown: WEAPON_COOLDOWNS[id] * this.cooldownScale, timer: 0.1 };
      this.weapons.push(weapon);
    }
    weapon.level += 1;
    weapon.cooldown *= 0.92;
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
      hud.resultBody.textContent = `${STAGES[this.stage].label}에서 ${formatTime(this.elapsed)} 생존, ${this.kills}마리 처치. 이번 전투에서 ${this.runGold}G를 획득했습니다.`;
      hud.result.removeAttribute('hidden');
    } else {
      this.showLobby('load');
    }
  }

  private recordRun(victory: boolean): void {
    if (this.runRecorded || this.elapsed < 0.5) return;
    this.runRecorded = true;
    let clearBonus = 0;
    if (victory) {
      clearBonus = STAGES[this.stage].clearGold;
      this.runGold += clearBonus;
      saveData.gold += clearBonus;
      saveData.totalGold += clearBonus;
    }
    const record: RunRecord = {
      date: new Date().toISOString(),
      stage: this.stage,
      character: this.character,
      time: Math.floor(this.elapsed),
      kills: this.kills,
      victory,
      goldEarned: this.runGold,
    };
    saveData.bestTime = Math.max(saveData.bestTime, record.time);
    saveData.totalKills += this.kills;
    saveData.lastStage = this.stage;
    saveData.selectedCharacter = this.character;
    saveData.unlockedStages = [...STAGE_IDS];
    saveData.recentRuns = [record, ...saveData.recentRuns].slice(0, 12);
    const story = victory
      ? `${STAGES[this.stage].label}의 10분 생존 기록을 확보했습니다. 클리어 보너스 ${clearBonus}G를 받았습니다.`
      : `${STAGES[this.stage].label} 조사에서 ${formatTime(this.elapsed)}까지 버텼습니다.`;
    saveData.storyLog = [story, ...saveData.storyLog].slice(0, 20);
    saveGame(saveData);
    this.updateLobbyPanels();
  }

  private collidesAt(x: number, y: number, radius: number): boolean {
    return this.obstacles.some((obstacle) => circleIntersectsRect(x, y, radius, obstacle.rect));
  }

  private projectileHitsObstacle(projectile: Projectile): boolean {
    if (['bolt', 'star', 'field', 'poison', 'chain', 'shield'].includes(projectile.weapon)) return false;
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
        const index = Math.abs((tileX * 73856093) ^ (tileY * 19349663) ^ (STAGE_IDS.indexOf(this.stage) * 83492791)) % stage.tiles.length;
        const key = `terrain-${stage.tiles[index % stage.tiles.length]}`;
        uniqueTiles.add(key);
        const tile = this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, key).setDepth(-24).setDisplaySize(TILE_SIZE + 1, TILE_SIZE + 1);
        this.mapObjects.push(tile);
      }
    }
    this.terrainVariantCount = uniqueTiles.size;
    for (let i = 0; i < 105; i += 1) {
      const key = stage.decals[i % stage.decals.length];
      const decal = this.add.image(Phaser.Math.Between(-half, half), Phaser.Math.Between(-half, half), `obs-${key}`)
        .setDepth(-10)
        .setAlpha(key === 'mist' ? 0.15 : 0.34)
        .setScale(Phaser.Math.FloatBetween(0.42, 0.95))
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
    for (const projectile of this.projectiles) {
      const t = Phaser.Math.Clamp(projectile.life / projectile.maxLife, 0, 1);
      projectile.sprite.setAlpha(Math.max(0.22, Math.min(1, t)));
    }
  }

  private updateHud(): void {
    if (hud.stageLabel) hud.stageLabel.textContent = STAGES[this.stage].label;
    if (hud.time) hud.time.textContent = formatTime(this.elapsed);
    if (hud.hp) hud.hp.textContent = `${Math.max(0, Math.ceil(this.hp))}/${this.maxHp}`;
    if (hud.hpFill) hud.hpFill.style.width = `${Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1) * 100}%`;
    if (hud.level) hud.level.textContent = `Lv.${this.level}`;
    if (hud.kills) hud.kills.textContent = `${this.kills}`;
    if (hud.goldRun) hud.goldRun.textContent = `${this.runGold}G`;
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
      mode: !this.started ? 'lobby' : this.pausedForUpgrade ? 'levelup' : this.manualPaused ? 'pause' : 'playing',
      stage: this.stage,
      character: this.character,
      save: {
        version: saveData.version,
        gold: saveData.gold,
        totalGold: saveData.totalGold,
        totalKills: saveData.totalKills,
        bestTime: saveData.bestTime,
        selectedCharacter: saveData.selectedCharacter,
        recentRuns: saveData.recentRuns,
        bestiary: saveData.bestiary,
        unlockedStages: saveData.unlockedStages,
        meta: saveData.meta,
        artifacts: saveData.artifacts,
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
        assetSet: 'after-school-hd-v1',
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
      pickups: this.pickups.slice(0, 12).map((pickup) => ({ kind: pickup.kind, value: pickup.value, x: Math.round(pickup.sprite.x), y: Math.round(pickup.sprite.y) })),
      runGold: this.runGold,
      projectiles: this.projectiles.length,
      kills: this.kills,
      enemyCap: this.enemyCap(),
      nextBossIn: Math.max(0, Number((this.nextBossTime - this.elapsed).toFixed(1))),
      winAt: 600,
      weapons: this.weapons.map((weapon) => `${weapon.name} ${weapon.level}`),
      content: {
        stages: STAGE_IDS.length,
        enemyKinds: Object.keys(ENEMY_NAMES).length,
        weaponKinds: Object.keys(WEAPON_NAMES).length,
        metaUpgrades: META_UPGRADES.length,
        artifacts: ARTIFACTS.length,
      },
    });
  }

  private loadAssets(): void {
    for (const character of CHARACTERS) {
      for (let i = 0; i < 5; i += 1) this.load.image(`${character.id}-${i}`, assetPath(`assets/characters/after-school/${character.id}-${i}.png`));
    }
    for (const key of ['bat', 'bat0', 'bat1', 'slime', 'slime0', 'slime1', 'skull', 'skull0', 'skull1', 'mage', 'mage0', 'mage1', 'reaper', 'wisp', 'wisp0', 'oni', 'oni0', 'lancer', 'lancer0', 'kitsune']) {
      this.load.image(key, assetPath(`assets/gpt-sprites/sliced/${key}.png`));
    }
    for (const key of ['mushroom', 'candle', 'paperdoll', 'talismanSpirit', 'jelly', 'candyBat', 'cookieSoldier', 'cottonGhost', 'shellSlime', 'droplet', 'coralKnight', 'pearlMage', 'clockDoll', 'stardust', 'clockMage', 'bellKnight']) {
      this.load.image(key, assetPath(`assets/monsters/after-school/${key}.png`));
    }
    for (const key of ['xp', 'heart', 'magnet', 'bomb', 'sparkShot', 'bladeShot', 'boltShot', 'flameShot']) this.load.image(key, assetPath(`assets/gpt-sprites/sliced/${key}.png`));
    for (const key of ['starShot', 'starTrail', 'crystalShot', 'lightningStrike', 'flameBreath', 'iceBreath', 'poisonCloud', 'magicField', 'explosion', 'chainLightning', 'shieldOrb', 'goldSmall', 'goldBig']) {
      this.load.image(key, assetPath(`assets/vfx/after-school/${key}.png`));
    }
    for (const stage of STAGE_IDS) for (const key of TERRAIN_KEYS[stage]) this.load.image(`terrain-${key}`, assetPath(`assets/maps/after-school/${stage}/${key}.png`));
    for (const key of ['bones', 'petals', 'paper', 'mist', 'gravestone', 'dead-tree', 'ruined-wall', 'stone-pillar', 'bookshelf', 'desk', 'academy-column', 'altar']) {
      this.load.image(`obs-${key}`, assetPath(`assets/maps/obstacles/${key}.png`));
    }
  }

  private makeRuntimeTextures(): void {
    this.makeProjectileTexture('talismanShot', 0xffd767);
    this.makeProjectileTexture('bladeShot', 0xf5f2ff);
    this.makeProjectileTexture('xp', 0x74d7ff);
  }

  private makeProjectileTexture(key: string, color: number): void {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 0.2).fillCircle(20, 20, 18);
    g.fillStyle(color).fillCircle(20, 20, 10);
    g.fillStyle(0xffffff, 0.55).fillCircle(16, 15, 4);
    g.generateTexture(key, 40, 40);
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
    osc.frequency.setValueAtTime(spec.a, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, spec.b), now + spec.dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, spec.vol * output), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + spec.dur + 0.015);
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
    osc.stop(now + 0.1);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#111927',
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [SurvivalScene],
};

new Phaser.Game(config);

# ChatGPT Asset Pipeline

This project now ships with a GPT-generated PNG atlas under `public/assets/gpt-sprites`. The legacy generated SVG sprites remain under `public/assets/sprites` as fallback references. The manifest below defines the image-generation targets used by the runtime.

## Global Style

Prompt style for every sheet:

> Top-down 2D dark fantasy survivor game sprite sheet, readable at 64x64, clean silhouette, slightly painterly pixel-art hybrid, transparent background, consistent 3/4 top-down lighting, high contrast, no text, no UI, no watermark.

## Character Sheet

Key: `hero`

Prompt:

> A tasteful young adult anime-style magical heroine wearing a Japanese school uniform for a Vampire Survivors-like game: navy sailor jacket, white collar, red ribbon, pleated skirt over opaque dark leggings, short boots, small cyan magical charm, compact readable silhouette, top-down 2D sprite sheet. Include idle frame and two walk frames. Transparent background. Each frame centered in a 64x76 cell.

Runtime replacement keys:

- `hero`
- `hero0`
- `hero1`

## Enemy Sheets

Key: `bat`

> Purple bat monster, round body, wide ears, glowing eyes, top-down 2D sprite sheet, two flap frames and one hit frame, transparent background, 48x48 cells.

Key: `slime`

> Green slime goblin-like blob monster, cute but hostile, two wobble frames and one hit frame, transparent background, 48x48 cells.

Key: `skull`

> Floating bone skull enemy, cracked skull, small shadow, two hover frames and one hit frame, transparent background, 48x48 cells.

Key: `mage`

> Blue cult mage enemy, hood, glowing eyes, small staff silhouette, two hover/walk frames and one hit frame, transparent background, 48x48 cells.

Key: `reaper`

> Large reaper miniboss, purple-black cloak, golden ritual ring aura, intimidating round silhouette, top-down 2D boss sprite, transparent background, 96x96 cell.

## Item Sheets

Keys: `xp`, `heart`, `magnet`, `bomb`

Prompt:

> Collectible item icons for a dark fantasy survivor game: cyan experience crystal, red heart, golden magnet, black bomb with orange glow. Top-down readable icons, transparent background, 32x32 cells.

## Weapon FX Sheets

Keys: `sparkShot`, `bladeShot`, `boltShot`, `flameShot`

Prompt:

> Weapon effect sprites for a Vampire Survivors-like game: cyan magic bolt, silver spinning blade, electric blue lightning orb, orange flame pool. Readable at small size, transparent background, 32x32 cells, bright core and soft glow.

## Integration Notes

1. Export PNG sheets with transparent background.
2. Preserve the runtime keys in `src/main.ts`.
3. Replace `makeHeroTexture`, `makeEnemyTexture`, `makeOrbTexture`, and `makeProjectileTexture` with Phaser `load.spritesheet` calls.
4. Keep `render_game_to_text` unchanged so automated playtests still verify behavior independently from visual assets.

Original prompt: ChatGPT 생성/참조형 에셋 파이프라인을 활용해 브라우저에서 플레이 가능한 뱀파이어 서바이벌 스타일 2D 생존 액션 게임을 설계하고 구현한다. 캐릭터, 적, 아이템, 무기, 레벨업/업그레이드, 웨이브, 사운드, HUD, 플레이테스트까지 포함한다.

Progress:
- Created separate `vampire-survivor` Phaser/Vite project scaffold.
- Implemented Phaser survival loop: WASD movement, generated sprites, auto weapons, enemy waves, pickups, level-up upgrade cards, HUD, WebAudio sounds, `render_game_to_text`, and `advanceTime`.
- First build passed. First browser smoke test showed early combat was too distant, so spawn range and projectile life were adjusted.
- Added 10-minute victory condition, 60-second reaper miniboss cadence, boss rewards, stronger wave scaling, upgrade unlock priority for bolt/flame, richer generated background details, and boss texture.
- Browser pacing test exposed two issues: deterministic `advanceTime` continued after game over, and contact damage stacked per enemy. Fixed `advanceTime` to stop when not playing/levelup and changed contact damage to highest overlapping enemy per frame.
- Build passed after fixes. Browser playtest verified level 6, 202 kills, bolt/flame unlocks, 60-second reaper boss present (`bossCount: 1`), and active play at 01:03 with hp 120/120.
- Added `asset-pipeline/asset-prompts.md` and `asset-manifest.json` for ChatGPT/image-generation replacement sheets. Runtime keys now include `hero0/hero1` and enemy frame variants.
- Improved generated canvas sprites with simple frame animation, shadows, glows, and stronger pickup/projectile silhouettes.
- Added `asset-pipeline/generate-svg-assets.mjs`, generated actual external SVG files in `public/assets/sprites`, and switched Phaser preload to file-based assets. This makes the active runtime follow the same manifest keys that future GPT PNG sheets will replace.
- File asset browser test confirmed SVG keys load successfully, but stationary test died around 20 seconds, so early contact damage was reduced to improve survival pacing.
- Added title/menu art using the current external sprite files, added a visible reaper boss HP bar, improved upgrade card emphasis, and added pause/fullscreen shortcuts.
- Latest build passed. Browser playtest reached about 01:06, stayed in active play, spawned the reaper boss, showed boss HUD, and confirmed all four weapon families were available.
- Updated the objective so the hero is a tasteful young adult anime-style Japanese school uniform heroine.
- Generated a GPT image atlas, copied it to `public/assets/gpt-sprites/gpt-schoolgirl-atlas.png`, sliced it into transparent runtime PNGs under `public/assets/gpt-sprites/sliced`, and switched Phaser loading plus title art to those PNG files.
- Added `asset-pipeline/slice-gpt-atlas.py` so future GPT atlases can be sliced into the same runtime keys.
- Build passed after PNG integration. Browser playtests verified title art, combat, PNG resource loading, no request failures, no console errors, active play at 00:12, and a 01:06 boss run with reaper HUD visible.
- Full deterministic 10-minute run reached the victory overlay: `새벽까지 생존`, final time 10:00, level 33, and no request failures or console errors. Long-run screenshot capture timed out because the late-game scene contains many entities, but state and overlay text verified the win condition.
- Started the upgrade goal: rebuilt the single start overlay into a full lobby with character/stage/upgrade/settings panels, localStorage save data, continue/reset controls, permanent upgrades, and stage selection.
- Added GPT-generated lobby background at `public/assets/ui/lobby-bg.png` and GPT-generated button state atlas at `public/assets/ui/button-atlas.png`; sliced button states into `public/assets/ui/buttons` and wired normal/hover/pressed/disabled CSS states.
- Added stage 2 `붉은 학원 폐허` with a different palette, dedicated enemy wave pool (`wisp`, `oni`, `lancer`), `구미호` boss, and new academy skills `부적 회오리` and `별빛 낙하`.
- Regenerated the heroine as a 5-frame GPT walk strip at `public/assets/gpt-sprites/hero-walk-strip.png`, sliced `hero0` through `hero3`, and updated movement to cycle four walk frames.
- Regenerated a complete, uncropped reaper boss at `public/assets/gpt-sprites/reaper-full.png` and replaced the runtime `reaper.png`.
- Build passed after the upgrade pass. Browser tests verified lobby mode, GPT lobby/button assets, localStorage upgrade persistence, graveyard combat, academy combat, stage 2 boss HUD, new skills, no request failures, and no console errors.
- Added GPT-generated five-character atlas and sliced runtime PNGs under `public/assets/characters/sliced`. The lobby now has five selectable heroines with distinct names, portraits, starting weapons, and passive abilities.
- Added GPT UI kit atlas and sliced HUD/menu assets under `public/assets/ui/kit/sliced`. HUD stat frames, XP bar, boss bar, level-up cards, character cards, stage cards, and ESC pause menu now use image-based UI surfaces.
- Added ESC/P pause overlay with continue, restart, lobby return, and sound toggle controls. Stage radio changes now persist immediately to save data.
- Added GPT map kit atlas and sliced map/obstacle assets under `public/assets/maps`. The runtime now builds large stage-specific terrain, places decals and obstacles, and blocks player/enemy movement plus most projectiles against obstacles.
- Fixed the visible map gap issue by using a full procedural terrain base and lowering GPT tile sheets to texture overlays instead of relying on transparent repeated tile images for coverage.
- Latest build passed. Playwright tests verified five character cards, character/stage save updates, academy and graveyard starts, distinct starting weapons, generated obstacles, ESC pause/resume state, desktop screenshots, and mobile lobby/pause sanity.
- Implemented the PHANTOM upgrade pass. Generated and integrated a PHANTOM logo, cute monster atlas, and expanded terrain atlas. Runtime monster keys now use cute slime/bat/skull/mage/wisp/oni/talisman/reaper/kitsune sprites.
- Copied `The_Stone_Descent.mp3` into `public/assets/audio` and wired it as in-game-only looping BGM. Lobby remains silent; BGM starts on run start, pauses on ESC, resumes on continue, and stops on lobby/result.
- Rebuilt the DOM HUD: HP and XP bars are centered at the top with image frames and internal fill bars, weapons are compact on the top-left, and time/stage/kills sit top-right.
- Upgraded save data to `phantom-save-v4` with recent run records, bestiary counts, story log, migrated meta upgrades, and records/bestiary lobby panels.
- Reworked difficulty pacing for a 10-minute survival target: low early spawn count, enemy cap, gradual wave growth, and later boss cadence.
- Reworked map rendering to tile generated terrain variants edge-to-edge instead of overlaying transparent tile images. Debug state now exposes terrain variant count and transparent-gap risk.
- Normalized all player character frames into fixed 128x128 bottom-center canvases under `public/assets/characters/normalized`, and runtime animation now keeps origin/rotation stable with a short attack-frame timer to prevent clipping and excessive movement.
- Added Playwright regression tests in `tests/phantom-upgrade.spec.ts` covering PHANTOM branding, BGM loop, early pacing, terrain variation, character frame anchoring, records, and bestiary persistence. `npm.cmd run build` and `npx.cmd playwright test --reporter=line` both pass.
- Implemented the latest lobby/mobile asset overhaul. Root lobby actions are now only `게임 시작`, `불러오기`, and `설정`; `게임 시작` opens a focused start panel with five selectable characters and stage choice.
- Generated new GPT image assets for a coherent night graveyard tile atlas, coherent ruined academy tile atlas, five-row character walk atlas, and mobile pause/play button atlas. Copied them into `public/assets`, sliced terrain into 16 runtime tiles per stage, normalized character frames into `public/assets/characters/v2`, and sliced mobile pause icons into `public/assets/ui/mobile`.
- Updated runtime save data to `phantom-save-v5` with unlocked stages, BGM volume, SFX volume, recent run slots, bestiary, and story log migration from older save keys. `붉은 학원 폐허` is locked until `밤의 묘지` is cleared.
- Rebuilt player animation use to idle plus four walk frames only; attack motion is disabled so character frames remain bottom-center anchored and do not clip during weapon firing.
- Added mobile touch controls: a bottom-left joystick for movement and a GPT-image top-right pause/play button that works while the pause overlay is open. Desktop keyboard/ESC controls still work.
- Rewrote the broken Korean UI strings across HTML/runtime and added regression tests for Korean lobby root actions, locked stage flow, coherent map debug state, character frame stability, mobile controls, and save-slot persistence. `npm.cmd run build` and `npx.cmd playwright test --reporter=line` both pass.
- Browser QA captured updated screenshots: `phantom-upgrade-start-panel.png`, `phantom-upgrade-gameplay.png`, `phantom-upgrade-mobile-gameplay.png`, and `phantom-upgrade-mobile-pause.png`. Clean browser check reported no console errors or non-aborted request failures.

TODO:
- Optional polish: add manual code splitting if the Phaser bundle-size warning becomes important for deployment.

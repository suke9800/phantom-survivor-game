import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../public/assets/sprites/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const write = (name, svg) => writeFileSync(join(outDir, `${name}.svg`), svg.trim(), 'utf8');

const wrap = (w, h, body) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="soft"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".45"/></filter>
    <radialGradient id="glow" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".45" stop-color="#9cecff" stop-opacity=".5"/><stop offset="1" stop-color="#1d2b38" stop-opacity="0"/></radialGradient>
  </defs>
  ${body}
</svg>`;

function hero(name, stride) {
  write(name, wrap(64, 76, `
    <ellipse cx="32" cy="66" rx="20" ry="7" fill="#05080c" opacity=".35"/>
    <circle cx="32" cy="36" r="23" fill="#111923" filter="url(#soft)"/>
    <circle cx="32" cy="29" r="14" fill="#e6dcc0"/>
    <path d="M19 43 Q32 35 45 43 V66 Q32 75 19 66Z" fill="#31495b"/>
    <rect x="23" y="48" width="18" height="5" rx="1" fill="#f0c85d"/>
    <circle cx="38" cy="29" r="3" fill="#71eaff"/>
    <path d="M17 ${44 + stride * 0.25} q-7 8-1 20" stroke="#172334" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M47 ${44 - stride * 0.25} q7 8 1 20" stroke="#172334" stroke-width="8" stroke-linecap="round" fill="none"/>
    <rect x="24" y="${66 + Math.max(0, stride) * 0.2}" width="7" height="9" rx="2" fill="#223749"/>
    <rect x="35" y="${66 + Math.max(0, -stride) * 0.2}" width="7" height="9" rx="2" fill="#223749"/>
    <circle cx="32" cy="36" r="25" fill="none" stroke="#6ce3ff" stroke-opacity=".35" stroke-width="2"/>
  `));
}

function enemy(name, base, accent, flap) {
  write(name, wrap(48, 48, `
    <ellipse cx="24" cy="38" rx="17" ry="6" fill="#000" opacity=".25"/>
    <path d="M9 25 L1 ${10 + flap} L13 15Z" fill="${base}"/>
    <path d="M39 25 L47 ${10 - flap} L35 15Z" fill="${base}"/>
    <circle cx="24" cy="24" r="18" fill="${base}" filter="url(#soft)"/>
    <circle cx="18" cy="21" r="4" fill="${accent}"/>
    <circle cx="30" cy="21" r="4" fill="${accent}"/>
    <circle cx="18" cy="22" r="2" fill="#111"/>
    <circle cx="30" cy="22" r="2" fill="#111"/>
    <circle cx="24" cy="24" r="18" fill="none" stroke="${accent}" stroke-opacity=".35" stroke-width="2"/>
  `));
}

function boss() {
  write('reaper', wrap(96, 96, `
    <circle cx="48" cy="48" r="44" fill="#160c1d" opacity=".4"/>
    <circle cx="48" cy="48" r="38" fill="none" stroke="#d49b5f" stroke-width="5" opacity=".85"/>
    <path d="M18 51 L0 18 L28 26Z" fill="#27172f"/>
    <path d="M78 51 L96 18 L68 26Z" fill="#27172f"/>
    <circle cx="48" cy="48" r="34" fill="#27172f" filter="url(#soft)"/>
    <circle cx="48" cy="52" r="26" fill="#6f355f"/>
    <circle cx="36" cy="42" r="5" fill="#f2d27b"/>
    <circle cx="60" cy="42" r="5" fill="#f2d27b"/>
    <circle cx="36" cy="43" r="2" fill="#110b15"/>
    <circle cx="60" cy="43" r="2" fill="#110b15"/>
  `));
}

function orb(name, base, accent) {
  write(name, wrap(32, 32, `
    <circle cx="16" cy="16" r="15" fill="${base}" opacity=".18"/>
    <circle cx="16" cy="16" r="11" fill="${base}" filter="url(#soft)"/>
    <circle cx="12" cy="11" r="4" fill="${accent}" opacity=".78"/>
    <circle cx="16" cy="16" r="12" fill="none" stroke="${accent}" stroke-opacity=".55" stroke-width="2"/>
  `));
}

function projectile(name, base, shape = 'orb') {
  const core = shape === 'blade'
    ? '<path d="M6 16 Q16 1 26 16 Q16 31 6 16Z" fill="' + base + '" filter="url(#soft)"/><path d="M13 16 h12" stroke="#fff" stroke-width="2" opacity=".75"/>'
    : '<circle cx="16" cy="16" r="9" fill="' + base + '" filter="url(#soft)"/><circle cx="13" cy="12" r="3" fill="#fff" opacity=".6"/>';
  write(name, wrap(32, 32, `
    <circle cx="16" cy="16" r="14" fill="${base}" opacity=".2"/>
    ${core}
  `));
}

hero('hero', 0);
hero('hero0', -4);
hero('hero1', 4);
for (const [key, base, accent] of [
  ['bat', '#59346b', '#e6d7ff'],
  ['slime', '#3f9150', '#b8ffd0'],
  ['skull', '#d7d6c6', '#272822'],
  ['mage', '#4560b8', '#d6e3ff'],
]) {
  enemy(key, base, accent, 0);
  enemy(`${key}0`, base, accent, -3);
  enemy(`${key}1`, base, accent, 3);
}
boss();
orb('xp', '#4fd7ff', '#ffffff');
orb('heart', '#ff496c', '#ffcad4');
orb('magnet', '#ffd85c', '#ffffff');
orb('bomb', '#2b2d35', '#ff8a58');
projectile('sparkShot', '#7ee7ff');
projectile('bladeShot', '#e8e9d0', 'blade');
projectile('boltShot', '#9be7ff');
projectile('flameShot', '#ff7b3a');

console.log(`Generated SVG assets in ${outDir}`);

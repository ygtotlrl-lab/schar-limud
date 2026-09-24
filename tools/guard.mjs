#!/usr/bin/env node
/* ── שומר הדחיפה ─────────────────────────────────────────────────────────── */
/*  בודק רק את מה ששובר את האפליקציה למשתמש ברגע הדחיפה:
 *  תחביר כל סקריפט שבתוך `index.html`, של `sw.js` ושל `core/*.js` —
 *  ⛔ ושכל קובץ ברשימת המטמון (`CORE` שב-`sw.js`) קיים בעץ.
 *  ⭐ וכל השאר נמדד בסריקה הגדולה.
 *
 *  ⛔ הקובץ זהה בית-לבית בכל הריפו — ⚠️ אין בו תצורה פר-אפליקציה:
 *  הכול נגזר מהעץ שבו הוא רץ.
 *  ⛔ ואין בו תלות חיצונית — ⚠️ `node` בלבד, ⭐ והתחביר נבדק
 *  ב-`node --check` שאינו מריץ דבר. */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
let checked = 0;

/*  ⚠️ הקוד עובר ב-stdin — ⛔ ואינו נכתב לקובץ זמני: השומר קורא בלבד. */
function syntax(label, code, type) {
  checked++;
  const r = spawnSync(process.execPath, ['--check', `--input-type=${type}`, '-'],
    { input: code, encoding: 'utf8' });
  if (r.status !== 0) {
    const msg = (r.stderr || '').split('\n').filter(Boolean);
    const at = msg.find(l => /^\[stdin\]:\d+/.test(l)) || '';
    const why = msg.find(l => /Error/.test(l)) || 'שגיאת תחביר';
    fails.push(`${label}${at.replace('[stdin]', '')} — ${why}`);
  }
}

/*  ── index.html — כל תג <script> בלי src ── */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
let n = 0;
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (/\bsrc\s*=/.test(m[1])) continue;
  n++;
  /*  ⚠️ מספר השורה נמדד מראש הקובץ — ⭐ ולכן הקוד מקבל שורות ריקות לפניו. */
  const pad = '\n'.repeat(html.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length - 1);
  syntax('index.html', pad + m[2], /type\s*=\s*["']module["']/.test(m[1]) ? 'module' : 'commonjs');
}
if (!n) fails.push('index.html — אין בו סקריפט מוטבע: הקובץ נשבר, או שהסקריפט יצא ממנו');

/*  ── sw.js — סקריפט קלאסי ── */
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
syntax('sw.js', sw, 'commonjs');

/*  ── core/*.js — מודולים ── */
const coreDir = join(ROOT, 'core');
if (existsSync(coreDir)) {
  for (const f of readdirSync(coreDir).filter(f => f.endsWith('.js')).sort())
    syntax(`core/${f}`, readFileSync(join(coreDir, f), 'utf8'), 'module');
}

/*  ── רשימת המטמון — כל קובץ קיים ──
 *  ⛔ קובץ חסר ברשימה מפיל את ההתקנה כולה: `cache.addAll` הוא הכול-או-כלום. */
const block = sw.match(/\bCORE\s*=\s*\[([\s\S]*?)\]/);
if (!block) fails.push('sw.js — רשימת המטמון `CORE` לא נמצאה');
else {
  const body = block[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const urls = [...body.matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
  if (!urls.length) fails.push('sw.js — רשימת המטמון ריקה');
  for (const u of urls) {
    checked++;
    const p = join(ROOT, u.replace(/^\.\//, '').split(/[?#]/)[0]);
    const ok = u === './' ? existsSync(join(ROOT, 'index.html')) : existsSync(p) && statSync(p).isFile();
    if (!ok) fails.push(`sw.js — «${u}» ברשימת המטמון ואינו קיים בעץ`);
  }
}

if (fails.length) {
  for (const f of fails) console.error(`❌ ${f}`);
  console.error(`\nהשומר נפל: ${fails.length} מתוך ${checked} — מתקנים ומריצים שוב לפני push.`);
  process.exit(1);
}
console.log(`✅ השומר עבר — ${checked} בדיקות.`);

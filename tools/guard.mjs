#!/usr/bin/env node
// tools/guard.mjs — שומר הדחיפה

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createContext, runInContext } from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
let checked = 0;

// הקוד עובר ב-stdin ולא בקובץ זמני — השומר קורא בלבד.
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

// ── index.html — כל תג script בלי src, והכניסה ל-app/ ──
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
let n = 0;
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (/\bsrc\s*=/.test(m[1])) continue;
  n++;
  // מספר השורה בשגיאה נמדד מראש הקובץ — לכן הקוד מרופד בשורות ריקות לפניו.
  const pad = '\n'.repeat(html.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length - 1);
  syntax('index.html', pad + m[2], /type\s*=\s*["']module["']/.test(m[1]) ? 'module' : 'commonjs');
}
checked++;
if (!/<script type="module" src="app\/main\.js"><\/script>/.test(html)) fails.push('index.html — אינו טוען את app/main.js');

// ── sw.js — סקריפט קלאסי ──
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
syntax('sw.js', sw, 'commonjs');

// ── sw.js — CACHE_NAME מוגדר ואינו ריק ──
// בלעדיו ה-worker נכשל בהתקנה, והתחביר תקין גם בלעדיו.
// הערך מוערך כפי שה-worker גוזר אותו — מעל התצורה, בהקשר מבודד.
{
  checked++;
  const decl = sw.match(/^\s*(?:var|let|const)\s+CACHE_NAME\s*=\s*([^;\n]+)/m);
  let name = '';
  if (decl) {
    try {
      const ctx = createContext({});
      ctx.self = ctx;
      runInContext(readFileSync(join(ROOT, 'app.config.js'), 'utf8'), ctx);
      name = runInContext(`(${decl[1]})`, ctx);
    } catch (e) { name = ''; }
  }
  if (!decl) fails.push('sw.js — `CACHE_NAME` אינו מוגדר');
  else if (typeof name !== 'string' || !name.trim()) fails.push('sw.js — `CACHE_NAME` ריק');
}

// ── core/*.js — מודולים ──
const coreDir = join(ROOT, 'core');
if (existsSync(coreDir)) {
  for (const f of readdirSync(coreDir).filter(f => f.endsWith('.js')).sort())
    syntax(`core/${f}`, readFileSync(join(coreDir, f), 'utf8'), 'module');
}

// ── app/ — מודולים ──
function jsUnder(dir) {
  let out = [];
  for (const f of readdirSync(join(ROOT, dir)).sort()) {
    const p = dir + '/' + f;
    if (statSync(join(ROOT, p)).isDirectory()) out = out.concat(jsUnder(p));
    else if (f.endsWith('.js')) out.push(p);
  }
  return out;
}
const appFiles = existsSync(join(ROOT, 'app')) ? jsUnder('app') : [];
if (!appFiles.includes('app/main.js')) fails.push('app/main.js — אינו קיים');
for (const f of appFiles) syntax(f, readFileSync(join(ROOT, f), 'utf8'), 'module');

// ── רשימת המטמון — כל קובץ קיים ──
// cache.addAll הוא הכול-או-כלום — קובץ חסר אחד מפיל את ההתקנה כולה.
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
  // מודול שאינו במטמון נכשל בייבוא אופליין, והאפליקציה כולה אינה עולה.
  for (const f of appFiles) {
    checked++;
    if (!urls.includes('./' + f)) fails.push(`sw.js — «./${f}» אינו ברשימת המטמון`);
  }
}

if (fails.length) {
  for (const f of fails) console.error(`❌ ${f}`);
  console.error(`\nהשומר נפל: ${fails.length} מתוך ${checked} — מתקנים ומריצים שוב לפני push.`);
  process.exit(1);
}
console.log(`✅ השומר עבר — ${checked} בדיקות.`);

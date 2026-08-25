#!/usr/bin/env node
/*  שער תקינות JS — חובה לפני כל דחיפה (סבב 33: אוחד לארבעת הריפו).
 *
 *  index.html מחזיק את האפליקציה כולה כ-JS מוטבע, ולכן שגיאת תחביר אינה
 *  נתפסת בשום lint רגיל — היא מגיעה למשתמש כמסך לבן, בלי אזהרה. השער:
 *
 *    1. מחלץ כל בלוק <script> מוטבע מ-index.html ומריץ עליו node --check.
 *    2. מריץ node --check על sw.js.
 *    3. מאמת כללי-אמת שפרסר אינו תופס (APP.rules — פר-אפליקציה; כל כלל
 *       נמדד מהקבצים של האפליקציה עצמה ולא הועתק מריפו אחר).
 *    4. מריץ את כל שערי האחידות ואת חבילות בדיקות הסבבים (APP.gates).
 *
 *  ⭐ השער נולד ב-gius (סבב 11) וחי שם לבדו עשרה סבבים בלי שאיש החליט על
 *  כך — הפער שהוליד את כלל ברזל 14. מסבב 33 הוא זהה בית-לבית בארבעת
 *  הריפו פרט לבלוק APP.
 *
 *      node tools/check-js.mjs
 *
 *  יציאה בקוד שונה מאפס אם כשל אחד או יותר.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /* ⚠️ הכללים נמדדו מ-sw.js ומ-index.html של האפליקציה הזו (סבב 33,
     הורחבו בסבב 35) — לא הועתקו מריפו אחר. [file, regex, expect, msg]
     ⚠️ מסבב 35 יש כאן רשימת CDN במטמון-מראש עם ריפוי עצמי (התבנית של
     שלוש האחיות), ולכן נוסף כלל mode:'cors' — נמדד, לא הוצהר.
     ⭐ ומסבב 42ג יש כאן גם דף אופליין (הליבה המשותפת), ולכן נוסף כלל
     ה-Content-Type — כבשלוש האחיות. */
  rules: [
    ['sw',   "CACHE_NAME\\s*=\\s*'schar-limud-v\\d+'", true,
             "sw.js: CACHE_NAME בתבנית 'schar-limud-v<N>' (תבנית, לא מספר קבוע)"],
    ['sw',   "supabase\\.co", true, "sw.js: דילוג על בקשות supabase.co"],
    ['sw',   "prefix:\\s*'schar-limud-'", true,
             "sw.js: SW_CFG.prefix = 'schar-limud-'"],
    ['sw',   "indexOf\\(SW_CFG\\.prefix\\)\\s*===\\s*0", true,
             "sw.js: ניקוי המטמון לפי SW_CFG.prefix בלבד"],
    ['sw',   "mode:\\s*'cors'", true, "sw.js: משיכת CDN ב-mode:'cors'"],
    ['sw',   "text/html;\\s*charset=utf-8", true,
             "sw.js: דף האופליין עם Content-Type מפורש"],
    ['sw',   "supabase-js@2\\.111\\.0", true, "sw.js: supabase-js נעוץ ברשימת ה-CDN"],
    ['html', "supabase-js@2\\.111\\.0", true, "index.html: supabase-js נעוץ ל-2.111.0"],
    ['html', "supabase-js@2/", false, "index.html: אין גרסת CDN צפה @2"],
  ],
  gates: ['check-structure.mjs', 'check-status-area.mjs', 'check-docs.mjs',
          'check-comments.mjs', 'check-capabilities.mjs', 'check-gaps.mjs',
          'test_round49_budget.mjs',
          'test_round45_android.mjs', 'test_round45_lists.mjs',
          'test_round44_retry.mjs',
          'test_round44_manifest.mjs',
          'test_round42_sw.mjs',
          'test_round42c_swcore.mjs',
          'test_round41_build.mjs',
          'test_round40_gradle.mjs', 'test_round40_shell.mjs', 'test_round40_devid.mjs', 'test_round40_passwords.mjs',
          'test_round39_gaps.mjs', 'test_round39_md.mjs',
          'test_round24.mjs', 'test_round26.mjs',
          'test_round30_stage_a.mjs', 'test_round33_structure.mjs',
          'test_round35_hotwin.mjs', 'test_round35c_cron.mjs',
          'test_round37_merge_pending.mjs', 'test_round38_merge_core.mjs', 'test_round37_matrix.mjs', 'test_round37_ids.mjs'],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), APP.app + '-check-'));
let failed = 0;

function check(label, file) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log('  ok   ' + label);
  } catch (err) {
    failed++;
    console.error('  FAIL ' + label);
    console.error(String(err.stderr || err.stdout || err.message).trim());
  }
}

/* ── 1. חילוץ הסקריפטים המוטבעים מ-index.html ─────────────────────────── */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
let m, n = 0;
while ((m = re.exec(html)) !== null) {
  if (/\bsrc\s*=/i.test(m[1])) continue;             // סקריפט חיצוני — אין מה לפרסר
  n++;
  const out = join(work, `index-inline-${n}.js`);
  writeFileSync(out, m[2]);
  check(`index.html inline script #${n}`, out);
}
if (n === 0) {
  failed++;
  console.error('  FAIL לא נמצא אף סקריפט מוטבע ב-index.html — המבנה השתנה?');
}

/* ── 2. קבצים עצמאיים ──────────────────────────────────────────────────── */
check('sw.js', join(ROOT, 'sw.js'));

/* ── 3. כללי-אמת שפרסר אינו תופס (APP.rules) ──────────────────────────── */
const SRC = { sw: readFileSync(join(ROOT, 'sw.js'), 'utf8'), html };
for (const [file, reSrc, expect, msg] of APP.rules) {
  const hit = new RegExp(reSrc).test(SRC[file]);
  if (hit === expect) { console.log('  ok   ' + msg); continue; }
  failed++;
  console.error('  FAIL ' + msg);
}

/* ── 4. שערי האחידות וחבילות הבדיקה (APP.gates) ───────────────────────── */
for (const gate of APP.gates) {
  try {
    execFileSync(process.execPath, [join(ROOT, 'tools', gate)],
                 { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log('\nall checks passed');

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
 *       CHECKJS_STAGES_ONLY=1 עוצר אחרי שלב 3, בלי חבילות הבדיקה.
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
  gates: ['test_rulesdocs.mjs',
          'test_filesets.mjs',
          'test_inputlayer.mjs',
          'test_iconlayer.mjs',
          'test_idarg.mjs',
          'test_sources.mjs',
          'test_backup_policy.mjs',
          'test_bump.mjs',
         'test_pendflush.mjs', 'test_lock.mjs',
          'test_session.mjs',
          'check-structure.mjs', 'check-status-area.mjs', 'check-docs.mjs',
          'check-comments.mjs', 'check-capabilities.mjs',
          'test_pull.mjs',
          'test_budget.mjs', 'test_icons.mjs',
          'test_android.mjs', 'test_lists.mjs',
          'test_manifest.mjs',
          'test_swcore.mjs',
          'test_build.mjs',
          'test_shell.mjs', 'test_devid.mjs', 'test_passwords.mjs',
          'test_md.mjs', 'test_readonly.mjs', 'test_crossgate.mjs',
          'test_offline_login.mjs', 'test_roles.mjs',
          'test_stage_a.mjs', 'test_hotwin.mjs', 'test_cron.mjs',
          'test_merge_pending.mjs', 'test_matrix.mjs', 'test_ids.mjs'],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), APP.app + '-check-'));

/*  ⛔ אותם עוזרים כמו בחמשת הבודקים האחרים (סבב 72) — ⚠️ עד כאן היה כאן
 *  דפוס שני (`ok`/`FAIL`, בלי מונה ובלי `pass`), ⛔ ושני דפוסים לאותו
 *  דבר מלמדים לקרוא כל בודק מחדש. */
let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

function check(label, file) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    pass(label);
  } catch (err) {
    fail(`${label}: שגיאת תחביר — נמדד פרסור שנכשל במקום פרסור תקין. ` +
         'מתקנים את הבלוק המוטבע; הפירוט מלמטה');
    console.error(String(err.stderr || err.stdout || err.message).trim());
  }
}

/* ── 1. חילוץ הסקריפטים המוטבעים מ-index.html ──────────────────────────── */
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
  fail('index.html: נמדדו 0 סקריפטים מוטבעים והצפוי לפחות 1 — ' +
       'המבנה השתנה, ובודקים אם הקוד עבר לקובץ חיצוני');
}

/* ── 2. קבצים עצמאיים ──────────────────────────────────────────────────── */
check('sw.js', join(ROOT, 'sw.js'));

/* ── 3. כללי-אמת שפרסר אינו תופס (APP.rules) ───────────────────────────── */
const SRC = { sw: readFileSync(join(ROOT, 'sw.js'), 'utf8'), html };
for (const [file, reSrc, expect, msg] of APP.rules) {
  const hit = new RegExp(reSrc).test(SRC[file]);
  if (hit === expect) { pass(msg); continue; }
  fail(`${msg} — נמדד ${hit ? 'נמצא' : 'לא נמצא'} והצפוי ` +
       `${expect ? 'נמצא' : 'לא נמצא'}. מיישרים את ${file === 'sw' ? 'sw.js' : 'index.html'}`);
}

/*  ⛔ דגל השלבים (סבב 72) — ⚠️ שער שדורש רק את שלבי ה-`node --check` אינו
 *  מריץ את חבילות הבדיקה: ⭐ הריצה החיצונית מוכיחה את הבקרה החיובית ממילא,
 *  ⛔ וריצה פנימית שנייה של הסט המלא היא אותה עבודה פעמיים. */
if (process.env.CHECKJS_STAGES_ONLY) {
  if (failures) { console.error(`\n❌ ${APP.app}: ${failures} כשלים בשלבים 1–3`); process.exit(1); }
  console.log('\n✅ שלבים 1–3 עברו');
  process.exit(0);
}

/* ── 4. שערי האחידות וחבילות הבדיקה (APP.gates) ────────────────────────── */
for (const gate of APP.gates) {
  try {
    execFileSync(process.execPath, [join(ROOT, 'tools', gate)],
                 { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    failures++;
  }
}

if (failures) {
  console.error(`\n❌ ${APP.app}: ${failures} כשלים בשער ה-JS`);
  process.exit(1);
}
console.log('\n✅ all checks passed');

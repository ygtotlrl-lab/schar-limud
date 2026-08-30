#!/usr/bin/env node
/* סבב 72 — תקרת השער הבודד (שורה 35).
 *
 * ⛔ **מה נאכף:** `check-js` מודד כל שער בנפרד, ⛔ ונופל כשאחד מהם עובר
 * את `GATE_MAX_MS` בלי שהוא חריגה מוכרזת ב-`SLOW_OK`.
 *
 * ⭐ **הנימוק המדוד:** תקרה על **הסך** בלבד מסתירה שער יחיד שתופס שליש
 * מהזמן — `test_structure` הריץ את `check-js` פעמיים במשך חודש, והסך
 * נראה סביר. ⚠️ תקרה לכל שער תופסת אותו בהרצה הראשונה.
 *
 * ⛔ **מה יישבר בלעדיו:** שער חדש שמריץ שער אחר, או חוזר על עבודה
 * שכבר נעשתה, ⚠️ נכנס בשקט ומכפיל את זמן ההרצה של כל דחיפה.
 *
 * ⚠️ **מה אינו נאכף כאן:** ⛔ **הסך** — הוא נמדד ידנית: שער שמודד את
 * זמן הריצה הכולל מודד את המכונה שעליה הוא רץ.
 *
 * ⛔ המוטציות רצות על עותק בתיקייה זמנית ואינן נכתבות לעץ.
 * ⛔ הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = { app: 'schar-limud' };
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ הוא מוכיח את
 *  המנגנון, ⭐ והמדידה עצמה רצה ב-`check-js` על כל שער בכל הרצה. */
export const ROWS = [];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const ok = (m, c) => { if (c) { passed++; console.log('✅ ' + m); }
                       else { failed++; console.error('❌ ' + m); } };

/*  ⚠️ הרתמה מציבה תקרה קטנה בסביבה ⛔ ואינה משנה את הקבוע — ⭐ סף אמיתי
 *  היה עולה 20 שניות בכל הרצה, וזו בדיוק העבודה הכפולה שהשורה הזאת
 *  נועדה למנוע. */
const CEIL_MS = 250;
const SLEEP_SLOW = 400, SLEEP_FAST = 60;

const WORK = mkdtempSync(join(tmpdir(), APP.app + '-r72gt-'));
cpSync(ROOT, WORK, {
  recursive: true,
  filter: (src) => {
    const rel = relative(ROOT, src).split(sep);
    return !rel.includes('.git') && !rel.includes('node_modules');
  },
});
const CJ = join(WORK, 'tools', 'check-js.mjs');
const CLEAN = readFileSync(CJ, 'utf8');

const stub = (ms) => `#!/usr/bin/env node\nexport const ROWS = [];\n` +
                     `const t = Date.now();\nwhile (Date.now() - t < ${ms}) {}\n`;
writeFileSync(join(WORK, 'tools', 'test_zz_slow.mjs'), stub(SLEEP_SLOW));
writeFileSync(join(WORK, 'tools', 'test_zz_fast.mjs'), stub(SLEEP_FAST));

/*  ⚠️ רשימת השערים בעותק מוחלפת בשני גדמים ⛔ ולא נוספת להם — ⭐ הרצת
 *  הסט המלא כאן הייתה מכפילה את זמן ההרצה, כמו הכשל שנמדד. */
const twoGates = (src) =>
  src.replace(/gates: \[[\s\S]*?\],\n\};/,
              "gates: ['test_zz_slow.mjs', 'test_zz_fast.mjs'],\n};");

function run(src, ceil) {
  writeFileSync(CJ, src);
  try {
    const out = execFileSync(process.execPath, [CJ],
      { cwd: WORK, encoding: 'utf8', stdio: 'pipe',
        env: { ...process.env, GATE_MAX_MS: String(ceil) } });
    return { failed: false, out };
  } catch (e) {
    return { failed: true, out: (e.stdout || '') + (e.stderr || '') };
  }
}

const base = twoGates(CLEAN);

/*  ⭐ בקרה חיובית — ⛔ בלעדיה כל «נפל» כאן היה יכול להיות כשל אחר. */
const under = run(base, CEIL_MS * 4);
ok(`בקרה חיובית: שני גדמים מתחת לתקרה — check-js עובר (${SLEEP_SLOW}ms < ${CEIL_MS * 4}ms)`,
   !under.failed);

const over = run(base, CEIL_MS);
ok('שער איטי מפיל את check-js', over.failed);
ok('הודעת הכשל נוקבת בשם השער האיטי ובזמן שנמדד',
   /test_zz_slow\.mjs \d+\.\ds/.test(over.out));
ok('הגדם המהיר אינו נמנה עם החורגים', !/test_zz_fast/.test(over.out));

/*  ⛔ חריגה מוכרזת אינה נספרת — ⚠️ וזו ההבחנה בין תקרה שמודדת לתקרה
 *  שסופרת: השער האיטי אינו משתנה, ⭐ ורק ההכרזה עליו משתנה. */
const declared = run(base.replace("'test_readonly.mjs': 'קו הבסיס",
                                  "'test_zz_slow.mjs': 'גדם המדידה', 'test_readonly.mjs': 'קו הבסיס"),
                     CEIL_MS);
ok('שער איטי שהוכרז ב-SLOW_OK אינו מפיל', !declared.failed);

/*  ⛔ מוטציה — היפוך שומר החריגה בקוד: ⚠️ הטענה שאמורה ליפול היא
 *  «שער איטי מפיל את check-js», ⛔ שכן שער שאינו מוכרז מפסיק להיספר. */
const mut = base.replace('ms > GATE_MAX_MS && !SLOW_OK[gate]',
                         'ms > GATE_MAX_MS && SLOW_OK[gate]');
ok('המוטציה שינתה את גוף check-js', mut !== base);
ok('⛔ מוטציה: היפוך תנאי התקרה מפיל את «שער איטי מפיל את check-js»',
   !run(mut, CEIL_MS).failed);

/*  ⭐ מוטציית-נגד — שינוי חי בקוד: ⛔ שם המשתנה מוחלף בעקביות, ⚠️ והשער
 *  חייב להמשיך לתפוס את השער האיטי. */
const anti = base.replace(/\bslow\b/g, 'overrun');
ok('מוטציית-הנגד שינתה את הקוד', anti !== base);
ok('⭐ מוטציית-נגד: החלפת שם המשתנה בעקביות ⛔ אינה מפילה את הטענה',
   run(anti, CEIL_MS).failed);

/*  ⛔ המספר בבאנר נגזר מהקבוע (סבב 72) — ⚠️ הקבוע בקוד הוא מקור האמת
 *  היחיד לתקרה, ⛔ ואינו נכתב פעם שנייה בהודעה. */
const lit = /GATE_MAX_MS = Number\(process\.env\.GATE_MAX_MS \|\| (\d+)\)/.exec(CLEAN);
ok('תקרת ברירת המחדל היא 20 שניות, וקבועה בקוד', !!lit && Number(lit[1]) === 20000);
ok('הודעת החריגה גוזרת את המספר מהקבוע ואינה כותבת אותו פעמיים',
   /GATE_MAX_MS \/ 1000/.test(CLEAN) && !/מעל 20 שניות/.test(CLEAN));

writeFileSync(CJ, CLEAN);
rmSync(WORK, { recursive: true, force: true });

console.log(failed ? `\n✗ סבב 72 (תקרת שער בודד) — ${failed} נכשלו, ${passed} עברו`
                   : `\n✓ סבב 72 (תקרת שער בודד) — ${passed} טענות עברו`);
process.exit(failed ? 1 : 0);

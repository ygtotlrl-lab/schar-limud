#!/usr/bin/env node
/*  test_matrix.mjs — סבב 37: המטריצה נאכפת, ולא מוצהרת.
 *
 *  `check-capabilities.mjs` הורחב בסבב 37 משלוש שורות ל**כל** שורות
 *  מטריצת היכולות, בשני הכיוונים: ✅ בלי probe מפיל, ו-❌ עם probe מפיל
 *  גם כן. הקובץ הזה מוכיח שזה לא הצהרה — הוא **הופך כל תא בתורו** בעותק
 *  זמני של העץ ומריץ את הבודק האמיתי, ודורש שכל היפוך ייתפס.
 *
 *  ⛔ אין להחליף את הרצת-הבודק-האמיתי בסימולציה (סבב 37) — בדיקה שאינה
 *  מריצה את השער עצמו אינה מוכיחה עליו דבר.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = { app: 'schar-limud', col: 3 };
/* ── סוף APP ───────────────────────────────────────────────────────────── */

if (process.env.R33_INNER || process.env.R37_INNER) {
  console.log('test_matrix: ריצה פנימית — מדלג (מניעת רקורסיה)');
  process.exit(0);
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const ok = (msg, cond) => {
  if (cond) { passed++; console.log('✅ ' + msg); }
  else      { failed++; console.error('❌ ' + msg); }
};

/*  ⛔ שתי השורות האלה מוחרגות מהמוטציה, וזו אינה השמטה (סבב 37) — שתיהן
 *  מצהירות על **עובדת מסד** שאין דרך לראות מהריפו: 21 («הגיבוי קורא
 *  מטבלאות מובנות») תלויה בכך שהטבלאות נוצרו, ו-22 («משימת pg_cron»)
 *  בכך שהמשימה רשומה. הצד שכן ניתן לבדיקה נאכף ב-test_cron.mjs.
 *  ⚠️ הרשימה חייבת להישאר קצרה — כל שורה נוספת כאן היא שורה שאיש אינו
 *  שומר עליה.                                                            */
/*  ⛔ אין להאריך את הרשימה מעבר ל-`GATES` (סבב 69) — כל שורה כאן נאכפת בשער אחר או
 *  נושאת נימוק כתוב שם (`GATES`), ⛔ ולכן היפוך התא שלהן אינו אמור
 *  להפיל אותו. ⚠️ ולצידן 28 ו-72, ששתיהן מצהירות על **עובדת מסד**
 *  שאין דרך לראות מהריפו: שהטבלאות נוצרו, ושמשימת ה-`pg_cron` רשומה.
 *  ⛔ הרשימה חייבת להישאר נגזרת מ-`GATES` ולא להתארך מעבר לו. */
const EXEMPT = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 45, 48, 49, 50, 51, 54,
  55, 56, 57, 58, 59, 60, 62, 64, 65, 67, 69, 71, 74, 77, 78, 79, 80, 82, 85,
  86, 89, 90, 91, 92, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 106,
  107,
];

function copyRepo() {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), APP.app + '-r37-'));
  fs.cpSync(ROOT, dst, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(ROOT, src);
      return !rel.split(path.sep).includes('.git') &&
             !rel.split(path.sep).includes('node_modules');
    },
  });
  return dst;
}

function runChecker(dir) {
  const r = spawnSync(process.execPath, [path.join(dir, 'tools', 'check-capabilities.mjs')], {
    cwd: dir, env: { ...process.env, R37_INNER: '1' }, encoding: 'utf8',
  });
  return r.status === 0;
}

/*  היפוך תא: ✅↔❌, וכל ערך אחר (־«לא רלוונטי», «אין», «טביעה»,
 *  «רב-משתמשים») הופך ל-✅. כל אחד מאלה הוא שקר על הקוד, ולכן חייב
 *  להיתפס.                                                               */
function flipCell(line, col) {
  const parts = line.split('|');
  const i = 3 + col;
  if (i >= parts.length) return null;
  const cur = parts[i];
  parts[i] = cur.indexOf('✅') >= 0 ? ' ❌ ' : ' ✅ ';
  return parts.join('|');
}

const base = copyRepo();
ok('בקרה חיובית: check-capabilities עובר על העץ כמות שהוא', runChecker(base));
fs.rmSync(base, { recursive: true, force: true });

/*  ⚠️ הטבלה מאותרת לפי **שורת הכותרת שלה** ולא לפי «כל שורה שמתחילה
 *  במספר» (סבב 37) — ב-schar-limud יושבת מעליה טבלת מצב המיגרציות, ששורותיה
 *  `| 001 | … |` נקראות כ-1..12 ויש להן פחות עמודות. הסריקה נעצרת בשורה
 *  הראשונה שאינה שורת טבלה.                                             */
const DOC = path.join(ROOT, 'CLAUDE.md');
const docLines = fs.readFileSync(DOC, 'utf8').split('\n');
const head = docLines.findIndex((l) => /^\|\s*#\s*\|\s*שם\s*\|/.test(l));
const rows = [];
if (head >= 0) {
  for (let k = head + 1; k < docLines.length; k++) {
    if (!/^\|/.test(docLines[k])) break;
    const m = /^\|\s*(\d+)\s*\|/.exec(docLines[k]);
    if (m) rows.push({ row: Number(m[1]), line: docLines[k], at: k });
  }
}
ok('שורת הכותרת של טבלת התשתית נמצאה ב-CLAUDE.md', head >= 0);

ok(`טבלת התשתית נקראה מ-CLAUDE.md — ${rows.length} שורות`, rows.length >= 90);

let covered = 0;
for (const r of rows) {
  if (EXEMPT.indexOf(r.row) >= 0) continue;
  const dir = copyRepo();
  const p = path.join(dir, 'CLAUDE.md');
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  const flipped = flipCell(lines[r.at], APP.col);
  if (flipped === null || flipped === lines[r.at]) {
    ok(`שורה ${r.row}: המוטציה לא הצליחה לשנות את התא`, false);
    fs.rmSync(dir, { recursive: true, force: true });
    continue;
  }
  lines[r.at] = flipped;
  fs.writeFileSync(p, lines.join('\n'));
  const stillPasses = runChecker(dir);
  ok(`שורה ${r.row}: היפוך התא מפיל את check-capabilities`, !stillPasses);
  covered++;
  fs.rmSync(dir, { recursive: true, force: true });
}

ok(`כל השורות שאינן מוחרגות נבדקו במוטציה (${covered}; מוחרגות: ${EXEMPT.join(', ')})`,
   covered === rows.length - EXEMPT.length && covered > 0);

/*  ⭐ מוטציית-נגד — ⛔ בלעדיה ההיפוכים אינם מבחינות בין «מודד ערך»
 *  ל«סופר תווים» (סבב 68): ריפוד התא ברווחים **אינו** משנה את הערך
 *  שהמטריצה מצהירה, ⛔ ולכן `check-capabilities` חייב להמשיך לעבור. */
{
  const target = rows.find((r) => EXEMPT.indexOf(r.row) < 0);
  const dir = copyRepo();
  const p = path.join(dir, 'CLAUDE.md');
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  const parts = lines[target.at].split('|');
  parts[3 + APP.col] = '  ' + parts[3 + APP.col].trim() + '   ';
  lines[target.at] = parts.join('|');
  fs.writeFileSync(p, lines.join('\n'));
  ok(`⭐ מוטציית-נגד: ריפוד התא בשורה ${target.row} ברווחים ⛔ אינו מפיל`,
     runChecker(dir));
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(failed ? `\n✗ סבב 37 (מטריצה) — ${failed} נכשלו, ${passed} עברו`
                   : `\n✓ סבב 37 (מטריצה) — ${passed} טענות עברו`);
process.exit(failed ? 1 : 0);

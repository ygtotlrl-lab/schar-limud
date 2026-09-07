#!/usr/bin/env node
/*  test_orphans.mjs — קובץ בעץ ⛔ שאף קובץ אחר אינו מזכיר.
 *
 *  **מה נאכף:** כל קובץ בעץ נמדד מול כל שאר קובצי הטקסט — ⛔ ומי שאין לו
 *  אף מזכיר נספר כשארית. ⭐ שתי קטגוריות מוחרגות **בשמן ובנימוקן**:
 *  `migrations/` — שמוחלות על המסד ואינן נטענות מקוד, ⛔ ונקודות הכניסה
 *  שהדפדפן, אנדרואיד ו-GitHub טוענים בשמן. ⚠️ והחרגה שהתיישנה מפילה אף
 *  היא — ⛔ רשימת-היתר שאין לה מקרה בפועל היא בעצמה השארית.
 *
 *  **הנימוק המדוד:** שורת «קבצים בלי קוראים» עמדה ❌ בארבעתם עם ההערה
 *  «אין שער; נסרק ידנית בכל סבב שנוגע» — ⛔ כלומר לא נסרק: ⚠️ סריקה
 *  ידנית שאיש אינו מריץ אינה מדידה, ⭐ והשורה תיארה עולם שאיש לא בדק.
 *
 *  **מה יישבר בלעדיו:** ⛔ קובץ שנותק מכל קורא נשאר בעץ לנצח — ⚠️ הוא
 *  נדחף, נבנה ל-APK, ונקרא בסבב הבא כאילו הוא חי; ⭐ ומי שעורך אותו
 *  מגלה רק אחר כך שאיש אינו טוען אותו.
 *
 *  **מה אינו נאכף כאן:** ⛔ **קורא חי** — ⚠️ המדידה היא אזכור טקסטואלי:
 *  קובץ ששמו מופיע בהערה בלבד נספר כמוזכר. ⭐ הצד השני — פונקציה בלי
 *  קורא — נאכף ב-`test_removals`, ⛔ והפרדה זו מכוונת.
 *
 *  ⛔ המוטציות אינן נכתבות לעץ — עותק זמני, והשער האמיתי רץ עליו.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 80) — ⚠️ הבודק גוזר מכאן
 *  את המיפוי, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [161];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = process.env.ORPHANS_ROOT ||
             path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INNER = !!process.env.ORPHANS_ROOT;

let failed = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { failed++; console.error('  FAIL ' + m); };
const assert = (c, m) => (c ? ok(m) : bad(m));

const SKIP_DIR = new Set(['.git', 'node_modules', '.gradle', 'build']);
const TEXT = /\.(html|js|mjs|json|md|xml|yml|yaml|gradle|properties|sql|sh|pro|txt|svg)$/i;

/*  ⛔ נקודות כניסה — ⚠️ הדפדפן, אנדרואיד ו-GitHub טוענים אותן **בשם**,
 *  ⭐ ולכן אין ולא יהיה בעץ קובץ שמזכיר אותן. ⛔ כל שם כאן נושא את סיבתו. */
const ENTRY = {
  'index.html':  'נקודת הכניסה של הדפדפן',
  'sw.js':       'ה-service worker — נרשם בשמו מתוך index.html ונטען בנפרד',
  '.nojekyll':   'דגל ל-GitHub Pages — קיומו הוא ההוראה',
};
/*  ⛔ `migrations/` — ⚠️ קובצי SQL שמוחלים על המסד ואינם נטענים מקוד:
 *  ⭐ «אין להם קורא בעץ» הוא מצבם הנכון, ⛔ ולא שארית. */
const EXEMPT_DIR = { 'migrations/': 'מוחלות על המסד ואינן נטענות מקוד' };

function walk(dir, base, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
    if (SKIP_DIR.has(e.name)) continue;
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), rel, out);
    else out.push(rel);
  }
  return out;
}

/*  ⛔ מחזירה את **רשימת** הקבצים בלי מזכיר ⛔ ולא מספר — ⚠️ הודעת כשל
 *  שאומרת «3» שולחת את הקורא לחפש אילו שלושה. */
function orphans(root) {
  const files = walk(root, '', []);
  const texts = files.filter((f) => TEXT.test(f))
    .map((f) => [f, fs.readFileSync(path.join(root, f), 'utf8')]);
  const out = [];
  for (const f of files) {
    if (ENTRY[f]) continue;
    if (Object.keys(EXEMPT_DIR).some((d) => f.startsWith(d))) continue;
    const base = path.basename(f);
    const stem = base.replace(/\.[^.]+$/, '');
    let seen = false;
    for (const [g, body] of texts) {
      if (g === f) continue;
      if (body.includes(f) || body.includes(base) ||
          (stem.length > 3 && body.includes(stem))) { seen = true; break; }
    }
    if (!seen) out.push(f);
  }
  return { files, out };
}

const R = orphans(ROOT);
assert(R.out.length === 0,
  `1 · כל קובץ בעץ מוזכר במקום אחר — נמדדו ${R.out.length} בלי מזכיר מתוך ` +
  `${R.files.length} והצפוי אפס${R.out.length ? ': ' + R.out.join(', ') : ''}. ` +
  'מוחקים את הקובץ, או מחברים לו קורא, או מכריזים עליו בשמו ובנימוקו');

/*  ⛔ החרגה שהתיישנה מפילה — ⚠️ שם שמוכרז כנקודת כניסה ואינו קיים בעץ
 *  הוא בדיוק רשימת-ההיתר שהשורה באה לסלק. */
{
  const have = new Set(R.files);
  const stale = Object.keys(ENTRY).filter((f) => !have.has(f));
  assert(stale.length === 0,
    `2 · כל נקודת כניסה שהוכרזה קיימת בעץ — נמדדו ${stale.length} מוכרזות וחסרות ` +
    `והצפוי אפס${stale.length ? ': ' + stale.join(', ') : ''}. מסירים מהרשימה`);
  const dirs = Object.keys(EXEMPT_DIR).filter((d) => !R.files.some((f) => f.startsWith(d)));
  assert(dirs.length === 0,
    `3 · כל תיקייה מוחרגת קיימת בעץ — נמדדו ${dirs.length} מוכרזות וריקות והצפוי אפס`);
}

if (RUN_MUT) {
/* ── מוטציות — עותק אחד לשער, ולא עותק לכל מוטציה ──────────────────────── */
if (!INNER) {
  /*  ⛔ כותב על עותק — ⚠️ המוטציה שותלת קובץ ומסירה אותו, ⛔ וזה שינוי סט ולא שינוי תוכן. */
  const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'orphans-'));
  process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch (e) {} });
  execFileSync('cp', ['-r', ROOT + '/.', WORK]);

  /*  ⛔ שם המוטציה נבנה בזמן ריצה ⛔ ואינו כתוב כאן כליטרל — ⚠️ שם שמופיע
   *  בגוף השער הזה **מוזכר** בעץ שהועתק, ⭐ והמוטציה הייתה נראית תקינה
   *  בזמן שהיא כלל לא נבדקה. */
  const nonce = 'zz' + Math.random().toString(36).slice(2, 10);
  const planted = path.join(WORK, 'tools', nonce + '.txt');
  fs.mkdirSync(path.dirname(planted), { recursive: true });
  fs.writeFileSync(planted, 'שום קובץ אינו מזכיר אותי\n');
  const m1 = orphans(WORK);
  assert(m1.out.length === 1 && m1.out[0] === 'tools/' + nonce + '.txt',
    `4 · מוטציה: קובץ שאיש אינו מזכיר — טענה 1 הייתה נכשלת (נמדדו ${m1.out.length})`);
  fs.rmSync(planted);

  /*  ⭐ מוטציית-נגד: קובץ **שכן מוזכר** ⛔ אינו מפיל — ⚠️ המדידה היא
   *  אזכור ולא ספירת קבצים, ⛔ ושער שסופר קבצים היה הופך כל תוספת להפרה. */
  const nonce2 = 'zz' + Math.random().toString(36).slice(2, 10);
  const added = path.join(WORK, 'tools', nonce2 + '.txt');
  fs.writeFileSync(added, 'יש לי מזכיר\n');
  const noteAt = path.join(WORK, 'README.md');
  const note = fs.readFileSync(noteAt, 'utf8');
  fs.writeFileSync(noteAt, note + '\n' + nonce2 + '.txt\n');
  const m2 = orphans(WORK);
  assert(m2.out.length === 0,
    `נ1 · ⭐ מוטציית-נגד: קובץ שמוזכר ⛔ אינו מפיל — נמדדו ${m2.out.length} והצפוי אפס`);
  fs.writeFileSync(noteAt, note);
  fs.rmSync(added);

  /*  ⭐ מוטציית-נגד שנייה: העץ חוזר לקדמותו ⛔ ואינו נשאר מלוכלך — ⚠️ מוטציה
   *  שלא שוחזרה הייתה נמדדת יחד עם הבאה אחריה. */
  const m3 = orphans(WORK);
  assert(m3.out.length === 0,
    `נ2 · ⛔ והעץ חוזר לקדמותו אחרי המוטציות — נמדדו ${m3.out.length} והצפוי אפס`);
}

}

console.log(failed ? `\n✗ סבב 80 (קבצים בלי קוראים) — ${failed} טענות נכשלו`
                   : `\n✓ סבב 80 (קבצים בלי קוראים) — כל הטענות עברו`);
process.exit(failed ? 1 : 0);

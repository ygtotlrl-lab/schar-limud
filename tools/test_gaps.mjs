#!/usr/bin/env node
/*  בדיקת סבב 39 — אכיפת פרק «פערים פתוחים» (כלל ברזל 15).
 *
 *  ⚠️ **זהה בית-לבית בארבעת הריפו** — ⛔ ואין בו בלוק `APP` (סבב 39).
 *     הוא בונה עצי-בדיקה סינתטיים בתיקייה זמנית ומריץ עליהם את
 *     `check-gaps.mjs` **האמיתי**, ולכן אינו נשען על תוכן הפערים של
 *     ריפו מסוים — מה שהיה הופך אותו לשונה בין הארבעה.
 *
 *  ⭐ שתי המוטציות שהסבב דרש במפורש:
 *     • שורת פער שתנאיה כבר אינם מתקיימים **חייבת להפיל** את השער.
 *     • שורה שסומנה `לא-מדיד` **חייבת לעבור**.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHECKER = path.join(HERE, 'check-gaps.mjs');

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

/* בונה עץ מינימלי: <tmp>/tools/check-gaps.mjs + <tmp>/CLAUDE.md + index.html */
function mkTree(gapsBody, srcBody) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaps-'));
  fs.mkdirSync(path.join(dir, 'tools'));
  fs.copyFileSync(CHECKER, path.join(dir, 'tools', 'check-gaps.mjs'));
  fs.writeFileSync(path.join(dir, 'index.html'), srcBody === undefined ? 'var FLAG = true;' : srcBody);
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'),
    'עודכן לאחרונה: סבב 39 · 2026-08-19\n\n## משהו\nטקסט.\n\n' +
    (gapsBody === null ? '' : '## פערים פתוחים (בדיקה)\n' + gapsBody + '\n') +
    '\n## פרק אחרי\nעוד טקסט.\n');
  return dir;
}
function run(dir) {
  try {
    const out = execFileSync(process.execPath, [path.join(dir, 'tools', 'check-gaps.mjs')],
      { cwd: dir, stdio: 'pipe' });
    return { code: 0, out: String(out) };
  } catch (e) {
    return { code: e.status || 1, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

console.log('\n· סבב 39 — אכיפת פרק «פערים פתוחים» (כלל ברזל 15)\n');

/* ── א. בקרה חיובית ────────────────────────────────────────────────────── */
ok('1א · `check-gaps.mjs` קיים ב-tools/', fs.existsSync(CHECKER));
{
  const r = run(mkTree('- **פער אמיתי** — הסבר. [מדיד: code:var FLAG = true;]'));
  ok('1ב · תנאי מדיד שמתקיים — השער עובר', r.code === 0);
}
{
  const r = run(mkTree('- **פער שאינו נמדד** — הסבר. [לא-מדיד: מצב מסד שאינו נראה מהריפו]'));
  ok('1ג · ⭐ שורה שסומנה `לא-מדיד` — **עוברת** (הדרישה המפורשת של הסבב)',
    r.code === 0 && /לא-מדיד/.test(r.out));
}
{
  const r = run(mkTree(null));
  ok('1ד · ⚠️ ריפו בלי פרק «פערים פתוחים» — מדלג ועובר', r.code === 0 && /מדלג/.test(r.out));
}

/* ── ב. ⭐ המוטציה המרכזית — פער שנסגר מפיל את השער ─────────────────────── */
{
  const r = run(mkTree('- **פער שנסגר** — הסבר. [מדיד: code:var FLAG = true;]', 'var FLAG = false;'));
  ok('2א · ⭐ תנאי `code:` שחדל להתקיים **מפיל** את השער',
    r.code !== 0 && /הפער נסגר/.test(r.out));
}
{
  const r = run(mkTree('- **פער** — הסבר. [מדיד: no-code:var FLAG]', 'var FLAG = true;'));
  ok('2ב · ⭐ וכך גם `no-code:` שהמחרוזת חזרה אליו',
    r.code !== 0 && /הפער נסגר/.test(r.out));
}
{
  const r = run(mkTree('- **פער** — הסבר. [מדיד: no-file:index.html]'));
  ok('2ג · ⭐ וכך גם `no-file:` על קובץ שנוצר', r.code !== 0 && /הפער נסגר/.test(r.out));
}
{
  const r = run(mkTree('- **פער** — הסבר. [מדיד: file:אין-כזה.sql]'));
  ok('2ד · ⭐ וכך גם `file:` על קובץ שנמחק', r.code !== 0 && /הפער נסגר/.test(r.out));
}

/* ── ג. תג חסר ותנאי שאינו מוכר ────────────────────────────────────────── */
{
  const r = run(mkTree('- **פער בלי תג** — הסבר בלי שום סימון.'));
  ok('3א · ⛔ שורה בלי תג מפילה את השער', r.code !== 0 && /בלי תג/.test(r.out));
}
{
  const r = run(mkTree('- **פער** — הסבר. [מדיד: db:something]'));
  ok('3ב · ⛔ תנאי שאינו מארבעת הסוגים מפיל את השער',
    r.code !== 0 && /אינו מוכר/.test(r.out));
}
{
  const r = run(mkTree('- **פער** — הסבר. [לא-מדיד: ]'));
  ok('3ג · ⛔ «לא-מדיד» בלי נימוק מפיל את השער', r.code !== 0);
}

/* ── ד. פריט רב-שורתי, ותת-פריטים ──────────────────────────────────────── */
{
  const body = [
    '- **פער ארוך** — שורה ראשונה,',
    '  שורה שנייה שממשיכה אותו,',
    '  ועוד שורה. [מדיד: code:var FLAG = true;]',
  ].join('\n');
  const r = run(mkTree(body));
  ok('4א · ⚠️ התג נקרא מסוף הפריט הרב-שורתי, לא משורתו הראשונה', r.code === 0);
}
{
  const body = [
    '- **פער** — הסבר. [מדיד: code:var FLAG = true;]',
    '  - תת-פריט מוזח בלי תג משלו',
  ].join('\n');
  const r = run(mkTree(body));
  ok('4ב · ⚠️ תת-פריט מוזח אינו דורש תג משלו — התג הוא פר-פער', r.code === 0);
}
{
  const body = [
    '- **ראשון** — הסבר. [מדיד: code:var FLAG = true;]',
    '- **שני** — בלי תג.',
  ].join('\n');
  const r = run(mkTree(body));
  ok('4ג · ⛔ ופער שני בלי תג עדיין נתפס', r.code !== 0 && /בלי תג/.test(r.out));
}

/* ── ה. ⛔ הבודק מדווח ואינו מוחק ───────────────────────────────────────── */
{
  const dir = mkTree('- **פער שנסגר** — הסבר. [מדיד: code:var FLAG = true;]', 'var FLAG = false;');
  const before = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  run(dir);
  const after = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  ok('5א · ⛔ הבודק **אינו מוחק** — הקובץ זהה בית-לבית אחרי הריצה', before === after);
}

/* ── ו. ⭐ הקשחת העוגן (סבב 39, השלמה שנייה) — שלוש המוטציות ─────────────────
   ⚠️ הרקע נמדד ולא הונח: שינוי **רווחים בלבד** הפיל את השער עם «⭐ הפער
      נסגר», כלומר כשל בכיוון המסוכן — הצהרה שפער נסגר על קוד שלא השתנה. */
{
  const r = run(mkTree('- **פער** — הסבר. [מדיד: code:var FLAG = true;]',
                       'var  FLAG   =  true;'));
  ok('6א · ⛔ שינוי רווחים בלבד — ⚠️ **אינו** מפיל את השער', r.code === 0);
}
{
  const r = run(mkTree('- **פער** — הסבר. [מדיד: code:var FLAG = true;]',
                       'var FLAG =\n  true;'));
  ok('6ב · ⚠️ וגם שבירת שורה באמצע העוגן אינה מפילה', r.code === 0);
}
{
  const r = run(mkTree('- **פער** — הסבר. [מדיד: code:var FLAG = true;]',
                       'var FLAG = false;'));
  ok('6ג · ⭐ שינוי **ערך** נופל כ«הפער נסגר», ולא כ«נרקב»',
    r.code !== 0 && /⭐ הפער נסגר/.test(r.out) && !/נרקב/.test(r.out));
}
{
  const r = run(mkTree('- **פער** — הסבר. [מדיד: code:var FLAG = true;]',
                       'var OTHER = true;'));
  ok('6ד · ⭐ מחיקת **הסמל** נופלת כ«העוגן נרקב» — ⛔ ולא כ«הפער נסגר»',
    r.code !== 0 && /העוגן נרקב/.test(r.out) && !/⭐ הפער נסגר/.test(r.out));
}
{
  const r = run(mkTree('- **פער** — הסבר. [מדיד: code:function migrateOutbox]',
                       'function migrateOutbox(){}'));
  ok('6ה · ⚠️ עוגן הבסיס מדלג על מילות מפתח — הסמל הוא `migrateOutbox`',
    r.code === 0);
}

/* ── ז. הפרק האמיתי של הריפו הזה ───────────────────────────────────────── */
{
  const r = run(ROOT);
  ok('7א · ⭐ ופרק «פערים פתוחים» האמיתי של הריפו הזה עובר', r.code === 0);
}

/*  ח. ⭐ מוטציית-נגד — ⛔ בלעדיה המוטציות אינן מבחינות בין «מודד» ל«סופר».
 *  ⛔ שינוי **הפרוזה** של שורת הפער ורווחים **בתוך** העוגן אינם משנים דבר
 *  במה שהשער מודד, ⚠️ ולכן הם חייבים לעבור — ⛔ אחרת השער נופל על ניסוח. */
{
  const r = run(mkTree(
    '- **אותו פער בדיוק, בנוסח אחר לגמרי ועם מילים שלא היו כאן** — הסבר ' +
    'מורחב שנכתב מחדש. [מדיד: code:var   FLAG  =   true;]'));
  ok('8א · ⭐ מוטציית-נגד: פרוזה חדשה ורווחים בתוך העוגן ⛔ אינם מפילים',
    r.code === 0);
}

console.log(`\n${fail ? '✗' : '✓'} סבב 39 (אכיפת הפערים) — ${pass} טענות עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);

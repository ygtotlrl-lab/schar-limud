#!/usr/bin/env node
/*  test_rulesdocs — ארבעת בלוקי הכללים, תוכן הקבצים, וההפניות (סבב 69).
 *
 *  שלוש טענות שאין להן שער אחר:
 *
 *    א. **ארבעה בלוקי כללים בדיוק.** ⛔ בלוק חמישי מפיל: ⚠️ הפיצול לעשרים
 *       וארבעה בלוקים הוא בדיוק מה שהסתיר סטייה מאחורי חתימה שתאמה לתוכן
 *       ישן, ⛔ וכל בלוק נוסף מחזיר את הפיצול.
 *    ב. **תוכן הקבצים לפי תפקידם.** ⛔ הבדיקה היא **כל סטייה מההגדרה**
 *       ולא רשימת דוגמאות: כל כותרת בחלק הפרטי של `CLAUDE.md` שאינה
 *       פרק סבב ואינה תחת «מסכים ולוגיקה» — מפילה.
 *       ⚠️ תוכן תפעולי נקרא פעם אחת ומשולם בכל סשן.
 *    ג. **הערה אינה שולחת את הקורא לקובץ אחר.** ⛔ «ר' X ב-CLAUDE.md»
 *       מפיל — ⚠️ השער מגן, ולא ההפניה, והפניה נשברת בכל שינוי שם בשקט.
 *
 *  ⛔ לכל טענה מוטציה שמפילה אותה ומוטציית-נגד שאינה מפילה, ⛔ והמוטציות
 *  רצות על עותק בתיקייה זמנית ולא על העץ.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = { app: 'schar-limud' };
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const t = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); }
                      else { fail++; console.error('  FAIL ' + m); } };

const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const DOC = rd('CLAUDE.md');

/*  ⛔ הכותרות המותרות בחלק הפרטי — ⚠️ זו ההגדרה עצמה ולא רשימת דוגמאות:
 *  מסכים ולוגיקה של האפליקציה · הפער הפתוח · ופרקי הסבבים שבחלון. */
const PRIVATE_H2 = [
  /^##\s+מסכים ולוגיקה/,
  /^##\s+(?:⭐\s+)?סבב\s/,
];

function fenceMask(ls) {
  const m = new Array(ls.length).fill(false);
  let f = false;
  for (let i = 0; i < ls.length; i++) {
    if (ls[i].startsWith('```')) { f = !f; m[i] = true; continue; }
    m[i] = f;
  }
  return m;
}

/*  ⚠️ הניתוח מוצא בלוקי SHARED וכותרות `##` פרטיות בטקסט כלשהו, כדי
 *  שאותה פונקציה תרוץ גם על העותק המוטב. */
function analyze(doc) {
  const ls = doc.split('\n');
  const inF = fenceMask(ls);
  const ids = [];
  const heads = [];
  let inb = false;
  for (let i = 0; i < ls.length; i++) {
    if (inF[i]) continue;
    const m = /^<!--\s*SHARED:start\s+id="([^"]*)"/.exec(ls[i]);
    if (m) { ids.push(m[1]); inb = true; continue; }
    if (/^<!--\s*SHARED:end/.test(ls[i])) { inb = false; continue; }
    if (!inb && ls[i].startsWith('## ')) heads.push(ls[i]);
  }
  return { ids, heads };
}

/* ── א. ארבעה בלוקי כללים בדיוק ────────────────────────────────────────── */
const WANT = ['rules-table', 'rules-enforce', 'rules-writing', 'rules-session'];
{
  const { ids } = analyze(DOC);
  t(ids.length === 4, `א1 · ארבעה בלוקי SHARED בדיוק (נמצאו ${ids.length})`);
  t(WANT.every((w, i) => ids[i] === w),
    'א2 · והם `rules-table` · `rules-enforce` · `rules-writing` · `rules-session`, בסדר הזה');
}

/* ── ב. תוכן הקבצים לפי תפקידם ─────────────────────────────────────────── */
{
  const { heads } = analyze(DOC);
  const bad = heads.filter((h) => !PRIVATE_H2.some((re) => re.test(h)));
  t(bad.length === 0,
    `ב1 · כל כותרת בחלק הפרטי היא מסכים, פער או פרק סבב${bad.length ? ' — ' + bad.join(' · ') : ''}`);
  /*  ⛔ ושלושת הקבצים הנלווים אינם מחזיקים כללים (סבב 69) — ⚠️ כלל
   *  שמופיע בשניהם הוא מקור אמת שני, וזה בדיוק מה שנסחף. */
  for (const f of ['README.md', 'CONTEXT.md', 'android/README.md']) {
    const s = rd(f);
    t(!/^##\s+⭐?\s*כלל ברזל/m.test(s) && !/<!--\s*SHARED:start\s+id="rules-/.test(s),
      `ב2 · ${f} אינו מחזיק פרק כללים`);
  }
}

/* ── ג. הערה אינה מפנה לקובץ ───────────────────────────────────────────── */
/*  ⛔ אין לתפוס אזכור סתם (סבב 69) — התבנית היא **הפניה**: «ר'/ראה …
 *  ב-<קובץ>». ⚠️ שער שקורא קובץ רשאי לנקוב בשמו, ⛔ ולכן
 *  `APP.docs = 'CLAUDE.md'` אינו נתפס. */
const REF_RE = /(?:ר'|ר׳|ראה|עיין)[^\n]{0,60}ב-?[«"'`]?(?:CLAUDE\.md|CONTEXT\.md|README\.md)/;
function refHits(text) {
  return text.split('\n').filter((l) => REF_RE.test(l));
}
{
  const files = ['index.html', 'sw.js'];
  /*  ⛔ אין לסרוק את הקובץ הזה עצמו (סבב 69) — ⚠️ הוא מחזיק את התבנית
   *  שהוא אוכף, גם בבאנר וגם במחרוזת המוטציה, ⛔ ולכן היה נופל על עצמו. */
  for (const f of fs.readdirSync(path.join(ROOT, 'tools'))) {
    if (f.endsWith('.mjs') && f !== 'test_rulesdocs.mjs') files.push('tools/' + f);
  }
  const hits = [];
  for (const f of files) {
    for (const l of refHits(rd(f))) hits.push(`${f}: ${l.trim().slice(0, 60)}`);
  }
  t(hits.length === 0,
    `ג1 · אין הפניה לקובץ בקוד ובשערים${hits.length ? ' — ' + hits.slice(0, 3).join(' · ') : ''}`);
}

/* ── המוטציות — על עותק בתיקייה זמנית ──────────────────────────────────── */
function runOn(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rulesdocs-'));
  execFileSync('cp', ['-r', ROOT + '/.', dir]);
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  const r = execFileSync('node', [path.join(dir, 'tools', 'test_rulesdocs.mjs')],
    { cwd: dir, encoding: 'utf8', stdio: 'pipe' , env: { ...process.env, RULESDOCS_INNER: '1' } });
  fs.rmSync(dir, { recursive: true, force: true });
  return r;
}
function fails(files) {
  try { runOn(files); return false; } catch { return true; }
}

if (!process.env.RULESDOCS_INNER) {
  /*  ⛔ מ1 — בלוק חמישי מפיל את א1. */
  t(fails({ 'CLAUDE.md': DOC + '\n<!-- SHARED:start id="rules-extra" -->\nגוף.\n<!-- SHARED:end -->\n' }),
    'מ1 · בלוק כללים חמישי **מפיל**');
  /*  ⛔ מ2 — כותרת פרטית שאינה מסכים/פער/סבב מפילה את ב1. */
  t(fails({ 'CLAUDE.md': DOC + '\n## צעדי התקנת המסד\nגוף תפעולי.\n' }),
    'מ2 · כותרת תפעולית בחלק הפרטי **מפילה**');
  /*  ⛔ מ3 — פרק כללים בקובץ נלווה מפיל את ב2. */
  t(fails({ 'README.md': rd('README.md') + '\n## ⭐ כלל ברזל 99 — כלל שהוברח לכאן\nגוף.\n' }),
    'מ3 · פרק כללים ב-`README.md` **מפיל**');
  /*  ⛔ מ4 — הפניה שהוחזרה לקוד מפילה את ג1. */
  t(fails({ 'sw.js': "/* ר' «אזור מצב» ב-CLAUDE.md */\n" + rd('sw.js') }),
    'מ4 · הפניה לקובץ בהערה **מפילה**');

  /*  ⭐ מוטציות-נגד — ⛔ שינוי אמיתי שחייב **לעבור**. */
  t(!fails({ 'CLAUDE.md': DOC + '\n## סבב 99 (2099-01-01) — פרק סבב נוסף\nגוף.\n' }),
    'נ1 · ⭐ כותרת פרק סבב ⛔ **אינה** מפילה — היא מותרת בהגדרה');
  t(!fails({ 'sw.js': "/* ⚠️ `CLAUDE.md` הוא שם קובץ ולא הפניה. */\n" + rd('sw.js') }),
    'נ2 · ⭐ אזכור שם הקובץ בלי «ר׳ … ב-» ⛔ **אינו** מפיל');
}

console.log(fail ? `\n✗ סבב 69 (כללים ותוכן הקבצים) — ${fail} נכשלו, ${pass} עברו`
                 : `\n✓ סבב 69 (כללים ותוכן הקבצים) — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);

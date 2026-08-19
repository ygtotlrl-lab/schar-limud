#!/usr/bin/env node
/*  סבב 39 — השלמה שנייה: אכיפת שלד שלושת קובצי ה-md הנלווים.
 *
 *  `CLAUDE.md` נשמר ע"י בלוקי ה-SHARED מסבב 18, אבל `README.md`,
 *  `CONTEXT.md` ו-`android/README.md` לא נבדקו כלל — והם נסחפו: ל-CONTEXT
 *  של יומן חסרה הייתה אזהרת ה-GRANT שקיימת בשלוש האחיות, ול-`android/README`
 *  של גיוס חסרו שני פרקים שלמים. סעיף ו של `check-docs.mjs` אוכף מעכשיו
 *  את השלד, והבדיקה הזו מוודאת שהוא **באמת נופל** כשהשלד נשבר.
 *
 *  ⭐ סבב 41 הוסיף לה שכבה שנייה: שש הפסקאות המשותפות שבשלושת הקבצים
 *  מסומנות ב-`SHARED` ונחתמות ב-sha256 (סעיף ז), ושלוש מוטציות מודדות
 *  שהאכיפה היא על **תוכן** ולא על שלד.
 *
 *  ⚠️ הקובץ זהה בית-לבית בארבעת הריפו — אין בו בלוק `APP`, הוא נגזר
 *  מהקבצים שלצידו.                                                        */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, bad = 0;
const ok = (m) => { n++; console.log(`  ok   ${m}`); };
const no = (m) => { n++; bad++; console.error(`  FAIL ${m}`); };
const t  = (c, m) => (c ? ok(m) : no(m));

/* שלושת הקבצים והפרק שנמחק בכל מוטציה — הכותרת הראשונה שהשלד דורש. */
const CASES = [
  ['README.md',         /^##\s+מסכים\s*$/m,                 'מסכים'],
  ['CONTEXT.md',        /^##\s+טבלאות\s*$/m,                'טבלאות'],
  ['android/README.md', /^##\s+Build\s*$/m,                 'Build'],
];

console.log('· סבב 39ב — שלד שלושת קובצי ה-md');

/* 1 — שלושת הקבצים קיימים */
for (const [f] of CASES) t(fs.existsSync(join(ROOT, f)), `${f} קיים`);

/* 2 — הבדיקה עוברת על העץ כמות שהוא */
const run = (cwd) => spawnSync(process.execPath, [join(cwd, 'tools', 'check-docs.mjs')],
                               { cwd, encoding: 'utf8' });
const baseDir = mkdtempSync(join(tmpdir(), 'md-skel-'));
for (const f of ['CLAUDE.md', 'README.md', 'CONTEXT.md']) cpSync(join(ROOT, f), join(baseDir, f));
cpSync(join(ROOT, 'android'), join(baseDir, 'android'), { recursive: true });
cpSync(join(ROOT, 'tools'), join(baseDir, 'tools'), { recursive: true });
t(run(baseDir).status === 0, 'check-docs עובר על עותק נקי של העץ');

/* 3 — מוטציה: מחיקת פרק נדרש מכל אחד משלושת הקבצים מפילה את השער */
for (const [f, re, name] of CASES) {
  const dir = mkdtempSync(join(tmpdir(), 'md-skel-mut-'));
  cpSync(baseDir, dir, { recursive: true });
  const p = join(dir, f);
  const src = fs.readFileSync(p, 'utf8');
  t(re.test(src), `${f}: הפרק «${name}» קיים לפני המוטציה`);
  fs.writeFileSync(p, src.replace(re, '## ---'), 'utf8');
  const r = run(dir);
  t(r.status !== 0, `⛔ מחיקת «${name}» מ-${f} מפילה את check-docs`);
  t(/שלד הקובץ נקבע בסבב 39/.test(r.stderr + r.stdout),
    `   והשגיאה מצביעה על השלד ולא על משהו אחר`);
}

/* ── 4 — סבב 41: הפסקאות המשותפות נאכפות בתוכן, ולא בשלד ────────────────
 *  ⚠️ סעיף ו רואה כותרות בלבד, ולכן פרק שאיבד את גופו עובר אותו. סעיף ז
 *  שנוסף בסבב 41 חותם את שש הפסקאות המשותפות ב-sha256; שלוש המוטציות
 *  כאן מודדות שהוא **באמת** תופס מחיקה ושינוי-בית, ⛔ ושהוא **אינו**
 *  נופל על פסקה פרטית — שער שנופל על תוכן פר-אפליקציה היה בדיוק כלל
 *  ברזל 8 סעיף 4 בהיפוך.                                                 */
console.log('· סבב 41 — תוכן הפסקאות המשותפות');

const mutDir = () => { const d = mkdtempSync(join(tmpdir(), 'md-shared-mut-')); cpSync(baseDir, d, { recursive: true }); return d; };

/* 4א — מחיקת פסקה משותפת שלמה (עם הסימונים) מפילה */
{
  const d = mutDir(), p = join(d, 'CONTEXT.md');
  const src = fs.readFileSync(p, 'utf8');
  const i = src.indexOf('<!-- SHARED:start id="context-grant" -->');
  const j = src.indexOf('<!-- SHARED:end -->', i) + '<!-- SHARED:end -->'.length;
  t(i > 0, 'CONTEXT.md: הפסקה המשותפת «context-grant» מסומנת לפני המוטציה');
  fs.writeFileSync(p, src.slice(0, i) + src.slice(j), 'utf8');
  const r = run(d);
  t(r.status !== 0, '⛔ מחיקת פסקה משותפת מ-CONTEXT.md מפילה את check-docs');
  t(/פסקאות משותפות חסרות/.test(r.stderr + r.stdout), '   והשגיאה אומרת שהפסקה חסרה');
}

/* 4ב — שינוי בית אחד בתוך פסקה משותפת מפיל */
{
  const d = mutDir(), p = join(d, 'README.md');
  const src = fs.readFileSync(p, 'utf8');
  const needle = 'שחרור קוד web אינו מצריך APK חדש.';
  t(src.includes(needle), 'README.md: הפסקה המשותפת «readme-apk» נושאת את המשפט לפני המוטציה');
  fs.writeFileSync(p, src.replace(needle, 'שחרור קוד web אינו מצריך APK חדש'), 'utf8');
  const r = run(d);
  t(r.status !== 0, '⛔ שינוי בית בפסקה משותפת מפיל את check-docs');
  t(/אינה זהה לחתימה/.test(r.stderr + r.stdout), '   והשגיאה מצביעה על החתימה');
}

/* 4ג — שינוי בפסקה פרטית ⛔ אינו מפיל */
{
  const d = mutDir(), p = join(d, 'README.md');
  const src = fs.readFileSync(p, 'utf8');
  const m = /^##\s+מסכים\s*$/m.exec(src);
  t(!!m, 'README.md: פרק «מסכים» — פרטי לאפליקציה — קיים');
  const at = src.indexOf('\n', m.index + m[0].length) + 1;
  fs.writeFileSync(p, src.slice(0, at) + '\n- **פרק בדיקה פרטי** — נוסף במוטציה.\n' + src.slice(at), 'utf8');
  t(run(d).status === 0, '⛔ שינוי בפסקה פרטית אינו מפיל את check-docs');
}

console.log(bad ? `\n❌ סבב 39ב — ${bad} מתוך ${n} נכשלו` : `\n✓ סבב 39ב+41 (שלושת קובצי ה-md) — ${n} טענות עברו`);
process.exit(bad ? 1 : 0);

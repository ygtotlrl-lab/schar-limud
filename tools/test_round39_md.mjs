#!/usr/bin/env node
/*  סבב 39 — השלמה שנייה: אכיפת שלד שלושת קובצי ה-md הנלווים.
 *
 *  `CLAUDE.md` נשמר ע"י בלוקי ה-SHARED מסבב 18, אבל `README.md`,
 *  `CONTEXT.md` ו-`android/README.md` לא נבדקו כלל — והם נסחפו: ל-CONTEXT
 *  של יומן חסרה הייתה אזהרת ה-GRANT שקיימת בשלוש האחיות, ול-`android/README`
 *  של גיוס חסרו שני פרקים שלמים. סעיף ו של `check-docs.mjs` אוכף מעכשיו
 *  את השלד, והבדיקה הזו מוודאת שהוא **באמת נופל** כשהשלד נשבר.
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

console.log(bad ? `\n❌ סבב 39ב — ${bad} מתוך ${n} נכשלו` : `\n✓ סבב 39ב (שלד md) — ${n} טענות עברו`);
process.exit(bad ? 1 : 0);

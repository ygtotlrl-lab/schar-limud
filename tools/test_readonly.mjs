#!/usr/bin/env node
/*  test_readonly.mjs — ⛔ שער קורא בלבד (סבב 70).
 *
 *  **מה נאכף:** הרצת כל השערים על עותק של העץ אינה משנה בו אף בית — לא
 *  קובץ שנכתב, לא קובץ שנוסף ולא קובץ שנמחק. המדידה היא סנפשוט sha256 של
 *  כל קובץ לפני ואחרי, ⛔ ולא `git status`: היא תופסת גם עץ בלי `.git`,
 *  וגם קובץ ששוחזר לתוכן שגוי.
 *
 *  **ולמה זה יכול להישבר:** לשער נוח למדוד «במקום» — לשנות נכס, למדוד,
 *  ולשחזר. ⚠️ החלון שבין השניים הוא עץ שגוי, ⛔ ומדידה שנפלה באמצע
 *  משאירה אותו שגוי לתמיד. ⚠️ ומי שהריץ אינו רואה זאת: השער דיווח «עבר».
 *
 *  ⚠️ זהה בית-לבית בארבעת הריפו — ⛔ ואין בו בלוק `APP`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/*  ⛔ הריצה הפנימית מדלגת — ⚠️ בלעדיה הוא מריץ `check-js` שמריץ אותו,
 *  והרקורסיה אינה נעצרת. */
if (process.env.R33_INNER || process.env.R37_INNER) {
  console.log('test_readonly: ריצה פנימית — מדלג (מניעת רקורסיה)');
  process.exit(0);
}

let pass = 0, fail = 0;
const t = (n, cond, m) => { if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

const SKIP = new Set(['.git', 'node_modules']);
function copyRepo() {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'r70-ro-'));
  fs.cpSync(ROOT, dst, {
    recursive: true,
    filter: (src) => !path.relative(ROOT, src).split(path.sep).some((s) => SKIP.has(s)),
  });
  return dst;
}

/*  סנפשוט: נתיב יחסי → sha256. ⚠️ תיקייה ריקה שנוצרה ונמחקה אינה נמדדת,
 *  ⛔ וזו הגבלה מוצהרת ולא השמטה — מה שמזיק הוא **תוכן** שהשתנה. */
function snapshot(dir) {
  const out = new Map();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.isFile())
        out.set(path.relative(dir, f),
                crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'));
    }
  };
  walk(dir);
  return out;
}

/*  מריץ כלי אחד בעותק, ומחזיר את מה שהשתנה בעץ.
 *  ⛔ `R33_INNER` נדרש כאן — ⚠️ בלעדיו הריצה הפנימית פותחת עותק משלה. */
function drift(dir, tool) {
  const before = snapshot(dir);
  const r = spawnSync(process.execPath, [path.join(dir, 'tools', tool)],
                      { cwd: dir, env: { ...process.env, R33_INNER: '1' }, encoding: 'utf8' });
  const after = snapshot(dir);
  const changed = [];
  for (const [f, h] of after) if (!before.has(f)) changed.push('נוסף ' + f);
                              else if (before.get(f) !== h) changed.push('שונה ' + f);
  for (const f of before.keys()) if (!after.has(f)) changed.push('נמחק ' + f);
  return { changed, status: r.status };
}

let n = 1;

/* ── א. קו הבסיס — כל השערים על עותק נקי ───────────────────────────────── */
{
  const dir = copyRepo();
  const { changed, status } = drift(dir, 'check-js.mjs');
  t(n++, status === 0, 'קו הבסיס — `check-js` עובר על עותק העץ (כולל כל השערים)');
  t(n++, changed.length === 0,
    '⛔ ואינו משנה בו אף קובץ' + (changed.length ? ' — ' + changed.slice(0, 5).join(' · ') : ''));
  fs.rmSync(dir, { recursive: true, force: true });
}

/*  ⚠️ שתי המוטציות רצות על **שער בודד** ולא על כל הסט — ⭐ המנגנון הנבדק
 *  הוא הסנפשוט וההשוואה, וקו הבסיס שלמעלה הוא זה שמכסה את הסט המלא. */
const writer = (body) => `#!/usr/bin/env node
import fs from 'node:fs';
${body}
console.log('  ok   מוטנט');
`;

/* ── ב. מוטציה — שער שכותב לתוך העץ ⛔ חייב להיתפס ──────────────────────── */
{
  const dir = copyRepo();
  fs.writeFileSync(path.join(dir, 'tools', 'test_mutant_write.mjs'),
                   writer("fs.appendFileSync('manifest.json', '\\n');"));
  const { changed } = drift(dir, 'test_mutant_write.mjs');
  t(n++, changed.some((c) => c.startsWith('שונה manifest.json')),
    '⛔ מוטציה: שער שכותב לקובץ בעץ **נתפס**');
  fs.rmSync(dir, { recursive: true, force: true });
}

/* ── ג. מוטציה — שער שמשנה ומשחזר ⛔ נתפס גם הוא כשהשחזור אינו מדויק ────── */
{
  const dir = copyRepo();
  fs.writeFileSync(path.join(dir, 'tools', 'test_mutant_restore.mjs'),
                   writer("const p='manifest.json', b=fs.readFileSync(p);\n" +
                          "fs.writeFileSync(p, Buffer.concat([b, Buffer.from(' ')]));\n" +
                          "fs.writeFileSync(p, b);"));
  const { changed } = drift(dir, 'test_mutant_restore.mjs');
  t(n++, changed.length === 0,
    '⚠️ שער שמשנה ומשחזר **בדיוק** אינו נתפס — ⛔ וזו מגבלת הסנפשוט, מוצהרת');
  fs.rmSync(dir, { recursive: true, force: true });
}

/* ── ד. מוטציית-נגד — כתיבה **מחוץ** לעץ ⛔ אינה מפילה ──────────────────── */
{
  const dir = copyRepo();
  fs.writeFileSync(path.join(dir, 'tools', 'test_mutant_tmp.mjs'),
                   writer("import os from 'node:os';\nimport path from 'node:path';\n" +
                          "const d=fs.mkdtempSync(path.join(os.tmpdir(),'r70-m-'));\n" +
                          "fs.writeFileSync(path.join(d,'x.txt'),'x');"));
  const { changed } = drift(dir, 'test_mutant_tmp.mjs');
  t(n++, changed.length === 0,
    '⭐ מוטציית-נגד: שער שכותב לתיקייה זמנית ⛔ אינו מפיל — נמדד העץ, לא כל כתיבה');
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(fail ? `\n✗ סבב 70 (שער קורא בלבד) — ${fail} נכשלו, ${pass} עברו`
                 : `\n✓ סבב 70 (שער קורא בלבד) — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
/*  test_readonly.mjs — ⛔ שער קורא בלבד, והנעילה המבנית (סבב 72: מוזג).
 *
 *  **מה נאכף:** (א) הרצת כל השערים על עותק של העץ אינה משנה בו אף בית —
 *  לא קובץ שנכתב, לא קובץ שנוסף ולא קובץ שנמחק; (ב) `check-structure`
 *  נופל על קובץ זר, תיקייה חסרה, בודק חסר ושם שער בתבנית ישנה;
 *  (ג) שגיאת תחביר ב-JS המוטבע מפילה את `check-js`.
 *
 *  **הנימוק המדוד:** שני שערים נפרדים הריצו את `check-js` המלא על עותק —
 *  16.2 שניות של אותה עבודה פעמיים. ⛔ ריצת הבסיס כאן היא גם הבקרה
 *  החיובית של המבנה, ⭐ ולכן אין טעם בשנייה.
 *
 *  **מה יישבר בלעדיו:** לשער נוח למדוד «במקום» — לשנות נכס, למדוד,
 *  ולשחזר. ⚠️ החלון שבין השניים הוא עץ שגוי, ⛔ ומדידה שנפלה באמצע
 *  משאירה אותו שגוי לתמיד. ⚠️ ומי שהריץ אינו רואה זאת: השער דיווח «עבר».
 *  ⚠️ ובלי המוטציות המבניות, `check-structure` הוא הצהרה ולא שער.
 *
 *  **מה אינו נאכף כאן:** תוכן הקבצים תחת `android/` — ⛔ הסט נאכף כאן
 *  והחתימות בשער האנדרואיד, ⚠️ וכפילות הייתה שני מקורות אמת. וכן שער
 *  שמשנה ומשחזר **בדיוק** — ⛔ מגבלת הסנפשוט, מוצהרת בטענה עצמה.
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

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [22];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

/*  ⛔ הריצה הפנימית מדלגת — ⚠️ בלעדיה הוא מריץ `check-js` שמריץ אותו,
 *  והרקורסיה אינה נעצרת. */
if (process.env.R33_INNER || process.env.R37_INNER) {
  console.log('test_readonly: ריצה פנימית — מדלג (מניעת רקורסיה)');
  process.exit(0);
}

/*  ⛔ כל גופו של השער הזה הוא מוטציה ובדיקת שלמות (סבב 92) — ⚠️ ולכן
 *  הוא כולו מדלג ברמה המהירה, ⛔ ורץ ברמה המלאה בלבד. */
if (!RUN_MUT) {
  console.log('test_readonly: המוטציות רצות ברמה המלאה (--full) — מדלג');
  process.exit(0);
}

let pass = 0, fail = 0;
const t = (n, cond, m) => { if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

const SKIP = new Set(['.git', 'node_modules']);
function copyRepo() {
  /*  ⛔ עותק לכל תרחיש, ⛔ ובכוונה (סבב 92) — ⚠️ נמדדו **שישה** בהרצה
      אחת: ⭐ הטענה כאן היא ש**העץ אינו משתנה**, ⛔ ועותק שמשוחזר בין
      תרחישים היה מודד את השחזור ולא את השער. */
  /*  ⛔ כותב על עותק — ⚠️ הטענה עצמה היא שהעץ אינו משתנה, ⛔ ואין דרך למדוד אותה בלי עץ. */
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

/*  מריץ כלי אחד בעותק, ומחזיר את קוד היציאה.
 *  ⛔ `R33_INNER` נדרש כאן — ⚠️ בלעדיו הריצה הפנימית פותחת עותק משלה. */
function runGate(dir, tool, extraEnv) {
  const r = spawnSync(process.execPath, [path.join(dir, 'tools', tool)],
                      { cwd: dir, env: { ...process.env, R33_INNER: '1', ...extraEnv },
                        encoding: 'utf8' });
  return r.status;
}

/*  אותה הרצה, ולצידה מה שהשתנה בעץ. */
function drift(dir, tool) {
  const before = snapshot(dir);
  const status = runGate(dir, tool);
  const after = snapshot(dir);
  const changed = [];
  for (const [f, h] of after) if (!before.has(f)) changed.push('נוסף ' + f);
                              else if (before.get(f) !== h) changed.push('שונה ' + f);
  for (const f of before.keys()) if (!after.has(f)) changed.push('נמחק ' + f);
  return { changed, status };
}

let n = 1;

/* ── א. קו הבסיס — כל השערים על עותק נקי ───────────────────────────────── */
/*  ⭐ זו גם הבקרה החיובית של `check-structure` ושל `check-js` (סבב 72):
 *  שניהם רצים כאן, בתוך הסט. ⛔ אין ריצה נוספת שלהם לבדם (סבב 72) —
 *  היא אותה עבודה פעמיים, ⚠️ והיא שהחזיקה 16.2 שניות מזמן ההרצה. */
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

/* ── ה. הנעילה המבנית — `check-structure` על עץ מומט ───────────────────── */
{
  const dir = copyRepo();
  const CHECK_DOCS = fs.readFileSync(path.join(dir, 'tools', 'check-docs.mjs'));

  fs.writeFileSync(path.join(dir, 'stray-file.txt'), 'זר\n');
  t(n++, runGate(dir, 'check-structure.mjs') !== 0,
    '⛔ מוטציה: קובץ זר בשורש מפיל את `check-structure`');
  fs.rmSync(path.join(dir, 'stray-file.txt'));

  fs.renameSync(path.join(dir, 'signing'), path.join(dir, 'signing-x'));
  t(n++, runGate(dir, 'check-structure.mjs') !== 0,
    '⛔ מוטציה: תיקייה קנונית חסרה (וגם עודפת) מפילה אותו');
  fs.renameSync(path.join(dir, 'signing-x'), path.join(dir, 'signing'));

  fs.rmSync(path.join(dir, 'tools', 'check-docs.mjs'));
  t(n++, runGate(dir, 'check-structure.mjs') !== 0,
    '⛔ מוטציה: בודק משותף חסר ב-tools/ מפיל אותו');
  fs.writeFileSync(path.join(dir, 'tools', 'check-docs.mjs'), CHECK_DOCS);

  /*  ⛔ תוכן ארבע התיקיות (סבב 65) — עד אז `android/`, `migrations/`,
   *  `signing/` ו-`.github/` היו **תיקיות מוכרזות שאיש לא הסתכל לתוכן**,
   *  ושם שרדו `copy-assets.sh` ו-`assets/.gitkeep` בלי קורא. */
  const stray = path.join(dir, 'android', 'app', 'src', 'main', 'zzz-stray.txt');
  fs.mkdirSync(path.dirname(stray), { recursive: true });
  fs.writeFileSync(stray, 'זר\n');
  t(n++, runGate(dir, 'check-structure.mjs') !== 0,
    '⛔ מוטציה: קובץ זר ב-android/ מפיל אותו');
  fs.rmSync(stray);

  const badMig = path.join(dir, 'migrations', '99_bad_name.sql');
  fs.writeFileSync(badMig, '-- זר\n');
  t(n++, runGate(dir, 'check-structure.mjs') !== 0,
    '⛔ מוטציה: מיגרציה בלי מספור תלת-ספרתי מפילה אותו');
  fs.rmSync(badMig);

  /*  ⛔ שם השער נגזר מהנושא (סבב 67) — `test_round52_pendflush` לא אמר
   *  למי שחיפש «מה בודק את מודול הנעילה» דבר. ⚠️ ומוטציית-הנגד היא מה
   *  שמבחין בין «אוכף תבנית» ל«פוסל כל קובץ חדש ב-tools/». */
  const badTest = path.join(dir, 'tools', 'test_round99_legacy.mjs');
  fs.writeFileSync(badTest, '// זר\n');
  t(n++, runGate(dir, 'check-structure.mjs') !== 0,
    '⛔ מוטציה: שם שער בתבנית הישנה (test_round<N>_) מפיל אותו');
  fs.rmSync(badTest);

  const goodTest = path.join(dir, 'tools', 'test_topicname.mjs');
  fs.writeFileSync(goodTest, '// תקין\n');
  t(n++, runGate(dir, 'check-structure.mjs') === 0,
    '⭐ מוטציית-נגד: `test_<נושא>.mjs` ⛔ אינו מפיל — נאכפת התבנית, לא הכמות');
  fs.rmSync(goodTest);

  const wf = path.join(dir, '.github', 'workflows', 'zzz.yml');
  fs.writeFileSync(wf, 'name: zzz\n');
  t(n++, runGate(dir, 'check-structure.mjs') !== 0,
    '⛔ מוטציה: workflow שאינו קנוני מפיל אותו');
  fs.rmSync(wf);

  /*  ⭐ מוטציית-נגד — הסט נאכף, ⛔ לא התוכן: חתימות הקבצים יושבות בשער
   *  האנדרואיד, ⛔ וכפילות שם הייתה שני מקורות אמת. */
  const man = path.join(dir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  fs.appendFileSync(man, '\n<!-- הערה -->\n');
  t(n++, runGate(dir, 'check-structure.mjs') === 0,
    '⭐ מוטציית-נגד: שינוי תוכן ב-android/ ⛔ אינו מפיל — הסט נאכף, לא התוכן');

  fs.rmSync(dir, { recursive: true, force: true });
}

/* ── ו. שגיאת תחביר ב-JS המוטבע ────────────────────────────────────────── */
/*  ⛔ בשלבי ה-`node --check` בלבד (סבב 72) — ⚠️ ריצה מלאה כאן הייתה
 *  מריצה את הסט כולו בשלישית. */
{
  const dir = copyRepo();
  const STAGES = { CHECKJS_STAGES_ONLY: '1' };
  const idx = path.join(dir, 'index.html');
  const CLEAN = fs.readFileSync(idx);

  /* בלוק מוטבע עם שגיאת תחביר — בדיוק הסוג שמגיע למשתמש כמסך לבן.
     ⚠️ מוסף כבלוק חדש ולא בעריכת בלוק קיים: ה-</script> האחרון בקובץ
     עלול להיות סקריפט חיצוני (src=), שהשער מדלג עליו במכוון. */
  fs.appendFileSync(idx, '\n<script>function {</script>\n');
  t(n++, runGate(dir, 'check-js.mjs', STAGES) !== 0,
    '⛔ מוטציה: שגיאת תחביר ב-JS המוטבע מפילה את `check-js`');
  fs.writeFileSync(idx, CLEAN);

  fs.appendFileSync(idx, '\n<!-- הערה שנוספה במוטציית-הנגד -->\n');
  t(n++, runGate(dir, 'check-js.mjs', STAGES) === 0,
    '⭐ מוטציית-נגד: תוספת HTML תקינה ⛔ אינה מפילה — נאכף התחביר, לא התוכן');

  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(fail ? `\n✗ סבב 72 (קורא בלבד + נעילה מבנית) — ${fail} נכשלו, ${pass} עברו`
                 : `\n✓ סבב 72 (קורא בלבד + נעילה מבנית) — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);

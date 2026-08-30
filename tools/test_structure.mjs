#!/usr/bin/env node
/*  בדיקות סבב 33 — הנעילה המבנית ושער ה-JS (כלל ברזל 8 סעיף 6).
 *
 *  הבדיקה מריצה את השערים **האמיתיים** על עותק זמני של עץ העבודה, פעם
 *  כבקרה חיובית ופעם אחרי מוטציה — כך שהיא מוכיחה שהשערים אינם חותמת
 *  גומי:
 *    1. check-structure עובר על העץ כמות שהוא (בקרה חיובית).
 *    2. קובץ זר בשורש ⇒ check-structure נופל.
 *    3. תיקייה קנונית חסרה ⇒ check-structure נופל.
 *    4. בודק משותף חסר ב-tools/ ⇒ check-structure נופל.
 *    5. שגיאת תחביר ב-JS המוטבע של index.html ⇒ check-js נופל.
 *
 *  ⛔ אין כאן בקרה חיובית ל-check-js (סבב 72) — ⭐ הריצה החיצונית מוכיחה
 *  אותה ממילא, ⚠️ וריצה פנימית שנייה של הסט המלא עלתה 42 מ-80 שניות.
 *  ⛔ ולכן המוטציה רצה עם `CHECKJS_STAGES_ONLY`: היא דורשת את שלבי
 *  ה-`node --check` בלבד.
 *
 *  ⚠️ הריצות הפנימיות מקבלות R33_INNER=1, והקובץ הזה מדלג על עצמו כשהוא
 *  רץ בתוכן — אחרת check-js שבעותק היה מריץ אותו שוב, רקורסיה אינסופית.
 *  ⛔ אין להחליף את הרצת-השער-האמיתי בסימולציה (סבב 33) — בדיקה שאינה
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
const APP = { app: 'schar-limud' };
/* ── סוף APP ───────────────────────────────────────────────────────────── */

if (process.env.R33_INNER) {
  console.log('test_structure: ריצה פנימית — מדלג (מניעת רקורסיה)');
  process.exit(0);
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const ok = (msg, cond) => {
  if (cond) { passed++; console.log('✅ ' + msg); }
  else      { failed++; console.error('❌ ' + msg); }
};

/* עותק זמני של עץ העבודה — בלי .git, בלי node_modules. */
function copyRepo() {
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), APP.app + '-r33-'));
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

function runGate(dir, tool, extraEnv) {
  const r = spawnSync(process.execPath, [path.join(dir, 'tools', tool)], {
    cwd: dir,
    env: { ...process.env, R33_INNER: '1', ...extraEnv },
    encoding: 'utf8',
  });
  return r.status;
}

/* ── check-structure ───────────────────────────────────────────────────── */
{
  const dir = copyRepo();
  const CHECK_DOCS = fs.readFileSync(path.join(dir, 'tools', 'check-docs.mjs'));
  ok('בקרה חיובית: check-structure עובר על העץ כמות שהוא',
     runGate(dir, 'check-structure.mjs') === 0);

  fs.writeFileSync(path.join(dir, 'stray-file.txt'), 'זר\n');
  ok('מוטציה: קובץ זר בשורש מפיל את check-structure',
     runGate(dir, 'check-structure.mjs') !== 0);
  fs.rmSync(path.join(dir, 'stray-file.txt'));

  fs.renameSync(path.join(dir, 'signing'), path.join(dir, 'signing-x'));
  ok('מוטציה: תיקייה קנונית חסרה (וגם עודפת) מפילה את check-structure',
     runGate(dir, 'check-structure.mjs') !== 0);
  fs.renameSync(path.join(dir, 'signing-x'), path.join(dir, 'signing'));

  fs.rmSync(path.join(dir, 'tools', 'check-docs.mjs'));
  ok('מוטציה: בודק משותף חסר ב-tools/ מפיל את check-structure',
     runGate(dir, 'check-structure.mjs') !== 0);
  fs.writeFileSync(path.join(dir, 'tools', 'check-docs.mjs'), CHECK_DOCS);

  /*  ⛔ סעיף ה — תוכן ארבע התיקיות (סבב 65) — עד אז `android/`, `migrations/`,
   *  `signing/` ו-`.github/` היו **תיקיות מוכרזות שאיש לא הסתכל לתוכן**,
   *  ושם שרדו `copy-assets.sh` ו-`assets/.gitkeep` בלי קורא. */
  const stray = path.join(dir, 'android', 'app', 'src', 'main', 'zzz-stray.txt');
  fs.mkdirSync(path.dirname(stray), { recursive: true });
  fs.writeFileSync(stray, 'זר\n');
  ok('מוטציה: קובץ זר ב-android/ מפיל את check-structure (סעיף ה)',
     runGate(dir, 'check-structure.mjs') !== 0);
  fs.rmSync(stray);

  const badMig = path.join(dir, 'migrations', '99_bad_name.sql');
  fs.writeFileSync(badMig, '-- זר\n');
  ok('מוטציה: מיגרציה בלי מספור תלת-ספרתי מפילה את check-structure',
     runGate(dir, 'check-structure.mjs') !== 0);
  fs.rmSync(badMig);

  /*  ⛔ שם המבחן נגזר מהנושא (סבב 67) — `test_round52_pendflush` לא אמר
   *  למי שחיפש «מה בודק את מודול הנעילה» דבר. ⚠️ ומוטציית-הנגד היא מה
   *  שמבחין בין «אוכף תבנית» ל«פוסל כל קובץ חדש ב-tools/». */
  const badTest = path.join(dir, 'tools', 'test_round99_legacy.mjs');
  fs.writeFileSync(badTest, '// זר\n');
  ok('מוטציה: שם מבחן בתבנית הישנה (test_round<N>_) מפיל את check-structure',
     runGate(dir, 'check-structure.mjs') !== 0);
  fs.rmSync(badTest);

  const goodTest = path.join(dir, 'tools', 'test_topicname.mjs');
  fs.writeFileSync(goodTest, '// תקין\n');
  ok('⭐ מוטציית-נגד: `test_<נושא>.mjs` ⛔ אינו מפיל — נאכפת התבנית, לא הכמות',
     runGate(dir, 'check-structure.mjs') === 0);
  fs.rmSync(goodTest);

  const wf = path.join(dir, '.github', 'workflows', 'zzz.yml');
  fs.writeFileSync(wf, 'name: zzz\n');
  ok('מוטציה: workflow שאינו קנוני מפיל את check-structure',
     runGate(dir, 'check-structure.mjs') !== 0);
  fs.rmSync(wf);

  /*  ⭐ מוטציית-נגד — סעיף ה מודד **סט קבצים** ולא תוכן: חתימות הקבצים
   *  יושבות ב-`test_android`, ⛔ וכפילות שם הייתה שני מקורות אמת. */
  const man = path.join(dir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  fs.appendFileSync(man, '\n<!-- הערה -->\n');
  ok('⭐ מוטציית-נגד: שינוי תוכן ב-android/ אינו מפיל — הסט נאכף, לא התוכן',
     runGate(dir, 'check-structure.mjs') === 0);

  fs.rmSync(dir, { recursive: true, force: true });
}

/* ── check-js ──────────────────────────────────────────────────────────── */
{
  const dir = copyRepo();
  const STAGES = { CHECKJS_STAGES_ONLY: '1' };

  /* בלוק מוטבע עם שגיאת תחביר — בדיוק הסוג שמגיע למשתמש כמסך לבן.
     ⚠️ מוסף כבלוק חדש ולא בעריכת בלוק קיים: ה-</script> האחרון בקובץ
     עלול להיות סקריפט חיצוני (src=), שהשער מדלג עליו במכוון. */
  const idx = path.join(dir, 'index.html');
  const CLEAN = fs.readFileSync(idx);
  ok('בקרה חיובית: שלבי ה-node --check עוברים על העץ כמות שהוא',
     runGate(dir, 'check-js.mjs', STAGES) === 0);

  fs.appendFileSync(idx, '\n<script>function {</script>\n');
  ok('מוטציה: שגיאת תחביר ב-JS המוטבע מפילה את check-js',
     runGate(dir, 'check-js.mjs', STAGES) !== 0);
  fs.writeFileSync(idx, CLEAN);

  /*  ⭐ מוטציית-נגד — ⛔ בלעדיה המוטציה שמעליה אינה מבחינה בין «מפרסר
   *  את הבלוקים המוטבעים» ל«נופל על כל עריכה ב-index.html». */
  fs.appendFileSync(idx, '\n<!-- הערה שנוספה במוטציית-הנגד -->\n');
  ok('⭐ מוטציית-נגד: תוספת HTML תקינה ⛔ אינה מפילה — נאכף התחביר, לא התוכן',
     runGate(dir, 'check-js.mjs', STAGES) === 0);

  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${passed} עברו, ${failed} נכשלו`);
process.exit(failed ? 1 : 0);

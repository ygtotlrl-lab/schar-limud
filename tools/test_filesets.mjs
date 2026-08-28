/* ───────────────────────────────────────────────────────────────────────────
   ⛔ סט הקבצים — סבב 67, כלל ברזל 14
   ───────────────────────────────────────────────────────────────────────────
   ⛔ מה נאכף: כל קובץ במעקב הוא אחד משלושה — בסט המשותף לארבעת הריפו,
   בקטגוריה פטורה **מוכרזת**, או ברשימת-ההיתר של האפליקציה הזו עם נימוק.
   ⛔ ולמה זה יכול להישבר: `check-structure` אוכף את המבנה **בתוך** ריפו
   אחד, ⚠️ ולכן קובץ שנעלם משלושה ונשאר באחד עובר בו במלואו — «קיים רק
   כאן, בשקט», שהוא בדיוק מה שכלל ברזל 14 אוסר.
   ⚠️ הסט המשותף מוכרז ⛔ ואינו נגזר — הגזירה דורשת לראות את ארבעת
   הריפו, והשער רץ בתוך אחד. ⛔ הרשימה זהה בית-לבית בארבעת העותקים.
   ──────────────────────────────────────────────────────────────────────── */

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /*  ⛔ קובץ שקיים כאן בלבד — כל שורה נושאת את הסיבה (כלל ברזל 24). */
  only: {
    'design/icon-master.png': 'קובץ המאסטר הגרפי — הפורמט נבדל פר-אפליקציה (png כאן, svg ביומן ובגיוס)',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

/*  ⛔ הסט המשותף — זהה בית-לבית בארבעת העותקים (סבב 67). ⚠️ קובץ שיורד
 *  מכאן יורד בארבעתם באותו סבב, בדיוק כמו חתימת בלוק SHARED. */
const SHARED = [
  '.github/workflows/build-apk.yml',
  '.github/workflows/cleanup-merged-branches.yml',
  '.nojekyll',
  'CLAUDE.md',
  'CONTEXT.md',
  'README.md',
  'android/README.md',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/app/src/main/res/drawable/ic_launcher_background.xml',
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png',
  'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
  'android/build.gradle',
  'android/gradle.properties',
  'android/settings.gradle',
  'icons/apple-touch-icon.png',
  'icons/favicon-16.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'index.html',
  'manifest.json',
  'signing/sign-apk.sh',
  'sw.js',
  'tools/_capability-notes.md',
  'tools/_prune-lessons.md',
  'tools/check-capabilities.mjs',
  'tools/check-comments.mjs',
  'tools/check-docs.mjs',
  'tools/check-gaps.mjs',
  'tools/check-js.mjs',
  'tools/check-status-area.mjs',
  'tools/check-structure.mjs',
  'tools/test_android.mjs',
  'tools/test_backup_policy.mjs',
  'tools/test_budget.mjs',
  'tools/test_build.mjs',
  'tools/test_bump.mjs',
  'tools/test_cron.mjs',
  'tools/test_devid.mjs',
  'tools/test_docrules.mjs',
  'tools/test_gaps.mjs',
  'tools/test_gradle.mjs',
  'tools/test_hotwin.mjs',
  'tools/test_iconlayer.mjs',
  'tools/test_icons.mjs',
  'tools/test_idarg.mjs',
  'tools/test_ids.mjs',
  'tools/test_inputlayer.mjs',
  'tools/test_lists.mjs',
  'tools/test_lock.mjs',
  'tools/test_manifest.mjs',
  'tools/test_matrix.mjs',
  'tools/test_md.mjs',
  'tools/test_merge_core.mjs',
  'tools/test_merge_pending.mjs',
  'tools/test_passwords.mjs',
  'tools/test_pendflush.mjs',
  'tools/test_pull.mjs',
  'tools/test_retry.mjs',
  'tools/test_session.mjs',
  'tools/test_shell.mjs',
  'tools/test_signscript.mjs',
  'tools/test_sources.mjs',
  'tools/test_stage_a.mjs',
  'tools/test_structure.mjs',
  'tools/test_sw.mjs',
  'tools/test_swcore.mjs',
  'tools/test_workflows.mjs',
];

/*  ⛔ קטגוריות פטורות — ⚠️ כל אחת עם הנימוק שלה, ⛔ ולא דפוס שקט.
 *  ⛔ פטור בלי נימוק הוא בדיוק «קיים רק כאן, בשקט» בכיוון אחר. */
const EXEMPT = [
  [/^migrations\//,
   'היסטוריית המסד — כל פרויקט Supabase והמיגרציות שרצו בו; ⛔ מיגרציה שרצה אינה נערכת ואינה מועתקת'],
  [/^android\/app\/src\/main\/java\/com\//,
   'נתיב החבילה נגזר מ-applicationId, ⛔ ששינויו יוצר אפליקציה נפרדת'],
  [/^signing\/[a-z]+\.keystore$/,
   'המפתח הקבוע — ⛔ ייחודי לכל אפליקציה, ולעולם לא מוחלף'],
  [/^tools\/test_/,
   'מבחן — יכולת שקיימת כאן מקבלת שער כאן; האחידות נאכפת במטריצה ולא בסט הקבצים'],
];

let pass = 0, failed = 0;
const ok  = (m) => { pass++;   console.log('  ok   ' + m); };
const bad = (m) => { failed++; console.log('  FAIL ' + m); };

export function audit(root) {
  /*  ⛔ נפילה-חזרה לסריקת דיסק כשאין git (סבב 67) — הרתמות מריצות את
   *  השער על עותק בתיקייה זמנית שאין בו `.git`, ⚠️ ושער שהיה מוותר שם
   *  היה עובר בשקט בדיוק במקום שבו מודדים אותו. */
  let files;
  try {
    files = execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch (e) {
    files = [];
    const walk = (d, rel) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === '.git' || e.name === 'node_modules') continue;
        const abs = path.join(d, e.name), r2 = rel ? rel + '/' + e.name : e.name;
        if (e.isDirectory()) walk(abs, r2); else files.push(r2);
      }
    };
    walk(root, '');
  }
  /*  ⛔ הצלבה מול הדיסק ולא מול האינדקס בלבד (סבב 67) — `git ls-files`
   *  קורא את האינדקס, ⚠️ ולכן קובץ שנמחק מהעץ עדיין מופיע בו; בלי
   *  ההצלבה השער היה עיוור בדיוק למקרה שהוא בא לתפוס. */
  files = files.filter((f) => fs.existsSync(path.join(root, f)));
  const shared = new Set(SHARED);
  const v = [];
  for (const f of files) {
    if (shared.has(f)) continue;
    if (EXEMPT.some(([re]) => re.test(f))) continue;
    if (f in APP.only) continue;
    v.push('[extra] ' + f + ' — קיים כאן ואינו בסט המשותף, בקטגוריה פטורה או ברשימת-ההיתר');
  }
  const have = new Set(files);
  for (const f of SHARED) if (!have.has(f)) v.push('[missing] ' + f + ' — בסט המשותף ואינו קיים כאן');
  /*  ⛔ ורשימת-היתר שהתיישנה מפילה גם היא — אחרת הרשימה הופכת בעצמה
   *  לשריד, בדיוק סוג הדבר שכלל ברזל 14 בא לסלק. */
  for (const f of Object.keys(APP.only)) if (!have.has(f)) v.push('[stale] ' + f + ' — ברשימת-ההיתר ואינו קיים');
  return v;
}

const SELF = process.argv[1] &&
  path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (SELF) {

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
console.log('\n— סבב 67 · סט הקבצים (' + APP.app + ') —');
const base = audit(ROOT);
base.length === 0
  ? ok('1 · כל קובץ במעקב הוא משותף, פטור מוכרז, או חריגה מנומקת')
  : base.forEach((x) => bad('1 · ' + x));
ok('2 · הסט המשותף מונה ' + SHARED.length + ' קבצים, ורשימת-ההיתר כאן ' +
   Object.keys(APP.only).length);

console.log('\n— מוטציות —');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fset-'));
const clone = (name) => {
  const d = path.join(tmp, name);
  fs.cpSync(ROOT, d, { recursive: true });
  return d;
};
/*  ⛔ המוטציה נכתבת לעותק ולא לעץ (הלקח של סבב 42ג). ⚠️ `git ls-files`
 *  בעותק קורא את ה-`.git` שהועתק איתו, ולכן קובץ חדש אינו נספר —
 *  ⛔ ולכן המוטציה **מוחקת** קובץ משותף במקום להוסיף זר. */
{
  const d = clone('m1');
  fs.rmSync(path.join(d, 'CONTEXT.md'));
  audit(d).some((x) => x.startsWith('[missing]'))
    ? ok('מ1 · קובץ מהסט המשותף שנעלם מפיל את טענה 1')
    : bad('מ1 · היעלמות קובץ משותף לא נתפסה');
}
{
  const d = clone('m2');
  const f = Object.keys(APP.only)[0];
  fs.rmSync(path.join(d, f), { force: true, recursive: true });
  audit(d).some((x) => x.startsWith('[stale]'))
    ? ok('מ2 · רשימת-היתר שהתיישנה מפילה — חריגה רשומה שאינה קיימת')
    : bad('מ2 · רשימת-היתר מיושנת לא נתפסה');
}
{
  /*  ⭐ מוטציית-נגד — ⛔ בלעדיה הטענות שלמעלה אינן מבחינות בין «מודד
   *  את הסט» ל«נופל על כל שינוי בעץ». */
  const d = clone('n1');
  fs.appendFileSync(path.join(d, 'CONTEXT.md'), '\n');
  audit(d).length === 0
    ? ok('נ1 · ⭐ מוטציית-נגד: שינוי **תוכן** של קובץ משותף ⛔ אינו מפיל')
    : bad('נ1 · שינוי תוכן נספר בטעות כשינוי בסט');
}
fs.rmSync(tmp, { recursive: true, force: true });

console.log('\n' + (failed === 0 ? '✅' : '❌') +
  ` סבב 67 (סט הקבצים) — ${pass} טענות עברו, ${failed} נכשלו`);
if (failed) process.exit(1);

}

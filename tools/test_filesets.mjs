/* ───────────────────────────────────────────────────────────────────────────
   test_filesets.mjs — סט הקבצים המשותף
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** כל קובץ במעקב הוא אחד משלושה — בסט המשותף לכל הריפו,
   בקטגוריה פטורה **מוכרזת**, או ברשימת-ההיתר של האפליקציה הזו עם נימוק
   כתוב; ⛔ ואין שער מעבר — ⚠️ הצהרת שער שנושאת סימן מעבר מפילה.

   **הנימוק המדוד:** בודק המבנה אוכף את המבנה **בתוך** ריפו אחד, ⚠️ ולכן
   קובץ שנעלם משלושה ונשאר באחד עובר בו במלואו — ⛔ «קיים רק כאן, בשקט».

   **מה יישבר בלעדיו:** ⛔ יכולת שקיימת באחת ולא בשלוש נראית תקינה בכל אחת
   מהן בנפרד, ⚠️ והפער נראה רק בהשוואה שאינה בהישג ידו של שער שרץ בריפו
   אחד.

   **מה אינו נאכף כאן:** ⛔ תוכן הקבצים — ⚠️ נמדד **הסט** בלבד, ⭐ והתוכן
   נאכף בשערי החתימות. ⚠️ והסט המשותף מוכרז ⛔ ואינו נגזר: הגזירה דורשת
   לראות את כל הריפו. ⛔ הרשימה זהה בית-לבית בכל העותקים.
   ──────────────────────────────────────────────────────────────────────── */


/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /*  ⛔ קובץ שקיים כאן בלבד — ⚠️ כל שורה נושאת את הסיבה: ⭐ בלעדיה היא נקראת כטעות. */
  /*  ⛔ המרשם הפר-אפליקציתי — ⚠️ **מה נכנס**: שם השער ⟵ היכולת
   *  שמצדיקה אותו; ⚠️ **ומה מפיל**: נימוק שהוא נוכחות בלבד, הצהרה
   *  שאין לה קובץ, וסימן מעבר בהצהרה. ⭐ **ולמה המבנה קיים**: שער
   *  שאינו בסט המשותף נראה משותף ⛔ ואינו — ⚠️ והצהרה היא מה שמבדיל. */
  appGates: {
      'roles': 'מודד את מודל ההרשאות ואת היעדר ההשוואה מול שם התפקיד כסיסמה — ⛔ וביומן אין כניסה ואין תפקיד שיוכרע',
      'offline_login': 'מודד את הכניסה האופליין מול הטביעה ואת ארבע התשובות שלה — ⛔ וביומן אין כניסה ואין משתמש שיאומת',
      'users_patch': 'מודד שעדכון חלקי למראת המשתמשים אינו מכניס את הסוד — ⛔ וביומן אין טבלת משתמשים ואין כניסה',
  },
  only: {
    'tools/roles-harness.mjs': 'רתמת מודל ההרשאות — ⛔ קיימת בשלוש שיש בהן כניסה, ⚠️ וביומן אין כניסה ואין תפקיד שיוכרע; ⭐ והזהות בין השלוש נמדדת ב-`APP.subsetTools`',
    'design/icon-master.png': 'קובץ המאסטר הגרפי — הפורמט נבדל פר-אפליקציה (png כאן, svg ביומן ובגיוס)',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [17, 20, 23, 24, 25, 136, 205];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { builtinModules } from 'node:module';
import { reasonGaps } from './scope.mjs';
import { PEERS } from './peers.mjs';

/*  ⛔ הסט המשותף — זהה בית-לבית בכל העותקים (סבב 67). ⚠️ קובץ שיורד
 *  מכאן יורד מכולם באותו סבב, בדיוק כמו חתימת בלוק SHARED. */
const SHARED = [
  '.github/workflows/build-apk.yml',
  '.github/workflows/cleanup-merged-branches.yml',
  '.gitignore',
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
  'app.css',
  'core/sync.js',
  'core/util.js',
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
  'tools/check-js.mjs',
  'tools/check-structure.mjs',
  'tools/gen-icons.mjs',
  'tools/appsrc.mjs',
  'tools/db-schema.mjs',
  'tools/peers.mjs',
  'tools/scope.mjs',
  'tools/whiten.mjs',
  'tools/test_anchors.mjs',
  'tools/test_android.mjs',
  'tools/test_backup_policy.mjs',
  'tools/test_budget.mjs',
  'tools/test_build.mjs',
  'tools/test_bump.mjs',
  'tools/test_caps_build.mjs',
  'tools/test_caps_guard.mjs',
  'tools/test_caps_ui.mjs',
  'tools/test_codescan.mjs',
  'tools/test_cron.mjs',
  'tools/test_declscan.mjs',
  'tools/test_devid.mjs',
  'tools/test_docfacts.mjs',
  'tools/test_signeddead.mjs',
  'tools/test_crossgate.mjs',
  'tools/test_failsurface.mjs',
  'tools/test_filesets.mjs',
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
  'tools/test_merge_pending.mjs',
  'tools/test_parentchild.mjs',
  'tools/test_passwords.mjs',
  'tools/test_period.mjs',
  'tools/test_pendflush.mjs',
  'tools/test_pull.mjs',
  'tools/test_push.mjs',
  'tools/test_orphans.mjs',
  'tools/test_removals.mjs',
  'tools/test_readonly.mjs',
  'tools/test_rowscan.mjs',
  'tools/test_schema_source.mjs',
  'tools/test_secrets.mjs',
  'tools/test_rulesdocs.mjs',
  'tools/test_dbfacts.mjs',
  'tools/test_dbscan.mjs',
  'tools/test_scanscan.mjs',
  'tools/test_session.mjs',
  'tools/test_sharedsync.mjs',
  'tools/test_signedshared.mjs',
  'tools/test_coremod.mjs',
  'tools/test_sistername.mjs',
  'tools/test_mignames.mjs',
  'tools/test_names.mjs',
  'tools/test_shell.mjs',
  'tools/test_sources.mjs',
  'tools/test_stage_a.mjs',
  'tools/test_swcore.mjs',
  'tools/test_textscan.mjs',
  'tools/test_toolsid.mjs',
  'tools/test_visual.mjs',
  'tools/test_wiring.mjs',
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
];

let pass = 0, failed = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 9, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות (סבב 119) — ⚠️ `null` הוא תהליך
 *  שלא הגיע לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה
 *  שמבדיל ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו.
 *  ⛔ **ושומר הרקורסיה הוא ריצת-משנה אף הוא** — ⚠️ הסט רץ שם על **עותק
 *  סינתטי** שאין לצידו אחיות ואין בו `.git`, ⭐ ולכן שער שמשווה מול אחות
 *  או קורא את סט המעקב מגיע לחלק מטענותיו **בכוונה**: ⛔ והריצפה נמדדת
 *  על עץ אמיתי ⛔ ולא שם. */
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.R33_INNER;
/*  ⛔ הריצפה נמדדת בשני הכיוונים (סבב 118) — ⚠️ **מה נכנס**: מספר הטענות
 *  שרצו עד שלב המוטציות; ⛔ **ומה מפיל**: פחות מהמוצהר — ריצה חלקית —
 *  ⛔ ויותר ממנו — ריצפה מיושנת. ⭐ **ולמה שני הכיוונים**: ריצפה שאינה
 *  מתעדכנת מפסיקה למדוד את מה שנוסף. ⛔ **וההשהיה על שלב המוטציות בלבד
 *  (סבב 119)** — ⚠️ `mutStage` לוכדת את המונה בכניסה אליו, ⭐ ומה שהוא
 *  מוסיף אינו נספר בתקרה: ⛔ השהיה על הרמה המלאה כולה השאירה תשעה שערים
 *  בלי מדידה באף כיוון. ⚠️ ושער שמספרו משתנה גם בלי המוטציות מוכרז
 *  ב-`APP.floorRange` ומקבל את הטווח ב-`GATE_FLOOR_RANGE`. */
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  /*  ⚠️ שער שיובא לתהליך של שער אחר אינו סוגר — ⛔ הספירה שלו לא רצה.
   *  ⛔ וגם ריצת-משנה מוצהרת אינה סוגרת — ⚠️ שער שמריץ את עצמו בעץ
   *  סינתטי מגיע לחלק מטענותיו בכוונה, ⭐ והרצפה נמדדת על עץ אמיתי. */
  if (!process.argv[1] || !process.argv[1].endsWith(GATE_ID)) return;
  if (SUBRUN) return;
  /*  ⛔ אפס שנמדד בכניסה לשלב המוטציות הוא דילוג מוצהר (סבב 119) —
   *  ⚠️ שער שכל גופו מוטציות אינו רץ ברמה המהירה, ⭐ ואפס כזה אינו
   *  ריצה חלקית: ⛔ ו-`null` — תהליך שלא הגיע לשם — כן. */
  if (PRE_MUT === 0 && process.env.GATE_MUT !== '1') {
    console.log(`⏭ ${GATE_ID}: כל גופו רץ ברמה המלאה — לא נמדד כאן`);
    return;
  }
  const N = PRE_MUT || RAN;
  console.log(`רצו ${N} מתוך ${EXPECTED}`);
  if (N < EXPECTED) {
    console.error(`❌ ${GATE_ID}: רצו ${N} טענות מתוך ${EXPECTED} מוצהרות — ` +
      'מה עושים: ודא `await` בקריאה הראשית, ⛔ ויציאה שאינה קודמת להמתנה.');
    process.exitCode = 1;
  } else if (N > FLOOR_MAX) {
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — ` +
      'עדכן את `FLOOR`.');
    process.exitCode = 1;
  }
});
const ok  = (m) => { RAN++; pass++;   console.log('  ok   ' + m); };
const bad = (m) => { RAN++; failed++; console.log('  FAIL ' + m); };

/*  ⛔ תוצר שהוצהר כחד-פעמי נושא את סבבו — ⚠️ **מה נכנס**: הכרזה
 *  ברשימת-ההיתר או ב-`appGates` שמכריזה על התוצר כזמני;
 *  ⛔ **ומה מפיל**: הכרזה כזו בלי מספר סבב. ⭐ **ולמה המבנה
 *  קיים**: מסמך עבודה שנכתב לסבב אחד ונשאר הופך למקור אמת
 *  שני, ⚠️ ואין מה שיאמר מתי הוא נצרך ומתי הוא יורד. */
const ONEOFF_RE = /חד-פעמי|חד-פעמית|חד פעמי|מסמך עבודה|זמני לסבב/;
const ROUND_RE = /סבב\s+\d+/;
export function oneoffGaps(decls) {
  return Object.entries(decls)
    .filter(([, why]) => ONEOFF_RE.test(String(why)) && !ROUND_RE.test(String(why)))
    .map(([k]) => k);
}

/*  ⛔ תוצר חד-פעמי יורד בסבב שאחרי זה שצרך אותו — ⚠️ **מה נכנס**: הכרזה
 *  שנוקבת בסבבה; ⛔ **ומה מפיל**: סבב שקדם לסבב הנוכחי. ⭐ **ולמה המבנה
 *  קיים**: «נושא את סבבו» נמדד על **צורת ההכרזה** ⛔ ולא על גילה, ⚠️ וכלי
 *  שהוכרז חד-פעמי בסבב 92 עבר את המדידה 56 סבבים ברציפות. */
export function oneoffStale(decls, cur) {
  if (!cur) return [];
  return Object.entries(decls)
    .filter(([, why]) => ONEOFF_RE.test(String(why)))
    .filter(([, why]) => {
      const m = /סבב\s+(\d+)/.exec(String(why));
      return m && Number(m[1]) < cur;
    })
    .map(([k]) => k);
}

/*  ⛔ הסבב הנוכחי נגזר מכותרת הטבלה ⛔ ואינו מוקלד — ⚠️ מספר שהוקלד
 *  בשער מתיישן בסבב הבא, ⭐ והכותרת היא המקום שבו הוא כבר נכתב. */
export function currentRound(root) {
  try {
    const h = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
    const m = /עודכן לאחרונה:\s*סבב\s+(\d+)/.exec(h);
    return m ? Number(m[1]) : 0;
  } catch { return 0; }
}

/*  ⛔ נפילה-חזרה לסריקת דיסק כשאין git (סבב 67) — הרתמות מריצות את
 *  השער על עותק בתיקייה זמנית שאין בו `.git`, ⚠️ ושער שהיה מוותר שם
 *  היה עובר בשקט בדיוק במקום שבו מודדים אותו. */
export function trackedFiles(root) {
  let files;
  try {
    files = execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch (e) {
    files = [];
    const walk = (d, rel) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === '.git') continue;
        const abs = path.join(d, e.name), r2 = rel ? rel + '/' + e.name : e.name;
        if (e.isDirectory()) walk(abs, r2); else files.push(r2);
      }
    };
    walk(root, '');
  }
  return files;
}

/*  ⛔ הריפו רץ מקלון טרי בלי התקנה (סבב 148) — ⚠️ **מה נכנס**: שורש הריפו
 *  ורשימת הקבצים שבמעקב; ⛔ **ומה מפיל**: `package.json` · תיקיית
 *  `node_modules` · ו-`import` שאינו מודול Node מובנה ואינו נתיב מקומי.
 *  ⭐ **ולמה המבנה קיים**: תלות חיצונית נשברת בלי שאיש שינה קוד, ⛔ ושער
 *  שמעתיק עץ מאבד אותה בשקט — ⚠️ והעותק שהוא מודד בו אינו העץ שרץ. */
const BUILTIN = new Set(builtinModules);
export function depGaps(root, files) {
  const out = [];
  for (const name of ['package.json', 'package-lock.json', 'node_modules'])
    if (fs.existsSync(path.join(root, name))) out.push('[dep-root] ' + name);
  for (const f of files) {
    if (/(^|\/)package(-lock)?\.json$/.test(f)) out.push('[dep-manifest] ' + f);
    if (/(^|\/)node_modules(\/|$)/.test(f)) out.push('[dep-tree] ' + f);
    if (!f.endsWith('.mjs') && !f.endsWith('.js')) continue;
    let src = '';
    try { src = fs.readFileSync(path.join(root, f), 'utf8'); } catch (e) { continue; }
    for (const m of src.matchAll(/(?:^|\n)\s*import\s[^;\n]*?from\s+['"]([^'"]+)['"]/g)) {
      const spec = m[1];
      /*  ⛔ רשימת המובנים נגזרת מ-Node ⛔ ואינה מוקלדת — ⚠️ `node:fs` ו-`fs`
          הם אותו מודול, ⭐ ורשימה שתוקלד כאן מתיישנת בגרסה הבאה. */
      if (spec.startsWith('node:') || BUILTIN.has(spec) ||
          spec.startsWith('./') || spec.startsWith('../')) continue;
      out.push('[dep-import] ' + f + ' ⟵ ' + spec);
    }
  }
  return out;
}

/*  ⛔ שער שאינו נוקב בשורה חייב לכסות יכולת שיותר מאפליקציה אחת נושאת —
 *  ⚠️ **מה נכנס**: שם השער שב-`appGates` ⟵ השורות שהוא מצהיר ⟵ האחיות
 *  שהקובץ חי בהן; ⛔ **ומה מפיל**: שער בלי שורה שקיים כאן בלבד.
 *  ⭐ **ולמה המבנה קיים**: סחף הוא **בין** אפליקציות, ⚠️ ולוגיקה שחיה
 *  באחת אין ממה לסטות — ⛔ ומבחן הקבלה בדפדפן הוא שתופס אותה. */
/*  ⛔ שער אינו מריץ דפדפן — ⚠️ **מה נכנס**: כל קובץ ב-`tools/` שנוקב
 *  במנוע דפדפן או בנהג שלו; ⛔ **ומה מפיל**: כל אתר כזה. ⭐ **ולמה המבנה
 *  קיים**: התנהגות שנמדדת בשער היא מקרה בודד שהפך לקבוע — ⚠️ הוא נשבר
 *  בכל שינוי לוגיקה לגיטימי, ⛔ ומי שמשנה לוגיקה מתקן את השער כדי שיעבור:
 *  ⭐ והשער מפסיק למדוד ומתחיל לתעד. ⚠️ **והמדידה על המקור הגולמי** —
 *  ⛔ נתיב הבינארי חי כליטרל מחרוזת. */
const DRIVERS = ['chromium', 'puppeteer', 'playwright', 'webdriver', 'chrome-linux'];
/*  ⛔ הקובץ שמכריז את המרשם אינו אתר — ⚠️ המרשם עצמו הוא מקור השמות,
 *  ⭐ ומוטציית הבדיקה נוקבת בנתיב בינארי בכוונה: ⛔ והוא מוחרג בשמו,
 *  ⚠️ כדרך שהמרשם `PEERS` מוחרג משער שם-האחות. */
const DRIVER_SELF = 'test_filesets.mjs';
export function browserGates(root) {
  const out = [], dir = path.join(root, 'tools');
  const re = new RegExp('(' + DRIVERS.join('|') + ')', 'i');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.mjs') && x !== DRIVER_SELF).sort()) {
    const m = re.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (m) out.push(f + ' ⟵ ' + m[1]);
  }
  return out;
}

export function productGates(root, peers, self) {
  const out = [], away = [];
  for (const k of Object.keys(APP.appGates)) {
    const rel = 'tools/test_' + k + '.mjs';
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    const m = /export const ROWS\s*=\s*\[([\s\S]*?)\]/.exec(fs.readFileSync(p, 'utf8'));
    const rows = m ? (m[1].replace(/\/\*[\s\S]*?\*\//g, '').match(/\d+/g) || []) : [];
    if (rows.length) continue;
    let seen = 0, looked = 0;
    for (const q of peers) {
      if (q === self) continue;
      const d = path.join(root, '..', q);
      if (!fs.existsSync(d)) { if (!away.includes(q)) away.push(q); continue; }
      looked++;
      if (fs.existsSync(path.join(d, rel))) seen++;
    }
    /*  ⛔ «לא נמצא» אינו «אינו קיים» — ⚠️ אחות שאינה על הדיסק אינה תשובה,
     *  ⭐ והיא מדווחת בשמה ב-`away`: ⛔ וכשאף אחות לא נקראה אין מה להכריע,
     *  ⚠️ **ושער היה מוכרז «מוצר» מפני שלא היה מול מה להשוות**. */
    if (looked && !seen) out.push(k);
  }
  return { out, away };
}

export function audit(root) {
  let files = trackedFiles(root);
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
    /*  ⛔ שער שאינו בסט המשותף חייב שורה מוצהרת (סבב 68) — ⚠️ הפטור
     *  הגורף הקודם על `tools/test_` הפך «קיים רק כאן» למצב שקט. */
    if (/^tools\/test_(.+)\.mjs$/.test(f) &&
        (f.match(/^tools\/test_(.+)\.mjs$/)[1] in APP.appGates)) continue;
    v.push('[extra] ' + f + ' — קיים כאן ואינו בסט המשותף, בקטגוריה פטורה או ברשימת-ההיתר');
  }
  const have = new Set(files);
  for (const f of SHARED) if (!have.has(f)) v.push('[missing] ' + f + ' — בסט המשותף ואינו קיים כאן');
  /*  ⛔ ורשימת-היתר שהתיישנה מפילה גם היא — אחרת הרשימה הופכת בעצמה
   *  לשריד, בדיוק סוג הדבר שהשער הזה בא לסלק. */
  for (const f of Object.keys(APP.only)) if (!have.has(f)) v.push('[stale] ' + f + ' — ברשימת-ההיתר ואינו קיים');
  /*  ⛔ הצהרת שער שאין לה קובץ — ⚠️ שער שירד וההצהרה שלו נשארה היא
   *  בעצמה השארית שהשער בא לסלק: ⭐ ושני הצדדים מפילים. */
  for (const k of Object.keys(APP.appGates))
    if (!have.has('tools/test_' + k + '.mjs'))
      v.push('[stale-gate] tools/test_' + k + '.mjs — מוכרז ב-`appGates` ואינו קיים');
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
/*  ⛔ הנימוק תפקידי ⛔ ואינו נוכחות — ⚠️ «קיים כאן בלבד» הוא **המדידה**
 *  שכבר נעשתה, ⭐ ואינו אומר איזו יכולת מצדיקה את השער: ⛔ והצהרה כזו
 *  עוברת בשקט ומשאירה שער פרטי בלי סיבה. */
{
  const g = reasonGaps(APP.appGates);
  g.length === 0
    ? ok('3 · [gate-reason] ' + Object.keys(APP.appGates).length +
         ' שערים מוצהרים ב-`appGates`, וכל נימוק נושא את היכולת שמצדיקה אותו')
    : bad('3 · [gate-reason] נימוק שאינו תפקידי — נמדדו ' + g.length + ' מתוך ' +
          Object.keys(APP.appGates).length + ' והצפוי אפס (' + g.join(' · ') + '). ' +
          'כותבים «מה השער מודד — ולמה היכולת אינה קיימת בשאר»');
}

{
  const decls = { ...APP.only, ...APP.appGates };
  const g4 = oneoffGaps(decls);
  g4.length === 0
    ? ok('4 · [oneoff-round] כל הכרזת תוצר חד-פעמי נושאת את סבבה — נמדדו ' +
         Object.keys(decls).length + ' הכרזות ואפס בלי סבב נקוב')
    : bad('4 · [oneoff-round] הכרזת תוצר חד-פעמי בלי סבב — נמדדו ' + g4.length +
          ' מתוך ' + Object.keys(decls).length + ' והצפוי אפס (' + g4.join(' · ') +
          '). נוקבים בסבב שבו נכתב, ⛔ שהוא מה שאומר מתי הוא יורד');
}

{
  const decls = { ...APP.only, ...APP.appGates };
  const cur = currentRound(ROOT);
  const g5 = oneoffStale(decls, cur);
  g5.length === 0
    ? ok('5 · [oneoff-stale] כל הכרזת תוצר חד-פעמי נוקבת בסבב הנוכחי — נמדד ' +
         'סבב ' + cur + ' ואפס הכרזות שקדמו לו')
    : bad('5 · [oneoff-stale] תוצר חד-פעמי ששרד את סבבו — נמדדו ' + g5.length +
          ' מתוך ' + Object.keys(decls).length + ' והצפוי אפס (' + g5.join(' · ') +
          '). מורידים את התוצר, ⛔ שהוא מה ש«חד-פעמי» הבטיח');
}

{
  const g6 = depGaps(ROOT, trackedFiles(ROOT));
  g6.length === 0
    ? ok('6 · [no-deps] אפס תלות חיצונית — נמדדו ' + trackedFiles(ROOT).length +
         ' קבצים במעקב, ואפס `package.json`, אפס `node_modules` ואפס `import` שאינו מודול מובנה')
    : bad('6 · [no-deps] תלות חיצונית — נמדדו ' + g6.length + ' אתרים והצפוי אפס (' +
          g6.join(' · ') + '). כותבים את היכולת בפנים, ⛔ שקלון טרי רץ בלי התקנה');
}

/*  ⛔ שער יושב על שורה תשתיתית — ⚠️ ומה שאינו נוקב בשורה מכסה יכולת
 *  שיותר מאפליקציה אחת נושאת: ⭐ ולוגיקת מוצר אינה נאכפת בשער. */
{
  const r = productGates(ROOT, PEERS, APP.app);
  r.out.length === 0
    ? ok('5 · [gate-product] כל שער שאינו נוקב בשורה מכסה יכולת שיותר מאפליקציה אחת נושאת — נמדדו ' +
         Object.keys(APP.appGates).length + ' מוצהרים ואפס שערי מוצר' +
         (r.away.length ? ' · ואחיות שאינן על הדיסק: ' + r.away.join(' · ') : ''))
    : bad('5 · [gate-product] שער מוצר — נמדדו ' + r.out.length + ' מתוך ' +
          Object.keys(APP.appGates).length + ' והצפוי אפס (' + r.out.join(' · ') +
          '). מוחקים את השער, ⛔ והמדידה עוברת למבחן הקבלה בדפדפן; ⚠️ או נוקבים בשורה התשתיתית שהוא אוכף');
}

/*  ⛔ אין שער מעבר — ⚠️ שער שנכתב כדי לאמת ששינוי קרה נשאר לנצח:
 *  ⭐ האימות הוא דיווח הסבב, ⛔ והוא נאמר פעם אחת. */
{
  const g6 = Object.entries(APP.appGates).filter(([k, v]) => (k + ' ' + v).includes('⏳')).map(([k]) => k);
  g6.length === 0
    ? ok('6 · [oneoff-gate] אפס הצהרת שער שנושאת סימן מעבר — נמדדו ' +
         Object.keys(APP.appGates).length + ' מוצהרים')
    : bad('6 · [oneoff-gate] הצהרת שער מעבר — נמדדו ' + g6.length + ' והצפוי אפס (' +
          g6.join(' · ') + '). מסיימים את המעבר בסבב אחד ומוחקים את השער, ⛔ ולא מסמנים אותו');
}

console.log('\n— מוטציות —');
/*  ⛔ כותב על עותק — ⚠️ המוטציה משנה את סט הקבצים של הריפו, ⛔ ואין סט שאפשר למסור בזיכרון. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fset-'));
const clone = (name) => {
  const d = path.join(tmp, name);
  fs.cpSync(ROOT, d, { recursive: true });
  return d;
};
/*  ⛔ מכאן ולמטה מוטציות ובדיקות שלמות (סבב 92) — ⚠️ הן רצות ברמה
 *  המלאה בלבד: ⛔ הרמה המהירה עוצרת כאן עם קוד היציאה של הטענות
 *  שכבר רצו, ⭐ והכיסוי שלהן אינו יורד. */
/*  ⛔ ולוגיקת מוצר אינה נאכפת בשער — ⚠️ ושער אינו מריץ דפדפן:
 *  ⭐ ההתנהגות נמדדת במבחן הקבלה, ⛔ שרץ פעם אחת ואינו בסט. */
{
  const g7 = browserGates(ROOT);
  g7.length === 0
    ? ok('7 · [gate-browser] אפס שער שמריץ דפדפן — נמדדו ' +
         (fs.readdirSync(path.join(ROOT, 'tools')).filter((x) => x.endsWith('.mjs') && x !== DRIVER_SELF)).length +
         ' קובצי `tools/` ואפס נהג דפדפן')
    : bad('7 · [gate-browser] שער שמריץ דפדפן — נמדדו ' + g7.length + ' אתרים והצפוי אפס (' +
          g7.join(' · ') + '). מעבירים את המדידה למבחן הקבלה, ⛔ שאינו בסט');
}

mutStage();
if (!RUN_MUT) {
  console.log('\n⏭ test_filesets: המוטציות רצות ברמה המלאה (--full) — ⛔ ואינן נמדדות כאן');
  process.exit(failed ? 1 : 0);
}
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

/*  ⛔ חמש המוטציות שלמטה מוטטות **הכרזה קיימת** ב-`appGates` — ⚠️ וריפו
 *  שאין בו שער פרטי אין לו מה למוטט: ⭐ והן נושאות שורת נימוק ⛔ ואינן
 *  מדולגות בשתיקה — ⚠️ **ובלי השורה הן רצות על `undefined`**, ⛔ ושתיים
 *  מהן נופלות על כלום ושלוש עוברות על כלום. */
const GKEY = Object.keys(APP.appGates)[0] || null;
const noGate = (id, what) =>
  ok(id + ' · ⛔ אין כאן שער פרטי — ⚠️ ' + what + ', ⛔ ואין הכרזה למוטט');

/*  ⛔ מ3 — שער שקיים כאן בלבד ואינו מוצהר ב-`appGates` (סבב 68).
 *  ⚠️ הפטור הגורף הקודם על `tools/test_` הפך «קיים רק כאן» למצב שקט,
 *  ⛔ וזה בדיוק מה שאסור. */
if (!GKEY) noGate('מ3', 'ההכרזה שנמדדת כאן היא של שער פרטי');
else {
  /*  ⚠️ המוטציה היא **לוגית** ולא על העץ (סבב 68) — `git ls-files` בעותק
   *  קורא את ה-`.git` שהועתק איתו, ⛔ ולכן קובץ חדש אינו נספר שם כלל.
   *  ⭐ הסרת ההכרזה שקולה בדיוק להוספת שער לא-מוצהר. */
  const key = GKEY;
  const keep = APP.appGates[key];
  delete APP.appGates[key];
  const hit = audit(ROOT).some((x) => x.startsWith('[extra]') && x.includes('test_' + key));
  APP.appGates[key] = keep;
  hit ? ok('מ3 · שער שאינו מוצהר ב-appGates מפיל את טענה 1')
      : bad('מ3 · שער לא-מוצהר לא נתפס');
}

/*  ⛔ מ4 — נימוק שהוא נוכחות בלבד (סבב 144). ⚠️ «אינו בכולן» הוא
 *  המדידה ⛔ ואינו הנימוק, ⭐ והצהרה כזו עוברת בשקט. */
{
  const key = Object.keys(APP.appGates)[0];
  const keep = APP.appGates[key];
  APP.appGates[key] = 'השער אינו בכולן';
  const hit = reasonGaps(APP.appGates).some((x) => x.startsWith(key + ':'));
  APP.appGates[key] = keep;
  hit ? ok('מ4 · [gate-reason] נימוק שנוקב בנוכחות בלבד מפיל את טענה 3')
      : bad('מ4 · נימוק שהוא נוכחות בלבד לא נתפס');
}

/*  ⛔ מ6 — הכרזת תוצר חד-פעמי בלי סבב (סבב 147). ⚠️ מסמך
 *  עבודה שנכתב לסבב אחד ונשאר הוא מקור אמת שני. */
{
  const key = Object.keys(APP.appGates)[0];
  const keep = APP.appGates[key];
  APP.appGates[key] = 'מסמך עבודה חד-פעמי להכרעת השורות';
  const hit = oneoffGaps(APP.appGates).includes(key);
  APP.appGates[key] = keep;
  hit ? ok('מ6 · [oneoff-round] הכרזת תוצר חד-פעמי בלי סבב מפילה את טענה 4')
      : bad('מ6 · הכרזה חד-פעמית בלי סבב לא נתפסה');
}

/*  ⭐ מוטציית-נגד — ⛔ הכרזה חד-פעמית שנוקבת בסבבה אינה מפילה:
 *  ⚠️ בלעדיה הטענה אינה מבחינה בין «חסר סבב» ל«המילה מופיעה». */
if (!GKEY) noGate('נ3', 'ההכרזה החד-פעמית נכתבת על שער פרטי');
else {
  const key = GKEY;
  const keep = APP.appGates[key];
  APP.appGates[key] = 'מסמך עבודה חד-פעמי שנכתב בסבב 147';
  const clean = oneoffGaps(APP.appGates).length === 0;
  APP.appGates[key] = keep;
  clean ? ok('נ3 · ⭐ מוטציית-נגד: הכרזה חד-פעמית שנוקבת בסבבה ⛔ אינה מפילה')
        : bad('נ3 · הכרזה תקינה נספרה בטעות כחסרת סבב');
}

/*  ⛔ מ7 — תוצר חד-פעמי ששרד את סבבו (סבב 148). ⚠️ «נושא את סבבו» עבר
 *  על כלי מסבב 92 ששרד 56 סבבים, ⭐ והמדידה החסרה היא הגיל. */
if (!GKEY) noGate('מ7', 'התוצר החד-פעמי נמדד על הכרזת שער פרטי');
else {
  const key = GKEY;
  const keep = APP.appGates[key];
  const cur = currentRound(ROOT);
  APP.appGates[key] = 'מסמך עבודה חד-פעמי שנכתב בסבב ' + (cur - 1);
  const hit = oneoffStale(APP.appGates, cur).includes(key);
  APP.appGates[key] = keep;
  hit ? ok('מ7 · [oneoff-stale] תוצר חד-פעמי מסבב שקדם מפיל את טענה 5')
      : bad('מ7 · תוצר חד-פעמי ששרד את סבבו לא נתפס');
}

/*  ⭐ מוטציית-נגד — ⛔ הכרזה חד-פעמית מהסבב הנוכחי ⛔ אינה מפילה:
 *  ⚠️ בלעדיה הטענה הייתה מפילה כל תוצר ביום שנכתב. */
if (!GKEY) noGate('נ4', 'ההכרזה מהסבב הנוכחי נכתבת על שער פרטי');
else {
  const key = GKEY;
  const keep = APP.appGates[key];
  const cur = currentRound(ROOT);
  APP.appGates[key] = 'מסמך עבודה חד-פעמי שנכתב בסבב ' + cur;
  const clean = oneoffStale(APP.appGates, cur).length === 0;
  APP.appGates[key] = keep;
  clean ? ok('נ4 · ⭐ מוטציית-נגד: הכרזה חד-פעמית מהסבב הנוכחי ⛔ אינה מפילה')
        : bad('נ4 · הכרזה מהסבב הנוכחי נספרה בטעות כשארית');
}

/*  ⛔ מ5 — הצהרה שאין לה שער (סבב 144). ⚠️ הצהרה שהתיישנה היא בעצמה
 *  השארית שהשער בא לסלק, ⭐ ושני הצדדים מפילים. */
{
  APP.appGates.__ghost__ = 'מודד יכולת שאינה קיימת — ולכן אין לה מקבילה בשאר';
  const hit = audit(ROOT).some((x) => x.startsWith('[stale-gate]'));
  delete APP.appGates.__ghost__;
  hit ? ok('מ5 · הצהרת שער שאין לה קובץ מפילה את טענה 1')
      : bad('מ5 · הצהרה שהתיישנה לא נתפסה');
}

/*  ⭐ מוטציית-נגד — ⛔ שער ש**כן** מוצהר ⛔ אינו מפיל, ⚠️ אחרת הטענה
 *  אינה מבחינה בין «מודדת הכרזה» ל«אוסרת כל שער פרטי». */
if (!GKEY) noGate('נ2', 'השער המוצהר שאינו מפיל הוא שער פרטי');
else {
  const name = GKEY;
  audit(ROOT).some((x) => x.includes('test_' + name))
    ? bad('נ2 · שער מוצהר נתפס בטעות')
    : ok('נ2 · ⭐ מוטציית-נגד: שער שמוצהר ב-appGates ⛔ אינו מפיל');
}
/*  ⛔ מ6 — תלות חיצונית (סבב 148). ⚠️ המוטציה **לוגית** ואינה על העץ,
 *  ⭐ שהרשימה נמסרת לפונקציה: ⛔ ושני הצדדים מפילים. */
{
  depGaps(ROOT, ['package.json']).some((x) => x.startsWith('[dep-manifest]'))
    ? ok('מ6 · `package.json` בעץ מפיל את טענה 6')
    : bad('מ6 · `package.json` לא נתפס');
  depGaps(ROOT, ['node_modules/x/index.js']).some((x) => x.startsWith('[dep-tree]'))
    ? ok('מ7 · תיקיית `node_modules` מפילה את טענה 6')
    : bad('מ7 · `node_modules` לא נתפסה');
}

/*  ⭐ מוטציית-נגד — ⛔ `import` ממודול Node מובנה וממודול מקומי ⛔ אינם
 *  מפילים, ⚠️ אחרת הטענה הייתה אוסרת כל ייבוא. */
{
  const d = clone('m6');
  fs.writeFileSync(path.join(d, 'tools', 'probe-dep.mjs'),
    "import fs2 from 'node:fs';\nimport { PEERS } from './peers.mjs';\nexport const X = [fs2, PEERS];\n");
  const clean = depGaps(d, ['tools/probe-dep.mjs']).length === 0;
  fs.writeFileSync(path.join(d, 'tools', 'probe-dep.mjs'),
    "import { resvg } from '@resvg/resvg-js';\nexport const X = resvg;\n");
  const hit = depGaps(d, ['tools/probe-dep.mjs']).some((x) => x.startsWith('[dep-import]'));
  clean && hit
    ? ok('נ5 · ⭐ מוטציית-נגד: ייבוא מובנה ומקומי ⛔ אינו מפיל, ⛔ וחבילה חיצונית כן')
    : bad('נ5 · נמדד מובנה ' + (clean ? 'נקי' : 'נתפס') + ' וחיצוני ' +
          (hit ? 'נתפס' : 'נקי') + ' — והצפוי נקי/נתפס');
}

/*  ⛔ מ8 — שער בלי שורה שחי כאן בלבד. ⚠️ סחף הוא בין אפליקציות,
 *  ⭐ ולוגיקה שחיה באחת אין ממה לסטות. */
{
  const d = clone('m8');
  fs.writeFileSync(path.join(d, 'tools', 'test_probe_prod.mjs'), 'export const ROWS = [];\n');
  /*  ⛔ האחיות נבנות לצד העותק — ⚠️ «שער מוצר» הוא שער שהאחיות **נקראו**
   *  ואין בהן מקבילה לו: ⭐ בלי האחיות המדידה אינה מכריעה, ⛔ והמוטציה
   *  הייתה עוברת על סביבה ולא על הפרה. */
  for (const q of PEERS) if (q !== APP.app) fs.mkdirSync(path.join(d, '..', q), { recursive: true });
  APP.appGates.probe_prod = 'מודד את חשבון המוצר שחי כאן בלבד — ⛔ ולשאר אין חשבון כזה';
  const hit = productGates(d, PEERS, APP.app).out.includes('probe_prod');
  delete APP.appGates.probe_prod;
  hit ? ok('מ8 · [gate-product] שער בלי שורה שחי כאן בלבד מפיל את טענה 5')
      : bad('מ8 · שער מוצר לא נתפס');
}
{
  /*  ⭐ מוטציית-נגד — ⛔ שער שנוקב בשורה תשתיתית אינו מפיל, ⚠️ גם כשהקובץ
   *  עצמו חי כאן בלבד: ⭐ השורה היא מה שמצדיק אותו. */
  const d = clone('n6');
  fs.writeFileSync(path.join(d, 'tools', 'test_probe_infra.mjs'), 'export const ROWS = [24];\n');
  APP.appGates.probe_infra = 'מודד יכולת שקיימת כאן בלבד — ⛔ ולשאר אין מסך כזה';
  const clean = !productGates(d, PEERS, APP.app).out.includes('probe_infra');
  delete APP.appGates.probe_infra;
  clean ? ok('נ6 · ⭐ מוטציית-נגד: שער שנוקב בשורה תשתיתית ⛔ אינו מפיל')
        : bad('נ6 · שער שנוקב בשורה נתפס בטעות');
}

/*  ⛔ מ10 — קובץ ב-`tools/` שמריץ דפדפן. ⚠️ הוא נראה כשער לכל דבר,
 *  ⭐ והוא מודד התנהגות שנשברת בכל שינוי לוגיקה. */
{
  const d = clone('m10');
  fs.writeFileSync(path.join(d, 'tools', 'test_probe_browser.mjs'),
    "export const ROWS = [];\nexport const CH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';\n");
  const hit = browserGates(d).some((x) => x.startsWith('test_probe_browser.mjs'));
  hit ? ok('מ10 · [gate-browser] שער שנוקב בנתיב דפדפן מפיל את טענה 7')
      : bad('מ10 · שער שמריץ דפדפן לא נתפס');
}
{
  /*  ⭐ מוטציית-נגד — ⛔ שער שמודד טקסט אינו מפיל, ⚠️ גם כשהוא סורק
   *  את המילה «מסך»: ⭐ הנמדד הוא נהג הדפדפן ⛔ ולא הנושא. */
  const d = clone('n7');
  fs.writeFileSync(path.join(d, 'tools', 'test_probe_text.mjs'),
    "export const ROWS = [];\nexport const S = 'המסך הראשון נושא תוכן';\n");
  const clean = !browserGates(d).some((x) => x.startsWith('test_probe_text.mjs'));
  clean ? ok('נ7 · ⭐ מוטציית-נגד: שער שמודד טקסט ⛔ אינו מפיל')
        : bad('נ7 · שער טקסטואלי נתפס בטעות');
}

/*  ⛔ מ9 — הצהרת שער שנושאת סימן מעבר. ⚠️ שער שנכתב לאמת ששינוי
 *  קרה נשאר ירוק לנצח, ⭐ ואיש אינו שואל למה הוא שם. */
{
  const key = Object.keys(APP.appGates)[0];
  if (key === undefined) {
    ok('מ9 · [oneoff-gate] ⛔ אין כאן שער מוצהר — ⚠️ ואין מה למוטט');
  } else {
    const keep = APP.appGates[key];
    APP.appGates[key] = '⏳ מודד את ההסרה עד שתושלם — ⛔ ולאחיות אין מה להסיר';
    const hit = Object.entries(APP.appGates).some(([k, v]) => (k + ' ' + v).includes('⏳'));
    APP.appGates[key] = keep;
    hit ? ok('מ9 · [oneoff-gate] סימן מעבר בהצהרת שער מפיל את טענה 6')
        : bad('מ9 · סימן מעבר לא נתפס');
  }
}

fs.rmSync(tmp, { recursive: true, force: true });

console.log('\n' + (failed === 0 ? '✅' : '❌') +
  ` סבב 67 (סט הקבצים) — ${pass} טענות עברו, ${failed} נכשלו`);
if (failed) process.exit(1);

}

#!/usr/bin/env node
/*  שער שני ה-workflows — היפוך ברירת המחדל, סבב 46ב, כלל ברזל 14.
 *
 *  ⚠️ **מה שהיה חסר:** לכל קובץ תצורה בארגון הייתה רשימת «מה נאכף»,
 *  וכל השאר היה פרטי **כברירת מחדל** — ⛔ בלי שאיש הכריע על כך. כך
 *  חמק `icons[].purpose` שב-`manifest.json` ונסחף בשקט עד סבב 44ב, וכך
 *  ישבו שני ה-workflows: `test_round41_build.mjs` בודק את שם ה-workflow,
 *  את שם ה-artifact, את שם קובץ הפלט ואת היעדר `apksigner` מה-YAML,
 *  ⛔ ואינו נוגע בשאר הקובץ — צעד שנוסף, `runs-on` שהשתנה או שלב
 *  «copy web assets» שחזר היו עוברים בשקט בריפו אחד.
 *
 *  ⭐ **ההיפוך:** משווים את **כל** הקובץ, ומה ששונה חייב הכרזה מפורשת.
 *  מה שמוכרז פרטי כאן הוא **שם הריפו בלבד** — הוא מופיע בכתובת ה-Pages,
 *  בשם קובץ ה-APK ובשם ה-artifact, והוא מנורמל ל-`§` לפני החתימה.
 *  ⛔ כל שאר הבית — שלבים, גרסאות actions, הערות ה-⛔ — משותף ונחתם.
 *
 *  ⭐ **וזו מדידה ולא הצהרה** (סבב 46ב): `cleanup-merged-branches.yml`
 *  נמצא **זהה בית-לבית** בארבעת הריפו כבר לפני השער, ו-`build-apk.yml`
 *  יושר בסבב 41 — ההפרש כולו היה שם הריפו, ⛔ ועוד **שתי הערות** שנסחפו:
 *  פסקת מעבר על החלפת המפתח שישבה ב-gius לבדה (האירוע חלף; הכלל העומד
 *  יושב ב-`CLAUDE.md` שלה), וזנב «and here that data is money» בשכר.
 *  שתיהן יושרו — ⛔ הדגשה רטורית על כלל מוחלט זהה אינה הפרש יכולת.
 *
 *  הבדיקה נכשלת על שלושה סוגי סטייה:
 *    א. **חתימת `build-apk.yml`** — אינה תואמת לקנונית.
 *    ב. **חתימת `cleanup-merged-branches.yml`** — אותו דבר.
 *    ג. **זליגת שם ריפו** — שמו של ריפו אחר מופיע בקובץ.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = { app: 'schar-limud', slug: 'schar-limud' };
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD    = '.github/workflows/build-apk.yml';
const CLEANUP  = '.github/workflows/cleanup-merged-branches.yml';
const ALL_SLUGS = ['yoman-avoda', 'hanhala-ruchanit', 'schar-limud', 'gius'];

/*  ⭐ החתימות הקנוניות — אחת לכל קובץ, לארבעת הריפו יחד. ⛔ אין כאן
 *  שדה פר-אפליקציה בכוונה: חתימה פר-ריפו הייתה מחזירה בדיוק את מה
 *  שההיפוך בא לסלק — «לכל אחד משלו, ואין מול מה להשוות».                */
const BUILD_SHA   = 'bf38b751de2f1c33';
const CLEANUP_SHA = 'a48da4dd75a3245c';

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

/*  ⚠️ **הרווחים אינם מקופלים כאן, בניגוד לשער שכבת האנדרואיד** (סבב 46ב) —
 *  ב-YAML ההזחה **היא** המבנה, וקיפולה היה הופך שלב שהוזז לתוך `with:`
 *  לשינוי בלתי-נראה. מה שכן מנורמל: סופי שורה, רווחי סוף שורה, ושם
 *  הריפו.                                                               */
const norm = (t, slug = APP.slug) =>
  t.replace(/\r\n/g, '\n')
   .split(slug).join('§')
   .split('\n').map((l) => l.replace(/\s+$/, '')).join('\n')
   .trim() + '\n';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

for (const p of [BUILD, CLEANUP]) {
  if (!fs.existsSync(join(ROOT, p))) { fail(`${p} אינו קיים`); process.exit(1); }
}
const buildSrc   = fs.readFileSync(join(ROOT, BUILD),   'utf8');
const cleanupSrc = fs.readFileSync(join(ROOT, CLEANUP), 'utf8');

/* ── א+ב. שתי החתימות ───────────────────────────────────────────────────── */
const checkSha = (label, text, want) => {
  const got = sha(norm(text));
  if (got === want) pass(`${label}: תואם לחתימה הקנונית (${got})`);
  else fail(`${label}: ${got} במקום ${want} — ⛔ הקובץ נבדל מהשלושה האחרים ` +
            'במשהו שאינו שם הריפו. שינוי מכוון = עדכון בארבעת הריפו ובארבעת ' +
            'עותקי הבדיקה, באותו סבב (כלל ברזל 8 סעיף 3)');
};
checkSha(`חתימת ${BUILD}`,   buildSrc,   BUILD_SHA);
checkSha(`חתימת ${CLEANUP}`, cleanupSrc, CLEANUP_SHA);

/* ── ג. זליגת שם ריפו ──────────────────────────────────────────────────────
 *  ⚠️ החתימה כבר הייתה נופלת על זה, ⛔ אבל בהודעה שאינה אומרת דבר. שם של
 *  ריפו אחר ב-workflow הוא העתקה שלא הושלמה — ה-APK היה נבנה תחת השם
 *  הלא נכון, וזה שווה הודעה מפורשת.                                      */
for (const [label, src] of [[BUILD, buildSrc], [CLEANUP, cleanupSrc]]) {
  const leaked = ALL_SLUGS.filter((s) => s !== APP.slug && src.includes(s));
  if (leaked.length) fail(`${label}: שם ריפו זר — ${leaked.join(', ')}`);
  else pass(`${label}: אין זליגת שם ריפו`);
}

/* ── ד. מוטציות ─────────────────────────────────────────────────────────
 *  ⛔ רצות על עותק **בזיכרון** ולא על העץ (הלקח של סבב 42ג).            */
const mut = (label, before, after, shouldDiffer) => {
  if ((before !== after) === shouldDiffer) pass(`מוטציה: ${label}`);
  else fail(`מוטציה: ${label} — ` +
            (shouldDiffer ? 'החתימה לא השתנתה, כלומר החלק הזה אינו נאכף'
                          : 'החתימה השתנתה, כלומר החלק הזה אינו מנורמל החוצה'));
};
const nb = norm(buildSrc), nc = norm(cleanupSrc);
mut('שלב שנוסף ל-build-apk מפיל את החתימה',
    nb, norm(buildSrc.replace('    steps:', "    steps:\n      - run: echo x")), true);
mut('גרסת action שנסחפה מפילה את החתימה',
    nb, norm(buildSrc.replace('actions/upload-artifact@v4', 'actions/upload-artifact@v3')), true);
mut('הזחה שהשתנתה מפילה את החתימה — ⛔ הרווחים אינם מקופלים',
    nb, norm(buildSrc.replace('      - name: Upload signed APK', '        - name: Upload signed APK')), true);
mut('בדיקת ה-prefix ב-cleanup מפילה את החתימה כשהיא נפרצת',
    nc, norm(cleanupSrc.replace('claude/*)', '*)')), true);
/* ⭐ ומה שמוכרז פרטי — ⛔ אינו רשאי להזיז אותה. */
/*  ⚠️ המוטציה הזו מדמה **ריפו אחר**, ולכן היא מנרמלת עם הסלאג שלו: זו
 *  בדיוק הטענה שההיפוך נשען עליה — ארבעה קבצים ששמם שונה נושאים חתימה
 *  אחת.                                                                 */
mut('שם הריפו אינו בחתימה',
    nb, norm(buildSrc.split(APP.slug).join('some-other-repo'), 'some-other-repo'), false);
mut('רווח בסוף שורה אינו בחתימה',
    nc, norm(cleanupSrc.replace('\njobs:', '   \njobs:')), false);

console.log(failures ? `\n❌ ${APP.app}: ${failures} כשלים בשער ה-workflows`
                     : `\n✅ ${APP.app}: שער ה-workflows עבר`);
process.exit(failures ? 1 : 0);

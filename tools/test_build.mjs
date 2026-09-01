#!/usr/bin/env node
/*  test_build.mjs — מסלול הבנייה והחתימה: שני ה-workflows, סקריפט
 *  החתימה, והשער שביניהם (סבב 72: מוזג).
 *
 *  **מה נאכף:** (א) שני ה-workflows זהים בית-לבית ×4 אחרי נרמול שם
 *  הריפו, ואין בהם זליגת שם ריפו זר; (ב) ה-YAML קורא ל-`sign-apk.sh`
 *  ⛔ ואין בו `apksigner` משלו; (ג) ששת השדות הפרטיים של הסקריפט,
 *  חתימת חלקו המשותף, ושלושת שערי הבטיחות שבו — טביעה לפני החתימה,
 *  `apksigner verify --print-certs` אחריה, ו-`set -e`.
 *
 *  **הנימוק המדוד:** gius קיבלה workflow שקורא לסקריפט ובו שער טביעה,
 *  ⛔ ובשלושה האחרים לוגיקת `apksigner` הייתה משוכפלת בתוך ה-YAML בלי
 *  שום שער. ⚠️ ו-`sign-apk.sh` היה 63 שורות בשלושה ריפו ו-67 ב-gius,
 *  בלי ששום שער השווה ביניהם. ⭐ ומאחר שחתימת ה-YAML נופלת על כל שינוי
 *  בו, ⛔ שער נפרד שבודק שדות בתוכו אינו יכול ליפול לבדו.
 *
 *  **מה יישבר בלעדיו:** חתימה במפתח שגוי מייצרת אפליקציה **זרה**, וכל
 *  משתמש מותקן נתקל ב-`INSTALL_FAILED_UPDATE_INCOMPATIBLE` — ⛔ בלי שום
 *  דרך חזרה. ⚠️ ומסלול חתימה שני, בלי שער, הוא זה שייסחף.
 *
 *  **מה אינו נאכף כאן:** ⛔ שם הריפו — הוא מוכרז פרטי ומנורמל ל-`§`
 *  לפני החתימה, ⚠️ ומוטציית-נגד מודדת שהוא באמת אינו בחתימה.
 *
 *  ⛔ המוטציות רצות על עותק **בזיכרון** ולא על העץ (סבב 42ג) — מוטציה
 *  שנכתבת לעץ שורדת כשלון באמצע הריצה.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /* שם הריפו המלא הוא גם שם ה-artifact וגם שם קובץ הפלט.
     ⛔ לא שם הקיצור של ה-keystore (סבב 41) — «schar.apk» היה שם המפתח
     ולא שם התוצר, וזה בדיוק סוג ההיסט ששני שמות לאותו דבר מייצרים. */
  repo: 'schar-limud',
  /* שם הריפו — מוכרז פרטי בחתימת ה-workflows ומנורמל החוצה. */
  slug: 'schar-limud',
  keystore: 'schar.keystore',
  alias: 'schar',
  pass: 'schar123',
  out: 'schar-limud.apk',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [90, 76, 94];

const ROOT  = join(dirname(fileURLToPath(import.meta.url)), '..');
const YML   = '.github/workflows/build-apk.yml';
const SH    = 'signing/sign-apk.sh';

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

for (const p of [YML, SH]) {
  if (!fs.existsSync(join(ROOT, p))) { fail(`${p} אינו קיים`); }
}
if (failures) process.exit(1);

const ymlSrc = fs.readFileSync(join(ROOT, YML), 'utf8');
const shSrc  = fs.readFileSync(join(ROOT, SH),  'utf8');

/*  ⚠️ ה-YAML נקרא **בלי הערות** בכל הטענות שמדברות על תוכן שרץ.
 *  ⛔ בלי זה, המילה `apksigner` שבתוך הערה הסברתית הייתה מפילה את סעיף
 *  ד — כלומר השער היה נכשל על תיעוד ועובר על קוד, וזה גרוע משער שאינו
 *  קיים. (הלקח של `check-comments`: קוראים קוד, לא טקסט.)              */
const stripComments = (t) => t.split('\n')
  .map((l) => (/^\s*#/.test(l) ? '' : l.replace(/\s#(?![{}]).*$/, '')))
  .join('\n');

/*  אוסף הטענות — פונקציה אחת, כדי שהמוטציות יריצו **בדיוק** את מה
 *  שהריצה האמיתית מריצה. ⛔ שתי רשימות טענות היו שתי הזדמנויות לסחוף. */
function assertions(yml, sh, mode) {
  const out = [];              /* [ok, msg] */
  const code = stripComments(yml);
  const add  = (ok, msg) => out.push([ok, msg]);

  /* א. שם ה-workflow */
  const nm = /^name:\s*(.+?)\s*$/m.exec(code);
  add(!!nm && nm[1] === 'Build APK',
      `שם ה-workflow הוא «Build APK» (נמצא: ${nm ? nm[1] : 'חסר'})`);

  /* ב. שם ה-artifact */
  add(new RegExp(`^\\s+name:\\s*${APP.repo}-apk\\s*$`, 'm').test(code),
      `שם ה-artifact הוא «${APP.repo}-apk»`);

  /* ג. שם קובץ הפלט, ובשורש — ⛔ `path:` בלי לוכסן */
  const pth = /^\s+path:\s*(.+?)\s*$/m.exec(code);
  add(!!pth && pth[1] === `${APP.repo}.apk`,
      `קובץ הפלט הוא «${APP.repo}.apk» בשורש (נמצא: ${pth ? pth[1] : 'חסר'})`);
  add(!!pth && pth[1].indexOf('/') < 0,
      'קובץ הפלט אינו בתת-תיקייה');
  add(new RegExp(`\\b${APP.repo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.apk\\b`)
        .test(code.split('Sign with the permanent key')[1] || code),
      `שלב החתימה מייצר «${APP.repo}.apk»`);

  /* ד. ⭐ הליבה — אין לוגיקת חתימה שנייה ב-YAML */
  add(!/apksigner/.test(code),
      '⛔ ה-YAML אינו מכיל apksigner — החתימה עוברת דרך הסקריפט בלבד');
  add(!/zipalign/.test(code),
      '⛔ ה-YAML אינו מכיל zipalign');
  add(!/--ks-pass|--key-pass|--ks-key-alias/.test(code),
      '⛔ ה-YAML אינו מכיל דגלי keystore');

  /* ה. חיווט וקשיחות */
  add(/\.\/signing\/sign-apk\.sh/.test(code),
      'ה-workflow קורא ל-./signing/sign-apk.sh');
  add(/if-no-files-found:\s*error/.test(code),
      'if-no-files-found: error — artifact ריק מפיל את הריצה');
  add(/set -euo pipefail/.test(code),
      'set -euo pipefail בשלבי ה-run');

  /* ו. ⭐ שער הטביעה מולא ותקין בצורתו */
  const m = /^EXPECTED_SHA256='([^']*)'/m.exec(sh);
  const sha = m ? m[1] : null;
  add(!!sha, 'EXPECTED_SHA256 מוגדר בסקריפט');
  add(!!sha && sha.trim() !== '' && !/FILL_ME|TODO|XXX|CHANGEME/i.test(sha),
      '⛔ EXPECTED_SHA256 אינו ריק ואינו מציין-מקום');
  add(!!sha && /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(sha),
      'EXPECTED_SHA256 בפורמט keytool המקורי (32 בתים, נקודתיים, אותיות גדולות)');
  add(/set -euo pipefail/.test(sh), 'הסקריפט נושא set -euo pipefail');
  add(new RegExp(`grep -qF "SHA256: \\$EXPECTED_SHA256"`).test(sh),
      'שער טביעה **לפני** החתימה — מסרב לחתום במפתח שאינו הצפוי');
  add(/apksigner verify --print-certs "\$OUT"[\s\S]*WANT.*!=.*GOT|\$WANT" != "\$GOT/.test(sh),
      'אימות התעודה שנחתמה **בפועל**, אחרי החתימה');

  if (mode === 'count') return out.filter(([ok]) => !ok).length;
  return out;
}

/* ── הריצה האמיתית ─────────────────────────────────────────────────────── */
for (const [ok, msg] of assertions(ymlSrc, shSrc)) (ok ? pass : fail)(msg);

/* ז. הרשאת הרצה — נקראת מה-index של git, לא ממצב הדיסק, כי זה מה
 *    שנדחף בפועל. ⚠️ מדלגת ואינה מפילה כשאין git. */
try {
  const mode = execFileSync('git', ['-C', ROOT, 'ls-files', '-s', SH],
                            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
                 .trim().split(/\s+/)[0];
  if (mode === '100755') pass('signing/sign-apk.sh בר-הרצה (100755)');
  else fail(`signing/sign-apk.sh במצב ${mode} ולא 100755 — ה-workflow קורא לו ישירות`);
} catch (_) { console.log('⏭️  אין git — בדיקת הרשאת ההרצה מדולגת'); }

/* ── מוטציות — כל אחת חייבת להפיל טענה שהריצה האמיתית מעבירה ───────────── */
const base = assertions(ymlSrc, shSrc, 'count');
if (base !== 0) fail(`קו-הבסיס אינו נקי (${base} כשלים) — המוטציות אינן משמעותיות`);

const MUTATIONS = [
  ['שם ה-workflow חזר ל-«Build Signed APK»',
   (y, s) => [y.replace(/^name: Build APK$/m, 'name: Build Signed APK'), s]],
  ['שם ה-artifact חזר ל-«-signed-apk»',
   (y, s) => [y.replace(`name: ${APP.repo}-apk`, `name: ${APP.repo}-signed-apk`), s]],
  ['קובץ הפלט הועבר לתת-תיקייה',
   (y, s) => [y.replace(`path: ${APP.repo}.apk`, `path: android/${APP.repo}.apk`), s]],
  ['⭐ לוגיקת apksigner הוחזרה ל-YAML',
   (y, s) => [y.replace('./signing/sign-apk.sh',
                        '"$BT/apksigner" sign --ks signing/x.keystore #'), s]],
  ['if-no-files-found הוסר',
   (y, s) => [y.replace(/\n\s+if-no-files-found:\s*error/, ''), s]],
  ['⭐ EXPECTED_SHA256 הוחלף במציין-מקום',
   (y, s) => [y, s.replace(/^EXPECTED_SHA256='[^']*'/m, "EXPECTED_SHA256='__FILL_ME__'")]],
  ['⭐ EXPECTED_SHA256 רוקן',
   (y, s) => [y, s.replace(/^EXPECTED_SHA256='[^']*'/m, "EXPECTED_SHA256=''")]],
  ['שער הטביעה שלפני החתימה הוסר',
   (y, s) => [y, s.replace(/grep -qF "SHA256: \$EXPECTED_SHA256"/, 'grep -q .')]],
];

console.log('  — מוטציות —');
for (const [label, mut] of MUTATIONS) {
  const [y, s] = mut(ymlSrc, shSrc);
  const n = assertions(y, s, 'count');
  if (n > 0) pass(`מוטציה: ${label} → ${n} טענות נופלות`);
  else fail(`מוטציה: ${label} — ⛔ לא הפילה דבר, השער אינו נועל אותה`);
}


/* ══ שני ה-workflows וסקריפט החתימה (סבב 72: מוזגו לכאן) ═════════════════ */
const BUILD    = '.github/workflows/build-apk.yml';
const CLEANUP  = '.github/workflows/cleanup-merged-branches.yml';
const ALL_SLUGS = ['yoman-avoda', 'hanhala-ruchanit', 'schar-limud', 'gius'];
const BUILD_SHA   = 'bf38b751de2f1c33';
const CLEANUP_SHA = 'a48da4dd75a3245c';
const PRIV = /^(# Sign an APK with the PERMANENT |KS=|ALIAS=|PASS=|EXPECTED_SHA256=|OUT=|echo "✅ Signed with the permanent )/;
const SHARED_SHA = 'eb0af5fdba30e4e6';

const FILE = 'signing/sign-apk.sh';
const t = (c, m) => (c ? pass(m) : fail(m));
const shScript = fs.readFileSync(join(ROOT, FILE), 'utf8');
const sharedOf = (txt) => txt.split('\n').map((l) => (PRIV.test(l) ? '' : l)).join('\n');
const sig = (txt) => crypto.createHash('sha256').update(sharedOf(txt)).digest('hex').slice(0, 16);

/* ── ה. ששת השדות הפרטיים ──────────────────────────────────────────────── */
t(shScript.includes(`KS="$HERE/${APP.keystore}"`), `א1 · ה-keystore הוא ${APP.keystore}`);
t(shScript.includes(`ALIAS='${APP.alias}'`),       `א2 · ה-alias הוא ${APP.alias}`);
t(shScript.includes(`PASS='${APP.pass}'`),         'א3 · הסיסמה תואמת לבלוק APP');
t(shScript.includes(`OUT="\${2:-${APP.out}}"`),    `א4 · שם הפלט הוא ${APP.out}`);
{
  const m = /EXPECTED_SHA256='([0-9A-F:]{95})'/.exec(shScript);
  t(!!m, 'א5 · ⛔ טביעה מלאה (32 בתים) ולא מציין-מקום');
}

/* ── ו. החתימה על החלק המשותף ──────────────────────────────────────────── */
t(sig(shScript) === SHARED_SHA,
  `ב · החלק המשותף זהה לחתימה הקנונית (${sig(shScript)})`);

/* ── ז. שלושת שערי הבטיחות שבסקריפט ────────────────────────────────────── */
t(/set -e/.test(shScript),                       'ג1 · `set -e` — שגיאה עוצרת');
t(/apksigner verify --print-certs/.test(shScript),'ג2 · אימות התעודה אחרי החתימה');
t(shScript.indexOf('EXPECTED_SHA256') < shScript.indexOf('apksigner sign'),
  'ג3 · ⛔ הטביעה מושווית **לפני** החתימה ולא אחריה');

/* ── ח. מוטציות סקריפט החתימה ──────────────────────────────────────────── */
/*  ⛔ המוטציות אינן נכתבות לעץ (הלקח של סבב 42ג) — מוטציה שנכתבת לעץ
 *  שורדת כשלון באמצע הריצה. */
t(sig(shScript.replace('set -e', 'set -eu')) !== SHARED_SHA,
  'ד1 · מוטציה בחלק המשותף מזיזה את החתימה');
t(sig(shScript.replace(`ALIAS='${APP.alias}'`, "ALIAS='zzz'")) === SHARED_SHA,
  'ד2 · ⭐ מוטציית-נגד: שינוי שדה פרטי ⛔ אינו מזיז את החתימה');
t(sig(shScript.replace('apksigner verify --print-certs', 'true')) !== SHARED_SHA,
  'ד3 · הסרת אימות התעודה מזיזה את החתימה');

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

/* ── ט. שתי חתימות ה-workflows ─────────────────────────────────────────── */
const checkSha = (label, text, want) => {
  const got = sha(norm(text));
  if (got === want) pass(`${label}: תואם לחתימה הקנונית (${got})`);
  else fail(`${label}: ${got} במקום ${want} — ⛔ הקובץ נבדל מהשלושה האחרים ` +
            'במשהו שאינו שם הריפו. שינוי מכוון = עדכון בארבעת הריפו ובארבעת ' +
            'עותקי הבדיקה, באותו סבב (כלל ברזל 8 סעיף 3)');
};
checkSha(`חתימת ${BUILD}`,   buildSrc,   BUILD_SHA);
checkSha(`חתימת ${CLEANUP}`, cleanupSrc, CLEANUP_SHA);

/* ── י. זליגת שם ריפו ───────────────────────────────────────────────────────
 *  ⚠️ החתימה כבר הייתה נופלת על זה, ⛔ אבל בהודעה שאינה אומרת דבר. שם של
 *  ריפו אחר ב-workflow הוא העתקה שלא הושלמה — ה-APK היה נבנה תחת השם
 *  הלא נכון, וזה שווה הודעה מפורשת.                                      */
for (const [label, src] of [[BUILD, buildSrc], [CLEANUP, cleanupSrc]]) {
  const leaked = ALL_SLUGS.filter((s) => s !== APP.slug && src.includes(s));
  if (leaked.length) fail(`${label}: שם ריפו זר — ${leaked.join(', ')}`);
  else pass(`${label}: אין זליגת שם ריפו`);
}

/* ── יא. מוטציות ה-workflows ────────────────────────────────────────────────
 *  ⛔ רצות על עותק **בזיכרון** ולא על העץ — הלקח של סבב 42ג: מוטציה שנכתבת
 *  לעץ שורדת כשלון באמצע הריצה.                                        */
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

console.log(failures ? `\n❌ ${APP.app}: ${failures} כשלים בשער הבנייה, החתימה וה-workflows`
                     : `\n✅ ${APP.app}: שער הבנייה, החתימה וה-workflows עבר`);
process.exit(failures ? 1 : 0);

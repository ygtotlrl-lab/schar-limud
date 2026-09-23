#!/usr/bin/env node
/*  test_build.mjs — מסלול הבנייה והחתימה: שני ה-workflows, סקריפט
 *  החתימה, והשער שביניהם.
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
 *  ⛔ המוטציות רצות על עותק **בזיכרון** ולא על העץ — מוטציה
 *  שנכתבת לעץ שורדת כשלון באמצע הריצה.
 *
 *  זהה בית-לבית בכל הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS, COL_FIRST, COL_NOTE } from './peers.mjs';
import { FACTS } from './app-facts.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  /*  ⚠️ שם קובץ הפלט של החתימה — ⛔ **אינו נגזר**: אין קובץ שמצהיר עליו
   *  מלבד `sign-apk.sh` שהשער מודד, ⭐ וצורתו נבדלת בין הריפו — שם הריפו
   *  לבדו או עם `-signed`, ⚠️ ולכן גם שם הריפו אינו מקור שלו. */
  out: 'schar-limud.apk',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [151, 152, 129, 156, 34, 45];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT  = join(dirname(fileURLToPath(import.meta.url)), '..');
const YML   = '.github/workflows/build-apk.yml';
const SH    = 'signing/sign-apk.sh';

let failures = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 35, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך
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
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.GATE_INNER;
/*  ⛔ הריצפה נמדדת בשני הכיוונים — ⚠️ **מה נכנס**: מספר הטענות
 *  שרצו עד שלב המוטציות; ⛔ **ומה מפיל**: פחות מהמוצהר — ריצה חלקית —
 *  ⛔ ויותר ממנו — ריצפה מיושנת. ⭐ **ולמה שני הכיוונים**: ריצפה שאינה
 *  מתעדכנת מפסיקה למדוד את מה שנוסף. ⛔ **וההשהיה על שלב המוטציות בלבד**
 *  — ⚠️ `mutStage` לוכדת את המונה בכניסה אליו, ⭐ ומה שהוא
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
  /*  ⛔ אפס שנמדד בכניסה לשלב המוטציות הוא דילוג מוצהר —
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
const fail = (m) => { RAN++; failures++; console.error('❌ ' + m); };
const pass = (m) => (RAN++, console.log('✅ ' + m));

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
  add(new RegExp(`^\\s+name:\\s*${FACTS.slug}-apk\\s*$`, 'm').test(code),
      `שם ה-artifact הוא «${FACTS.slug}-apk»`);

  /* ג. שם קובץ הפלט, ובשורש — ⛔ `path:` בלי לוכסן */
  const pth = /^\s+path:\s*(.+?)\s*$/m.exec(code);
  add(!!pth && pth[1] === `${FACTS.slug}.apk`,
      `קובץ הפלט הוא «${FACTS.slug}.apk» בשורש (נמצא: ${pth ? pth[1] : 'חסר'})`);
  add(!!pth && pth[1].indexOf('/') < 0,
      'קובץ הפלט אינו בתת-תיקייה');
  add(new RegExp(`\\b${FACTS.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.apk\\b`)
        .test(code.split('Sign with the permanent key')[1] || code),
      `שלב החתימה מייצר «${FACTS.slug}.apk»`);

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

  /* ה2. ⭐ המפתח מגיע מהסודות ואינו בעץ */
  add(/secrets\.KEYSTORE_B64/.test(code) && /secrets\.KEYSTORE_PASS/.test(code),
      '⭐ ה-workflow מושך את המפתח ואת מילת המעבר מ-GitHub Secrets');
  add(/base64 -d\s*>\s*"\$SIGN_KEYSTORE"/.test(code),
      'המפתח מפוענח לקובץ זמני שמחוץ לעץ העבודה');
  {
    const rm = (code.split('Remove the decoded key')[1] || '').split('- name:')[0];
    add(/if:\s*always\(\)/.test(rm) && /rm -f "\$SIGN_KEYSTORE"/.test(rm),
        '⛔ המפתח המפוענח נמחק בשלב שרץ גם כשהחתימה נפלה');
  }

  /* ו2. ⭐ הסקריפט אינו מקליד את מה שאינו שלו */
  add(/^KS="\$\{SIGN_KEYSTORE:\?/m.test(sh),
      '⛔ נתיב המפתח מגיע מהסביבה ונופל ברעש כשהוא חסר');
  add(/^PASS="\$\{SIGN_PASS:\?/m.test(sh),
      '⛔ מילת המעבר מגיעה מהסביבה ונופלת ברעש כשהיא חסרה');
  add(/^ALIAS="\$\(printf/m.test(sh) && !/^ALIAS='/m.test(sh),
      '⛔ ה-alias נגזר מהמפתח ואינו מוקלד');

  /* ה3. ⭐ שלושת שלבי הסוד, ובסדר הזה: נרמול ⟵ שער האלפבית ⟵ פענוח */
  {
    const st = (code.split('Sign with the permanent key')[1] || '').split('- name:')[0];
    const iNorm = st.indexOf("tr -d ' \\t\\r\\n'");
    const iGate = st.indexOf("grep -qE '^[A-Za-z0-9+/]+=*$'");
    const iDec  = st.indexOf('base64 -d > "$SIGN_KEYSTORE"');
    add(iNorm >= 0 && iGate >= 0 && iDec >= 0,
        '⛔ שלושת שלבי הסוד קיימים — נרמול · שער האלפבית · פענוח');
    add(iNorm >= 0 && iGate > iNorm && iDec > iGate,
        `⛔ והם בסדר נרמול ⟵ שער ⟵ פענוח (נמדדו ${iNorm}/${iGate}/${iDec})`);
  }

  if (mode === 'count') return out.filter(([ok]) => !ok).length;
  return out;
}

/* ── הריצה האמיתית ─────────────────────────────────────────────────────── */
for (const [ok, msg] of assertions(ymlSrc, shSrc)) (ok ? pass : fail)(msg);

/*  ז. הרשאת הרצה — ⛔ **הטענה היא על מה שנדחף**, ⚠️ ולכן היא נקראת
 *  מה-index של git ⛔ ולא ממצב הדיסק: ⭐ ה-runner מקבל בצ׳קאאוט את מצב
 *  ה-index, ⚠️ ומצב דיסק יכול להיבדל ממנו — `core.fileMode=false` שומר
 *  בו 100755 על קובץ שאיבד את הסיבית.
 *  ⛔ **ובעץ שאינו מאגר אין מצב מעקב כלל** — ⚠️ שם נמדד מצב הדיסק,
 *  ⭐ והטענה אומרת זאת בשמה: ⛔ היא מדידה **חלשה יותר**, ⚠️ ולא אותה
 *  מדידה במילים אחרות.
 *  ⛔⛔ **ואינה מדלגת** — ⚠️ דילוג הוריד את המונה ל-28 מתוך 29, ⭐ והוא
 *  נבלע ב-`GATE_SUBRUN` של שער הקריאה-בלבד: ⛔ כלומר «עבר» על טענה
 *  שלא רצה. ⚠️ **והנפילה-חזרה ניתנת להפרכה** — ⛔ `fs.cpSync` משמר את
 *  המצב, ⭐ ו-`chmod 644` על העותק מפיל אותה. */
{
  let mode = null, src = 'index של git';
  try {
    mode = execFileSync('git', ['-C', ROOT, 'ls-files', '-s', SH],
                        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
             .trim().split(/\s+/)[0] || null;
  } catch (_) { mode = null; }
  if (!mode) {
    /*  ⚠️ שמונה הביטים התחתונים בלבד — ⛔ `100755` של git הוא הטיפוס
     *  ועוד ההרשאות, ⭐ ו-`statSync().mode` נושא את שניהם באותו מספר. */
    mode = '100' + (fs.statSync(join(ROOT, SH)).mode & 0o777).toString(8);
    src = 'מצב הדיסק — ⚠️ אין כאן מאגר git, ⛔ ומצב מעקב אינו קיים';
  }
  if (mode === '100755') pass(`signing/sign-apk.sh בר-הרצה (100755, נקרא מ-${src})`);
  else fail(`signing/sign-apk.sh: נמדד ${mode} והצפוי 100755 (נקרא מ-${src}) — ` +
            'ה-workflow קורא לו ישירות; מה עושים: `git update-index --chmod=+x signing/sign-apk.sh`');
}

/*  ז2. ⛔ הנרמול ושער האלפבית נמדדים **בהתנהגות**, ובשני הכיוונים —
 *  ⚠️ ולא בנוכחות שלוש מחרוזות במקור: ⭐ ערך שנושא תו בלתי-נראה חוזר
 *  מ-`base64` כ«invalid input», ⛔ וההודעה שהמשתמש ראה אמרה «סיסמה
 *  שגויה». ⚠️ הקטע נחתך מה-workflow החי ורץ כפי שהוא — ⛔ עותק שלו כאן
 *  היה מקור אמת שני. */
{
  const ls = ymlSrc.split('Sign with the permanent key')[1] || '';
  const step = ls.split('- name:')[0].split('\n');
  const a = step.findIndex((l) => l.includes('B64=$(printf'));
  const b = step.findIndex((l, i) => i > a && l.trim() === 'fi');
  if (a < 0 || b <= a) {
    fail('ז2 · קטע הנרמול והשער לא נמצא ב-build-apk.yml — ' +
         'נמדד a=' + a + ' b=' + b + ' מול שני העוגנים שבצעד — ' +
         'מה עושים: ודא ש-`B64=$(printf` ו-`fi` שאחריו בגוף הצעד.');
  } else {
    const pipe = step.slice(a, b + 1).map((l) => l.replace(/^ {10}/, '')).join('\n');
    const PAY = Buffer.from('infra-normalisation-probe', 'utf8');
    const CLEAN = PAY.toString('base64');
    /*  ⚠️ שבעת הזיהומים שנמדדו בפועל: BOM · RLM · LRM · ZWSP · NBSP ·
     *  מקף רך · CR · רווח — ⭐ כולם מנורמלים החוצה ⛔ ואינם מפילים. */
    const DIRTY = '\uFEFF' + CLEAN.slice(0, 4) + '\u200F \r\n\u00A0\u200B\u00AD' +
                  CLEAN.slice(4) + '\u200E';
    const FOREIGN = CLEAN.slice(0, 4) + '!' + CLEAN.slice(4);
    const run = (v) => {
      try {
        const out = execFileSync('sh', ['-c', 'set -eu\n' + pipe + '\nprintf %s "$B64"'],
          { env: { ...process.env, KEYSTORE_B64: v },
            encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        return { ok: true, out };
      } catch (_) { return { ok: false, out: '' }; }
    };
    const same = (r) => r.ok && Buffer.from(r.out, 'base64').equals(PAY);
    (same(run(CLEAN)) ? pass : fail)(
      'ז2 · ⭐ מוטציית-נגד: ערך נקי עובר את השער ומפוענח בית-לבית');
    (same(run(DIRTY)) ? pass : fail)(
      'ז2 · ⭐ ערך עם BOM · RLM · LRM · ZWSP · NBSP · מקף רך · CR · רווח — מנורמל ומפוענח בית-לבית');
    (!run(FOREIGN).ok ? pass : fail)(
      'ז2 · מוטציה: תו שאינו באלפבית base64 **נופל** בשער, לפני הפענוח');
  }
}

/* ══ זרימה שרצה מחוץ לסט ═════════════════════════════════════════════════
 *  ⛔ **מה נאכף**: כל workflow שמריץ כלי מ-`tools/` הוא זרימת בדיקה —
 *  ⚠️ והוא מוצהר ב-`FLOWS` עם השורות שהוא אוכף, ⭐ כל שורה כזו נוקבת
 *  בשמו, ⛔ והוא מופעל ביד בלבד: ⚠️ בדיקה שרצה כשאיש אינו מסתכל אינה
 *  נקראת. ⛔ **ואין שורה ⭕ שנימוקה תקציב הזמן** — ⚠️ מה שניתן למדידה
 *  ואינו נכנס בתקציב נמדד בזרימה, ⭐ ואינו נשאר «אינו ניתן לאכיפה».
 *  ⚠️ **והמדידה פונקציה טהורה של הטקסט** — ⭐ המוטציות רצות בזיכרון. */
/*  ⛔ הזרימות — ⚠️ **מה נכנס**: שם הזרימה ⟵ הכלי שהיא מריצה ⟵ שמות השורות
 *  שהיא אוכפת; ⛔ **ומה מפיל**: זרימה שאין לה קובץ, קובץ שאין לו הצהרה,
 *  ושורה שאינה נוקבת בה. ⭐ **ולמה בשם ולא במספר**: מספר השורה זז. */
const FLOWS = {
  'deep-check': { check: 'tools/deep-check.mjs', rows: ['שער משותף רץ בזמן דומה בכולם'] },
};
const WF_DIR = '.github/workflows';
/*  ⚠️ `t` מוגדרת רק בשלב המלא — ⛔ והטענות כאן רצות גם ברמה המהירה. */
const tf = (c, m) => (c ? pass(m) : fail(m));
const noHash = (t) => t.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');
const isFlow = (t) => /\btools\/[\w-]+\.mjs\b/.test(noHash(t));
function tableOf(md) {
  const out = [];
  for (const l of md.split('\n')) {
    const m = /^\|\s*(\d+)\s*\|/.exec(l);
    if (!m) continue;
    const c = l.split('|');
    out.push({ n: Number(m[1]), name: (c[2] || '').trim(),
               marks: c.slice(COL_FIRST, COL_NOTE).map((x) => (x || '').trim()),
               note: (c[COL_NOTE] || '').trim() });
  }
  return out;
}
/*  ⛔ [flow-row] — הזרימה והשורה נוקבות זו בזו, ⚠️ משני הצדדים. */
function flowRowGaps(md, wf) {
  const out = [], rows = tableOf(md);
  for (const [flow, d] of Object.entries(FLOWS)) {
    const src = wf[flow + '.yml'];
    if (src == null) { out.push(`${flow}: אין \`${WF_DIR}/${flow}.yml\``); continue; }
    if (!noHash(src).includes(d.check)) out.push(`${flow}: אינה מריצה את \`${d.check}\``);
    if (!fs.existsSync(join(ROOT, d.check))) out.push(`${flow}: \`${d.check}\` אינו קיים`);
    for (const name of d.rows) {
      const r = rows.find((x) => x.name === name);
      if (!r) out.push(`${flow}: השורה «${name}» אינה בטבלה`);
      else if (!r.note.includes('`' + flow + '`')) out.push(`«${name}» אינה נוקבת ב-\`${flow}\``);
    }
  }
  for (const [f, src] of Object.entries(wf))
    if (isFlow(src) && !FLOWS[f.replace(/\.yml$/, '')]) out.push(`${f}: זרימה בלי שורה`);
  for (const r of rows) for (const m of r.note.matchAll(/`([\w-]+)`/g))
    if (FLOWS[m[1]] && !FLOWS[m[1]].rows.includes(r.name)) out.push(`«${r.name}» נוקבת ב-\`${m[1]}\` ואינה מוצהרת`);
  return out;
}
/*  ⛔ [flow-dispatch] — הזרימה מופעלת ביד בלבד: ⚠️ `workflow_dispatch`,
 *  ⛔ ולא `schedule` ולא `push`. */
function flowTriggers(wf) {
  const out = [];
  for (const [f, src] of Object.entries(wf)) {
    if (!isFlow(src)) continue;
    const t = noHash(src);
    if (!/^\s*workflow_dispatch\s*:/m.test(t)) out.push(`${f}: אין \`workflow_dispatch\``);
    for (const k of ['schedule', 'push', 'pull_request'])
      if (new RegExp('^\\s*' + k + '\\s*:', 'm').test(t)) out.push(`${f}: \`${k}\``);
  }
  return out;
}
/*  ⛔ [flow-budget] — שורה ⭕ שנימוקה תקציב הזמן היא מדידה שלא הועברה לזרימה. */
const budgetRows = (md) => tableOf(md)
  .filter((r) => r.marks.length && r.marks.every((x) => x === '⭕') && /תקציב הזמן/.test(r.note))
  .map((r) => `${r.n} «${r.name}»`);
/*  ⛔ [flow-deep] — הזרימה זהה בית-לבית בכולן, ⚠️ ואין בה שם ריפו: ⭐ השמות
 *  נגזרים מהמרשם ומהריפו שמריץ. */
const DEEP_SHA = '3e69a4743bc4a16e';
const deepLeak = (src) => PEERS.filter((p) => src.includes(p));
const wfFiles = () => Object.fromEntries(fs.readdirSync(join(ROOT, WF_DIR))
  .filter((f) => f.endsWith('.yml')).map((f) => [f, fs.readFileSync(join(ROOT, WF_DIR, f), 'utf8')]));
const WF = wfFiles();
const MD = fs.readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
{
  const g = flowRowGaps(MD, WF);
  tf(g.length === 0, `[flow-row] כל זרימה נוקבת בשורה וכל שורה בזרימה — נמדדו ${g.length} פערים והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מצהירים ב-\`FLOWS\` ונוקבים בשם הזרימה בהערת השורה` : ''));
}
{
  const g = flowTriggers(WF);
  tf(g.length === 0, `[flow-dispatch] זרימת בדיקה מופעלת ביד בלבד — נמדדו ${g.length} טריגרים אחרים והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מסירים אותם — ⛔ בדיקה שרצה כשאיש אינו מסתכל אינה נקראת` : ''));
}
{
  const g = budgetRows(MD);
  tf(g.length === 0, `[flow-budget] שורה ⭕ שנימוקה תקציב הזמן — נמדדו ${g.length} והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מעבירים את המדידה לזרימה שרצה לפני המיזוג` : ''));
}
{
  const src = WF['deep-check.yml'] || '';
  const got = crypto.createHash('sha256').update(src).digest('hex').slice(0, 16);
  const leak = deepLeak(src);
  tf(got === DEEP_SHA, `[flow-deep] deep-check.yml זהה לחתימה הקנונית — נמדד ${got} והצפוי ${DEEP_SHA}` +
    (got === DEEP_SHA ? '' : '. שינוי מכוון = עדכון בכל הריפו ובכל עותקי השער, באותו סבב'));
  tf(leak.length === 0, `[flow-deep] deep-check.yml אינו נוקב בשם ריפו — נמדדו ${leak.length} והצפוי אפס` +
    (leak.length ? `: ${leak.join(' · ')}. גוזרים מהמרשם` : ''));
}

/*  ⛔ [uses-supported] — כל `uses:` בזרימה נושא גרסה ראשית נתמכת. ⚠️ **מה
 *  נכנס**: שם ה-action ⟵ הגרסה הראשית הנמוכה ביותר שנתמכת; ⛔ **ומה מפיל**:
 *  `uses:` בלי גרסה ראשית, action שאינו במרשם, וגרסה שנמוכה ממנו. ⭐ **ולמה
 *  המרשם קיים**: גרסה שיצאה מתמיכה ממשיכה לרוץ עם אזהרה עד היום שבו היא
 *  נשברת, ⛔ ואיש אינו קורא אזהרות בזרימה שעברה. */
const USES_MIN = {
  'actions/checkout': 7, 'actions/setup-java': 6,
  'actions/upload-artifact': 7, 'android-actions/setup-android': 4,
};
function usesGaps(wf) {
  const out = [];
  for (const [f, src] of Object.entries(wf))
    for (const m of noHash(src).matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)/gm)) {
      const u = /^([\w.-]+\/[\w.-]+)@v(\d+)$/.exec(m[1]);
      if (!u) { out.push(`${f}: \`${m[1]}\` בלי גרסה ראשית`); continue; }
      if (!(u[1] in USES_MIN)) out.push(`${f}: \`${u[1]}\` אינו במרשם`);
      else if (Number(u[2]) < USES_MIN[u[1]]) out.push(`${f}: \`${m[1]}\` מתחת ל-v${USES_MIN[u[1]]}`);
    }
  return out;
}
{
  const g = usesGaps(WF);
  const n = Object.values(WF).reduce((k, src) => k + (noHash(src).match(/^\s*(?:-\s*)?uses:/gm) || []).length, 0);
  tf(n > 0 && g.length === 0, `[uses-supported] כל \`uses:\` נושא גרסה נתמכת — נמדדו ${g.length} חורגים מתוך ${n} והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מקדמים את הגרסה בכל הריפו באותו סבב` : ''));
}

/*  ⛔ מכאן ולמטה מוטציות ובדיקות שלמות — ⚠️ הן רצות ברמה
 *  המלאה בלבד: ⛔ הרמה המהירה עוצרת כאן עם קוד היציאה של הטענות
 *  שכבר רצו, ⭐ והכיסוי שלהן אינו יורד. */
mutStage();
if (!RUN_MUT) {
  console.log('\n⏭ test_build: המוטציות רצות ברמה המלאה (--full) — ⛔ ואינן נמדדות כאן');
  process.exit(failures ? 1 : 0);
}
/* ── מוטציות — כל אחת חייבת להפיל טענה שהריצה האמיתית מעבירה ───────────── */
const base = assertions(ymlSrc, shSrc, 'count');
if (base !== 0) fail(`קו-הבסיס אינו נקי (${base} כשלים) — המוטציות אינן משמעותיות`);

const MUTATIONS = [
  ['שם ה-workflow חזר ל-«Build Signed APK»',
   (y, s) => [y.replace(/^name: Build APK$/m, 'name: Build Signed APK'), s]],
  ['שם ה-artifact חזר ל-«-signed-apk»',
   (y, s) => [y.replace(`name: ${FACTS.slug}-apk`, `name: ${FACTS.slug}-signed-apk`), s]],
  ['קובץ הפלט הועבר לתת-תיקייה',
   (y, s) => [y.replace(`path: ${FACTS.slug}.apk`, `path: android/${FACTS.slug}.apk`), s]],
  ['⭐ לוגיקת apksigner הוחזרה ל-YAML',
   (y, s) => [y.replace('./signing/sign-apk.sh',
                        '"$BT/apksigner" sign --ks signing/x.keystore #'), s]],
  ['if-no-files-found הוסר',
   (y, s) => [y.replace(/\n\s+if-no-files-found:\s*error/, ''), s]],
  ['⭐ EXPECTED_SHA256 הוחלף במציין-מקום',
   (y, s) => [y, s.replace(/^EXPECTED_SHA256='[^']*'/m, "EXPECTED_SHA256='__FILL_ME__'")]],
  ['⭐ EXPECTED_SHA256 רוקן',
   (y, s) => [y, s.replace(/^EXPECTED_SHA256='[^']*'/m, "EXPECTED_SHA256=''")]],
  ['⭐ המפתח חזר להיות ליטרל במקום סוד',
   (y, s) => [y.replace('secrets.KEYSTORE_B64', 'vars.PLAIN'), s]],
  ['⭐ מחיקת המפתח המפוענח אינה רצה בכשל',
   (y, s) => [y.replace(/\n        if: always\(\)/, ''), s]],
  ['⭐ נתיב המפתח חזר להיות מוקלד בסקריפט',
   (y, s) => [y, s.replace(/^KS="\$\{SIGN_KEYSTORE:\?[^\n]*$/m, 'KS="$HERE/key.store"')]],
  ['⭐ מילת המעבר חזרה להיות ליטרל בסקריפט',
   (y, s) => [y, s.replace(/^PASS="\$\{SIGN_PASS:\?[^\n]*$/m, "PASS='literal'")]],
  ['⭐ ה-alias הוקלד חזרה',
   (y, s) => [y, s.replace(/^ALIAS="\$\(printf[^\n]*$/m, "ALIAS='typed'")]],
  ['⭐ הנרמול הוסר',
   (y, s) => [y.replace("| LC_ALL=C tr -d ' \\t\\r\\n' \\", '\\'), s]],
  ['⭐ שער האלפבית הוסר',
   (y, s) => [y.replace(/^ +if ! printf[\s\S]*?^ +fi\n/m, ''), s]],
  ['⭐ השער הוקדם אל **לפני** הנרמול',
   (y, s) => {
     const g = y.match(/^ +if ! printf[\s\S]*?^ +fi\n/m)[0];
     const n = y.match(/^ +B64=\$\(printf[\s\S]*?\\xAD\]\/\/g'\)\n/m)[0];
     return [y.replace(g, '').replace(n, (m) => g + m), s];
   }],
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


/* ══ שני ה-workflows וסקריפט החתימה ══════════════════════════════════════ */
const BUILD    = '.github/workflows/build-apk.yml';
const CLEANUP  = '.github/workflows/cleanup-merged-branches.yml';
const ALL_SLUGS = PEERS;
const BUILD_SHA   = 'b56873cc5c73f964';
const CLEANUP_SHA = '02f214e7cbf41121';
const PRIV = /^(EXPECTED_SHA256=|OUT=)/;
const SHARED_SHA = '7604a64b1efb7457';

const FILE = 'signing/sign-apk.sh';
const t = (c, m) => (c ? pass(m) : fail(m));
const shScript = fs.readFileSync(join(ROOT, FILE), 'utf8');
const sharedOf = (txt) => txt.split('\n').map((l) => (PRIV.test(l) ? '' : l)).join('\n');
const sig = (txt) => crypto.createHash('sha256').update(sharedOf(txt)).digest('hex').slice(0, 16);

/* ── ה. שני הערכים הפרטיים ─────────────────────────────────────────────── */
t(shScript.includes(`OUT="\${2:-${APP.out}}"`),    `א1 · שם הפלט הוא ${APP.out}`);
{
  const m = /EXPECTED_SHA256='([0-9A-F:]{95})'/.exec(shScript);
  t(!!m, 'א2 · ⛔ טביעה מלאה (32 בתים) ולא מציין-מקום');
}
/*  ⛔ הספירה היא הטענה — ⚠️ המפתח עצמו ומה שפותח אותו יצאו
 *  מהעץ, ⭐ ומה שנשאר פרטי הוא הטביעה המוצהרת ושם הפלט: ⛔ ערך שלישי
 *  שיחזור לכאן הוא ערך שאיש לא יבחין בו, והחתימה המשותפת תמשיך לתאום. */
{
  const n = shScript.split('\n').filter((l) => PRIV.test(l)).length;
  t(n === 2, `א3 · ⛔ בדיוק שני ערכים פרטיים בסקריפט — נמדדו ${n}`);
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
/*  ⛔ המוטציות אינן נכתבות לעץ — מוטציה שנכתבת לעץ
 *  שורדת כשלון באמצע הריצה. */
t(sig(shScript.replace('set -e', 'set -eu')) !== SHARED_SHA,
  'ד1 · מוטציה בחלק המשותף מזיזה את החתימה');
t(sig(shScript.replace(`OUT="\${2:-${APP.out}}"`, 'OUT="${2:-other.apk}"')) === SHARED_SHA,
  'ד2 · ⭐ מוטציית-נגד: שינוי שדה פרטי ⛔ אינו מזיז את החתימה');
t(sig(shScript.replace('apksigner verify --print-certs', 'true')) !== SHARED_SHA,
  'ד3 · הסרת אימות התעודה מזיזה את החתימה');

/*  ⚠️ **הרווחים אינם מקופלים כאן, בניגוד לשער שכבת האנדרואיד** —
 *  ב-YAML ההזחה **היא** המבנה, וקיפולה היה הופך שלב שהוזז לתוך `with:`
 *  לשינוי בלתי-נראה. מה שכן מנורמל: סופי שורה, רווחי סוף שורה, ושם
 *  הריפו.                                                               */
const norm = (t, slug = FACTS.slug) =>
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
            'במשהו שאינו שם הריפו. שינוי מכוון = עדכון בכל הריפו ובכל ' +
            'עותקי הבדיקה, באותו סבב');
};
checkSha(`חתימת ${BUILD}`,   buildSrc,   BUILD_SHA);
checkSha(`חתימת ${CLEANUP}`, cleanupSrc, CLEANUP_SHA);

/* ── י. זליגת שם ריפו ───────────────────────────────────────────────────────
 *  ⚠️ החתימה כבר הייתה נופלת על זה, ⛔ אבל בהודעה שאינה אומרת דבר. שם של
 *  ריפו אחר ב-workflow הוא העתקה שלא הושלמה — ה-APK היה נבנה תחת השם
 *  הלא נכון, וזה שווה הודעה מפורשת.                                      */
for (const [label, src] of [[BUILD, buildSrc], [CLEANUP, cleanupSrc]]) {
  const leaked = ALL_SLUGS.filter((s) => s !== FACTS.slug && src.includes(s));
  if (leaked.length) fail(`${label}: שם ריפו זר — ${leaked.join(', ')}`);
  else pass(`${label}: אין זליגת שם ריפו`);
}

/* ── יא. מוטציות ה-workflows ────────────────────────────────────────────────
 *  ⛔ רצות על עותק **בזיכרון** ולא על העץ — הלקח: מוטציה שנכתבת
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
    nb, norm(buildSrc.replace('actions/upload-artifact@v7', 'actions/upload-artifact@v3')), true);
mut('הזחה שהשתנתה מפילה את החתימה — ⛔ הרווחים אינם מקופלים',
    nb, norm(buildSrc.replace('      - name: Upload signed APK', '        - name: Upload signed APK')), true);
mut('בדיקת ה-prefix ב-cleanup מפילה את החתימה כשהיא נפרצת',
    nc, norm(cleanupSrc.replace('claude/*)', '*)')), true);
/* ⭐ ומה שמוכרז פרטי — ⛔ אינו רשאי להזיז אותה. */
/*  ⚠️ המוטציה הזו מדמה **ריפו אחר**, ולכן היא מנרמלת עם הסלאג שלו: זו
 *  בדיוק הטענה שההיפוך נשען עליה — קבצים ששמם שונה נושאים חתימה
 *  אחת.                                                                 */
mut('שם הריפו אינו בחתימה',
    nb, norm(buildSrc.split(FACTS.slug).join('some-other-repo'), 'some-other-repo'), false);
mut('רווח בסוף שורה אינו בחתימה',
    nc, norm(cleanupSrc.replace('\njobs:', '   \njobs:')), false);


/* ── יב. מנגנוני ה-workflows — ⛔ נמדדים, ולא רק זהים ────────────────────────
 *  ⚠️ **הנימוק המדוד**: השורה אכפה **זהות בית-לבית** בלבד, ⛔ וסשן שהיה מסיר
 *  את שני קווי ההגנה היה משאיר קובץ זהה בכולן ⭐ והשער היה עובר: ⚠️ שני
 *  ענפים נמחקו בפועל בעוד שההוראה שניתנה אמרה «אל תמחק», ⛔ וההוראה
 *  והמנגנון סתרו זה את זה בלי שאיש ידע.
 *  ⛔ **והבדיקה היא פונקציה טהורה של הטקסט** — ⚠️ כדי שהמוטציה תרוץ על
 *  עותק בזיכרון, ⭐ ולא על העץ.                                          */
function cleanupGuards(raw) {
  const out = [];
  /*  ⛔ ההערות נחתכות לפני המדידה — ⚠️ ההערה שמעל המנגנון נוקבת בשמו,
   *  ⭐ ומדידה על הטקסט הגולמי הייתה מוצאת אותו גם אחרי שהוסר מהקוד. */
  const txt = raw.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');
  const del = txt.indexOf('push origin --delete');
  if (del < 0) { out.push('אין מסלול מחיקה כלל'); return out; }
  if ((txt.match(/push origin --delete/g) || []).length !== 1)
    out.push('יותר ממסלול מחיקה אחד');
  const pre = txt.indexOf('claude/*)');
  const anc = txt.indexOf('merge-base --is-ancestor');
  if (pre < 0 || pre > del) out.push('תחילית `claude/` חסרה או אינה קודמת למחיקה');
  if (anc < 0 || anc > del) out.push('`--is-ancestor` חסר או אינו קודם למחיקה');
  /*  ⛔ ושתי זרועות בלבד ב-`case` — ⚠️ זה מה שמוכיח ש-`main` אינו מועמד:
   *  ⭐ הוא נופל לזרוע ה-`continue`, ⛔ ואינו מגיע למחיקה כלל. */
  if (!/case\s+"\$branch"\s+in\s+claude\/\*\)\s*;;\s*\*\)\s*continue\s*;;\s*esac/
        .test(txt.replace(/\s+/g, ' ')))
    out.push('`case` שאינו שתי זרועות — claude/* ואז continue');
  return out;
}
/*  ⛔ ו-`build-apk` נבנה משינוי במעטפת ובחתימה בלבד — ⚠️ שינוי web אינו
 *  דורש APK, ⭐ שהמעטפת טוענת את הקוד מהרשת · ⛔ ומסלול החתימה אחד,
 *  ⚠️ שמסלול שני הוא מסלול בלי שער הטביעה. */
function buildGuards(txt) {
  const out = [];
  if (!/paths:/.test(txt)) out.push('אין מסנן נתיבים ל-push');
  for (const p of ["'android/**'", "'signing/**'"])
    if (!txt.includes(p)) out.push(`נתיב שאינו מוצהר בטריגר: ${p}`);
  if (/'index\.html'|'sw\.js'/.test(txt)) out.push('שינוי web מפעיל בנייה');
  if (!/signing\/sign-apk\.sh/.test(txt)) out.push('החתימה אינה עוברת בסקריפט המשותף');
  if (/\bapksigner\s+sign\b|\bkeytool\b/.test(txt)) out.push('מסלול חתימה שני בגוף ה-workflow');
  return out;
}
{
  const cg = cleanupGuards(cleanupSrc), bg = buildGuards(buildSrc);
  t(cg.length === 0, cg.length ? `יב1 · cleanup — ${cg.join(' · ')}`
    : 'יב1 · cleanup נושא את שני קווי ההגנה, ו-main אינו מועמד למחיקה');
  t(bg.length === 0, bg.length ? `יב2 · build-apk — ${bg.join(' · ')}`
    : 'יב2 · build-apk — מסנן הנתיבים ומסלול החתימה האחד מוצהרים');
}
/*  ⛔ מוטציה: הסרת `--is-ancestor` — ⚠️ הטענה שנופלת היא «שני קווי ההגנה». */
t(cleanupGuards(cleanupSrc.replace('git merge-base --is-ancestor "$ref" origin/main', 'true')).length > 0,
  'יב3 · מוטציה: הסרת `--is-ancestor` **מפילה** את «שני קווי ההגנה»');
/*  ⭐ מוטציית-נגד: שם מונה מעטפת שהוחלף בעקביות ⛔ אינו מפיל — ⚠️ המנגנון
 *  לא נגע, ⭐ ורק השם השתנה. */
t(cleanupGuards(cleanupSrc.split('deleted=').join('gone=').split('$deleted').join('$gone')).length === 0,
  'יב4 · ⭐ מוטציית-נגד: שם מונה שהוחלף בעקביות ⛔ **אינו** מפיל');
/*  ⛔ ומוטציה על `build-apk`: נתיב web שנוסף לטריגר — ⚠️ הטענה שנופלת היא
 *  «מסנן הנתיבים». */
t(buildGuards(buildSrc.replace("      - 'signing/**'", "      - 'signing/**'\n      - 'index.html'")).length > 0,
  'יב5 · מוטציה: `index.html` בטריגר **מפילה** את «מסנן הנתיבים»');
t(buildGuards(buildSrc.replace('actions/setup-java@v6', 'actions/setup-java@v6 ')).length === 0,
  'יב6 · ⭐ מוטציית-נגד: רווח בסוף שורה ⛔ **אינו** מפיל את המנגנון');

/* ── יג. מוטציות הזרימה ────────────────────────────────────────────────── */
{
  const rows = tableOf(MD);
  const omLine = MD.split('\n').find((l) => {
    const m = /^\|\s*(\d+)\s*\|/.exec(l);
    const r = m && rows.find((x) => x.n === Number(m[1]));
    return r && r.marks.length && r.marks.every((x) => x === '⭕') && r.note && !/תקציב הזמן/.test(r.note);
  });
  const withNote = (w) => { const c = omLine.split('|'); c[COL_NOTE] = ' ' + w + ' '; return c.join('|'); };
  t(!!omLine && budgetRows(MD.replace(omLine, withNote('⛔ **אינו ניתן לאכיפה** בתקציב הזמן'))).length > budgetRows(MD).length,
    'יג1 · מוטציה: שורה ⭕ שנימוקה «תקציב הזמן» **מפילה** את [flow-budget]');
  t(!!omLine && budgetRows(MD.replace(omLine, withNote('⛔ **אינו ניתן לאכיפה**: ⚠️ נמדד בשימוש בפועל'))).length === budgetRows(MD).length,
    'יג2 · ⭐ מוטציית-נגד: שורה ⭕ שנימוקה «נמדד בשימוש בפועל» ⛔ **אינה** מפילה את [flow-budget]');
  t(flowRowGaps(MD, { ...WF, 'zz-flow.yml': 'on:\n  workflow_dispatch:\njobs:\n  x:\n    steps:\n      - run: node tools/zz.mjs\n' }).length >
    flowRowGaps(MD, WF).length, 'יג3 · מוטציה: זרימה בלי שורה **מפילה** את [flow-row]');
  t(flowTriggers({ ...WF, 'deep-check.yml': (WF['deep-check.yml'] || '').replace('  workflow_dispatch:', "  workflow_dispatch:\n  schedule:\n    - cron: '0 3 * * *'") }).length >
    flowTriggers(WF).length, 'יג4 · מוטציה: `schedule` בזרימה **מפיל** את [flow-dispatch]');
  t(deepLeak((WF['deep-check.yml'] || '').replace('self="${GITHUB_REPOSITORY#*/}"', 'self=' + FACTS.slug)).length >
    deepLeak(WF['deep-check.yml'] || '').length,
    'יג5 · מוטציה: שם ריפו שנכתב בזרימה **מפיל** את [flow-deep]');
  t(usesGaps({ ...WF, 'build-apk.yml': (WF['build-apk.yml'] || '').replace('actions/checkout@v7', 'actions/checkout@v4') }).length >
    usesGaps(WF).length, 'יג6 · מוטציה: `uses:` שחזר לגרסה ישנה **מפיל** את [uses-supported]');
  t(usesGaps({ ...WF, 'build-apk.yml': (WF['build-apk.yml'] || '').replace('actions/checkout@v7', 'actions/checkout@v9') }).length ===
    usesGaps(WF).length, 'יג7 · ⭐ מוטציית-נגד: גרסה שקודמה מעבר לרצפה ⛔ **אינה** מפילה את [uses-supported]');
}

console.log(failures ? `\n❌ ${FACTS.slug}: ${failures} כשלים בשער הבנייה, החתימה וה-workflows`
                     : `\n✅ ${FACTS.slug}: שער הבנייה, החתימה וה-workflows עבר`);
process.exit(failures ? 1 : 0);

#!/usr/bin/env node
/*  שער סקריפט החתימה — סבב 65, כלל ברזל 14.
 *
 *  ⚠️ **הפער שנמדד (סבב 65):** `signing/sign-apk.sh` היה 63 שורות בשלושה
 *  ריפו ו-67 ב-gius, בלי ששום שער השווה ביניהם. ⛔ סקריפט חתימה שנסחף
 *  הוא בדיוק המקום שבו APK נחתם במפתח הלא-נכון — ומשם אין חזרה.
 *
 *  מה נאכף כאן:
 *    א. **ששת השדות הפרטיים** תואמים לבלוק `APP` — keystore, alias,
 *       סיסמה, טביעה, שם הפלט ושתי שורות ההודעה.
 *    ב. **החלק המשותף חתום ב-sha256** — כל השאר זהה בית-לבית ×4.
 *    ג. **שלושת שערי הבטיחות** שבסקריפט קיימים: השוואת הטביעה לפני
 *       החתימה, `apksigner verify --print-certs` אחריה, ו-`set -e`.
 *
 *  הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  keystore: 'schar.keystore',
  alias: 'schar',
  pass: 'schar123',
  out: 'schar-limud.apk',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  החלק המשותף — כל שורה שאינה אחת מששת הפרטיים. ⛔ ההגדרה היא תבנית
 *  **בתחילת שורה** ולא מספר שורה (סבב 65) — מספר שורה נשבר בכל עריכה. */
const PRIV = /^(# Sign an APK with the PERMANENT |KS=|ALIAS=|PASS=|EXPECTED_SHA256=|OUT=|echo "✅ Signed with the permanent )/;
const SHARED_SHA = 'eb0af5fdba30e4e6';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'signing/sign-apk.sh';
let n = 0, bad = 0;
const ok = (m) => { n++; console.log(`  ok   ${m}`); };
const no = (m) => { n++; bad++; console.error(`  FAIL ${m}`); };
const t  = (c, m) => (c ? ok(m) : no(m));

console.log('· ' + APP.app + ' — סבב 65: שער סקריפט החתימה');

const src = fs.readFileSync(join(ROOT, FILE), 'utf8');
const sharedOf = (txt) => txt.split('\n').map((l) => (PRIV.test(l) ? '' : l)).join('\n');
const sig = (txt) => crypto.createHash('sha256').update(sharedOf(txt)).digest('hex').slice(0, 16);

/* ── א. ששת השדות הפרטיים ──────────────────────────────────────────────── */
t(src.includes(`KS="$HERE/${APP.keystore}"`), `א1 · ה-keystore הוא ${APP.keystore}`);
t(src.includes(`ALIAS='${APP.alias}'`),       `א2 · ה-alias הוא ${APP.alias}`);
t(src.includes(`PASS='${APP.pass}'`),         'א3 · הסיסמה תואמת לבלוק APP');
t(src.includes(`OUT="\${2:-${APP.out}}"`),    `א4 · שם הפלט הוא ${APP.out}`);
{
  const m = /EXPECTED_SHA256='([0-9A-F:]{95})'/.exec(src);
  t(!!m, 'א5 · ⛔ טביעה מלאה (32 בתים) ולא מציין-מקום');
}

/* ── ב. החתימה על החלק המשותף ──────────────────────────────────────────── */
t(sig(src) === SHARED_SHA,
  `ב · החלק המשותף זהה לחתימה הקנונית (${sig(src)})`);

/* ── ג. שלושת שערי הבטיחות שבסקריפט ────────────────────────────────────── */
t(/set -e/.test(src),                       'ג1 · `set -e` — שגיאה עוצרת');
t(/apksigner verify --print-certs/.test(src),'ג2 · אימות התעודה אחרי החתימה');
t(src.indexOf('EXPECTED_SHA256') < src.indexOf('apksigner sign'),
  'ג3 · ⛔ הטביעה מושווית **לפני** החתימה ולא אחריה');

/* ── ד. מוטציות ────────────────────────────────────────────────────────── */
/*  ⛔ המוטציות אינן נכתבות לעץ (הלקח של סבב 42ג) — מוטציה שנכתבת לעץ
 *  שורדת כשלון באמצע הריצה. */
t(sig(src.replace('set -e', 'set -eu')) !== SHARED_SHA,
  'ד1 · מוטציה בחלק המשותף מזיזה את החתימה');
t(sig(src.replace(`ALIAS='${APP.alias}'`, "ALIAS='zzz'")) === SHARED_SHA,
  'ד2 · ⭐ מוטציית-נגד: שינוי שדה פרטי ⛔ אינו מזיז את החתימה');
t(sig(src.replace('apksigner verify --print-certs', 'true')) !== SHARED_SHA,
  'ד3 · הסרת אימות התעודה מזיזה את החתימה');

if (bad) { console.error(`\n✗ ${APP.app}: ${n} טענות, ${bad} נכשלו`); process.exit(1); }
console.log(`\n✓ סבב 65 (שער סקריפט החתימה) — ${n} טענות עברו, 0 נכשלו`);

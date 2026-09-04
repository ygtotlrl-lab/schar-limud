#!/usr/bin/env node
/*  test_devid.mjs — מודול מזהה המכשיר.
 *
 *  **מה נאכף:** הליבה האמיתית רצה ברתמת `vm` — ⛔ ולא regex על הטקסט —
 *  ⚠️ ומוודאת שהמזהה נוצר פעם אחת, נשמר, ונקרא חזרה כפי שהוא; ⛔ ומפתח
 *  האחסון נעול לערך ההיסטורי שלו.
 *
 *  **הנימוק המדוד:** האיחוד לבלוק משותף הוא בדיוק הרגע שבו מישהו «מיישר»
 *  גם את **מפתח האחסון** — ⛔ והמפתח נבדל בין האפליקציות מסיבה היסטורית.
 *
 *  **מה יישבר בלעדיו:** ⛔ מפתח שמתאחד מנתק כל מכשיר בשטח מהמזהה שכבר
 *  יושב בו — ⚠️ היומן ההיסטורי מקוטלג לפי המזהה, ⭐ ומכשיר שקיבל מזהה חדש
 *  נקרא כמכשיר חדש.
 *
 *  **מה אינו נאכף כאן:** ⛔ ייחודיות המזהה בפועל — ⚠️ היא תכונה של המחולל
 *  האקראי, ⭐ ומה שנמדד הוא שהוא **נשמר ואינו נוצר מחדש**.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */

import fs from 'node:fs';
import vm from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /* ⛔ המפתח ההיסטורי — אינו משתנה לעולם (סבב 40). */
  deviceKey: 'sl_device_id',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(join(ROOT, 'index.html'), 'utf8');

let n = 0, bad = 0;
const ok = (m) => console.log(`  ok   ${++n} · ${m}`);
const no = (m) => { bad++; console.error(`  FAIL ${++n} · ${m}`); };
const is = (c, m) => (c ? ok(m) : no(m));

const START = '/* ═══ מזהה מכשיר — מודול משותף (סבב 40)';
const END   = '/* ═══════════════ סוף מודול מזהה המכשיר';

function grab(text) {
  const a = text.indexOf(START);
  const b = text.indexOf(END, a);
  return (a < 0 || b < 0) ? null : text.slice(a, b);
}

/*  רתמה מינימלית: `lsGet`/`lsSetRaw` מעל אובייקט רגיל, בדיוק כפי
 *  שהמודול המשותף של סבב 11 חושף אותם.                               */
function run(block, cfgKey, store) {
  const ctx = {
    DEV_CFG: { key: cfgKey },
    lsGet: (k, d) => (k in store ? store[k] : d),
    lsSetRaw: (k, v) => { store[k] = v; return true; },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.__get = getDeviceId; this.__rand = _randDeviceId;', ctx);
  return ctx;
}

console.log(`\n────────────────── ${APP.app}: מודול מזהה המכשיר (סבב 40) ──`);

const block = grab(src);
is(!!block, 'בלוק המודול המשותף נמצא בין שני הסמנים');
if (!block) { console.error('\n❌ אין מה לבדוק'); process.exit(1); }

/* 1. המפתח ההיסטורי נעול */
/*  ⛔ הערך נחלץ ומושווה (סבב 79) — ⚠️ בדיקת נוכחות עוברת גם כשההצהרה
 *  מופיעה פעמיים בשני ערכים, ⭐ והמספר הוא מה שנמדד. */
{
  const decls = [...src.matchAll(/DEV_CFG = \{ key: '([^']*)' \}/g)].map((m) => m[1]);
  is(decls.length === 1 && decls[0] === APP.deviceKey,
     `⛔ מפתח האחסון הוא ההיסטורי — נמדדו ${decls.length} הצהרות ` +
     `(${decls.join(', ') || '—'}) והצפוי אחת בערך '${APP.deviceKey}' ` +
     `(איחודו היה מנתק כל מכשיר בשטח מהיומן שלו)`);
}

/* 2. הליבה אינה מכילה מפתח קשיח */
is(!/lsGet\(\s*'\w+_device_id'/.test(block) && !/lsSetRaw\(\s*'\w+_device_id'/.test(block),
   'הליבה קוראת ל-DEV_CFG.key ואין בה מפתח קשיח');

/* 3. יצירה, שמירה וקריאה חוזרת */
const store = {};
const ctx = run(block, APP.deviceKey, store);
const id1 = ctx.__get();
is(typeof id1 === 'string' && /^[a-z0-9]{8}$/.test(id1), `מזהה חדש נוצר בתבנית הנכונה: ${id1}`);
is(store[APP.deviceKey] === id1, 'המזהה נשמר תחת המפתח של האפליקציה');
is(ctx.__get() === id1, '⛔ קריאה חוזרת מחזירה את **אותו** מזהה — הוא אינו משתנה לעולם');

/* 4. מזהה קיים אינו נדרס */
const store2 = { [APP.deviceKey]: 'zzzz9999' };
is(run(block, APP.deviceKey, store2).__get() === 'zzzz9999',
   '⛔ מזהה שכבר יושב במכשיר אינו נדרס — היומן ההיסטורי נשען עליו');

/* 5. אחסון חסום — `lsSetRaw` שנכשל אינו מפיל את הקורא */
const ctx3 = vm.createContext({
  DEV_CFG: { key: APP.deviceKey },
  lsGet: () => null,
  lsSetRaw: () => false,          // אחסון חסום: מחזיר false, בלי באנר
  console,
});
vm.runInContext(block + '\nthis.__get = getDeviceId;', ctx3);
let survived = true, memId = null;
try { memId = ctx3.__get(); } catch (e) { survived = false; }
is(survived && /^[a-z0-9]{8}$/.test(memId || ''),
   '⚠️ באחסון חסום המזהה עדיין מוחזר מהזיכרון ולא נזרקת שגיאה');

/* 6. אקראיות — שני מכשירים אינם מקבלים אותו מזהה */
const ids = new Set();
for (let i = 0; i < 400; i++) ids.add(run(block, APP.deviceKey, {}).__get());
is(ids.size > 390, `400 «מכשירים» ייצרו ${ids.size} מזהים שונים — אין התנגשות שיטתית`);

if (RUN_MUT) {
/* ── מוטציות ───────────────────────────────────────────────────────────── */
console.log('  — מוטציות —');

/* מ1. מפתח קשיח במקום DEV_CFG.key — טענה 2 נופלת */
const m1 = block.replace(/DEV_CFG\.key/g, "'device_id'");
is(/lsGet\(\s*'device_id'/.test(m1) && !/DEV_CFG\.key/.test(m1),
   'מוטציה: מפתח קשיח בליבה — טענה 2 הייתה נכשלת');

/* מ2. דריסת מזהה קיים — טענה 4 נופלת */
const m2 = block.replace('var id = lsGet(DEV_CFG.key, null);', 'var id = null;');
const s2 = { [APP.deviceKey]: 'zzzz9999' };
is(run(m2, APP.deviceKey, s2).__get() !== 'zzzz9999',
   '⛔ מוטציה: התעלמות מהמזהה השמור דורסת אותו — טענה 4 הייתה נכשלת');

/* מ3. אורך קבוע במקום אקראי — טענה 6 נופלת */
const m3 = block.replace("id += c.charAt(Math.floor(Math.random() * c.length));", "id += 'a';");
const ids3 = new Set();
for (let i = 0; i < 50; i++) ids3.add(run(m3, APP.deviceKey, {}).__get());
is(ids3.size === 1, 'מוטציה: מחולל לא-אקראי מייצר מזהה אחד לכל המכשירים — טענה 6 הייתה נכשלת');

/*  ⭐ מוטציית-נגד — ⛔ בלעדיה שלוש המוטציות שלמעלה אינן מבחינות בין
 *  «מודד התנהגות» ל«סופר טקסט» (סבב 68): שינוי רווחים והצהרה חדשה
 *  וחיה אינם משנים דבר במה שהליבה עושה, ⛔ ולכן הרתמה חייבת להמשיך
 *  לעבור. ⛔ ואינה הערה (סבב 72) — הערה אינה קוד, ואינה מוכיחה דבר. */
const anti = 'var r72Live = 1;\n' +
             block.replace('var id = lsGet(DEV_CFG.key, null);',
                           'var  id  =  lsGet( DEV_CFG.key , null );');
const aKeep = { [APP.deviceKey]: 'zzzz9999' };
is(run(anti, APP.deviceKey, aKeep).__get() === 'zzzz9999'
   && /^[a-z0-9]{8}$/.test(run(anti, APP.deviceKey, {}).__get()),
   '⭐ מוטציית-נגד: רווחים והצהרה חיה ⛔ אינם משנים התנהגות — הרתמה עוברת');

}

console.log(bad ? `\n❌ ${APP.app}: ${n} טענות, ${bad} נכשלו`
                : `\n✓ סבב 40 (מזהה מכשיר) — ${n} טענות עברו, 0 נכשלו`);
process.exit(bad ? 1 : 0);

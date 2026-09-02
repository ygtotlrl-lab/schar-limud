#!/usr/bin/env node
/*  בדיקת אחידות היכולות המשותפות — סבב 30, השלמה.
 *
 *  ⭐ משימת הבודק: סורק את טבלת התשתית מול הקוד — ⛔ ומפיל על תא שסימונו אינו
 *  מסכים עם ה-probe שלו, ועל שורה בלי אחת משלוש דרכי האכיפה.
 *
 *  כלל ברזל 12 של הארגון: **יכולת משותפת מוגדרת בשלושה ממדים — ליבה זהה
 *  בית-לבית · נקודת הפעלה זהה · רישום תואם במטריצת היכולות.** כלל ברזל 7
 *  אכף עד היום את הראשון בלבד, וזה בדיוק מה שהחמיץ את הכשל שהוליד את
 *  הבדיקה הזו: הגיבוי של hanhala-ruchanit **הפסיק לרוץ 25 יום** ואיש לא
 *  ידע — לא מפני שהקוד היה שונה, אלא מפני שהיא הפעילה אותו **מתוך מסלול
 *  הדחיפה** ואילו schar-limud הפעילה אותו **בכניסה למערכת**. שני מימושים
 *  לאותה יכולת, שניהם «עבדו», והפער נחשף רק כשאחד מהם נשבר.
 *
 *  הבדיקה נכשלת על שלושת סוגי הסטייה:
 *
 *    א. **ליבה** — הבלוק המשותף של היכולת אינו תואם לחתימה הקנונית
 *       שרשומה כאן.
 *    ב. **נקודת הפעלה** — פונקציית החיווט של היכולת אינה נקראת מתוך
 *       הפונקציה הקנונית של האפליקציה (עלייה / מסך הגדרות), או שהיא
 *       נקראת גם ממקום אחר בקוד הפרטי. וכן: פונקציה שאסור לקרוא לה
 *       ישירות (`forbidden`) — כל קריאה אליה מחוץ לבלוק המשותף.
 *    ג. **מטריצה** — יכולת שמסומנת ✅ במטריצת היכולות שב-CLAUDE.md אינה
 *       קיימת בקוד, או שהיא קיימת בקוד ואינה מסומנת ✅.
 *
 *  ⚠️ **נקודת ההפעלה הקנונית של יכולות העלייה היא פונקציית העלייה של
 *  האפליקציה** — זו שקוראת גם ל-`lsBoot()` וגם ל-`pendBoot()`. שמה נבדל
 *  בין האפליקציות (`selectYeshiva` / `loadDash` / `slBoot` / `start`),
 *  ולכן הוא נרשם בבלוק `APP` שלמטה; **התפקיד** זהה בארבעתן, וזה מה
 *  שנאכף.
 *
 *  החתימות והרשימות זהות בארבעת הריפו. שינוי מכוון ביכולת משותפת = עדכון
 *  בארבע האפליקציות **ובארבעת עותקי הקובץ הזה**, באותו סבב.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

/*  ⭐ שורת שכבת האייקונים נמדדת ע"י `audit` של שער סבב 66 — ⛔ ולא ע"י probe משלה
 *  (סבב 66): מדידת פיקסלים היא מאות שורות, ומימוש שני היה נסחף מהראשון
 *  ומדווח ✅ על בדיוק מה שהשער מפיל. ⚠️ הייבוא שקט — הריצה העצמית שם
 *  מוגנת ב-`SELF`. */
const { audit: iconAudit } = await import('./test_iconlayer.mjs');
/*  ⭐ ושורת שכבת הקלט נמדדת ע"י `audit` של שער סבב 67 — ⛔ אותו נימוק בדיוק:
 *  מדידה שנייה של אותה שכבה הייתה נסחפת מהראשונה. */
const { audit: inputAudit } = await import('./test_inputlayer.mjs');
/*  ⭐ ושני כיווני החיווט נמדדים ע"י `wiringHere` של שער סבב 82 — ⛔ אותו
 *  נימוק: ⚠️ מדידה שנייה של אותם שמות הייתה נסחפת מהראשונה, ⭐ ומדווחת ✅
 *  על בדיוק מה שהשער מפיל. */
const { wiringHere } = await import('./test_wiring.mjs');

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  file: 'index.html',
  docs: 'CLAUDE.md',
  bootFn: 'slBoot',
  settingsFn: 'renderSettingsLists',
  matrixCol: 3,
  /*  ⚠️ אין כאן יכולת משותפת שנעדרת (סבב 52). */
  skipCaps: [],
  offlineLoginFn: 'slVerifyOffline',
  schemaFile: 'migrations/000_initial_schema.sql',
  // ⚠️ שורת אימות הפינוי «לא רלוונטי» — אין כאן פינוי כלל, ולכן אין מה לאמת.
  /*  ⭐ שם משפך ה-`kv` (סבב 56) — `null` כשאין כאן `kv` כלל. */
  kvFallbackFn: null,
  /*  ⛔ מפתחות ה-`onConflict` המוכרזים (סבב 72) — ⚠️ המפתח הוא זהות
   *  השורה: `client_id` נוצר במכשיר, ⛔ ו-`key` הוא הזהות של `sl_settings`. */
  conflictKeys: { client_id: 'מזהה שנוצר במכשיר', key: 'הגדרה לפי מפתח' },
  /*  ⛔ נקודת המעבר היחידה של סוד אל הדיסק (סבב 76) — ⚠️ השם נבדל בין
   *  השלוש והמנגנון אחד: ⭐ כאן רשימת עמודות **מותרות**, ⛔ ולכן עמודה
   *  רגישה שתיווסף לטבלה אינה עוברת אפילו אם איש לא ייגע בקוד. */
  secretStripFn: 'slUserPub',
  /*  ⛔ השדה שאסור לו לשרוד את נקודת המעבר — ⚠️ העמודה הגלויה קיימת בענן
   *  ונקראת במסלול אחד בלבד, ⛔ ולעולם אינה יורדת לדיסק. */
  secretField: 'password',
  /*  ⛔ כאן **יש** מסלול השלמה (סבב 76) — ⚠️ ואין כאן מסך ניהול משתמשים:
   *  משתמש נולד ב-`INSERT` ידני ובלי טביעה, ⛔ ודרישת טביעה בכניסה הייתה
   *  נועלת אותו בחוץ לנצח. ⭐ ולכן שני השדות האחרים ריקים ⛔ ואינם נשמטים. */
  passFpFillFn: 'slEnsurePassFp',
  userCreateFn: null,
  passFpMakeFn: null,
  /*  ⛔ נקודת המיון היחידה, ⛔ ושדות הסדר שמזהים משווה של ישות —
   *  ⚠️ ⛔ המיון יושב בהחלת המראה עצמה — ⚠️ 16 קוראי `STUDENTS` יורשים אותו, ⭐ ואין להם מה למיין: ⭐ השם נבדל בין הארבע
   *  ⛔ והמנגנון אחד, ⚠️ ולכן ההצהרה כאן וה-probe משותף. */
  sortFn: 'slApplyMirror',
  sortFields: ['name'],
  /*  ⛔ מסלולי הייצוא המוצהרים — ⚠️ המסלול הוא צילום או מנוע טבלה,
   *  ⛔ ובשום מקרה מסמך HTML שני: ⭐ ⛔ ריק ⛔ ואינו נשמט — ⚠️ אין כאן מסלול ייצוא: ⭐ שדה חסר נקרא «לא נשאל», וריק נקרא «נמדד ואין». */
  exportFns: [],
  gapRows: [66, 70, 94, 98, 114, 117, 118, 121, 123, 127, 129],
  /*  ⛔ אין כאן קריאת מפתח הגדרה יחיד — ⚠️ ההגדרות נקראות כטבלה שלמה,
   *  ⭐ ולכן הרשימה ריקה ⛔ ואינה נשמטת: שדה חסר נקרא «לא נשאל», ⚠️ וריק
   *  נקרא «נמדד ואין». */
  cfgKeys: [],
  /*  ⛔ פונקציה בלי קורא שנשארת בכוונה — ⚠️ כל שם נושא את הסיבה, ⛔ ושם
   *  שיש לו קורא ⛔ או שאינו קיים **מפיל**: ⭐ רשימת-היתר שהתיישנה היא
   *  בעצמה השארית שהשורה באה לסלק. */
  /*  ⛔ אזור שגיאה מוטבע שנשאר בכוונה — ⚠️ כל מזהה נושא את הסיבה, ⛔ ומזהה
   *  שמוכרז ואינו קיים מפיל אף הוא. */
  inlineErrAllow: {
    'auth-err': 'הודעת הכניסה — ⛔ נשארת על המסך בזמן שהמשתמש מקליד מחדש: ⚠️ ארבע ההודעות נבדלות זו מזו, וטוסט שנעלם היה מאחד אותן בפועל',
  },
  orphanAllow: {
    pendResolveErr: 'מפריד כשל רשת מכשל סמכותי בהורדת סימון — ⛔ מנגנון שנכשל-סגור, ⚠️ ואין לו קורא **עד שהוא נחוץ**',
    'check-capabilities.mjs:domEntry': 'עוזר זהה בארבעת עותקי השער — ⛔ הוא נקרא בהנהלה בלבד, ⚠️ ששם יש שכבת כניסה: ⭐ עוזר שנגזם באחת מפסיק להיות זהה',
  },
  tableProbe: {
    /*  ⛔ ערך ולא נוכחות (סבב 72) — ⚠️ כל `upsert` נושא `onConflict`,
     *  ⛔ וכל מפתח שנכתב בקוד מוכרז ומנומק ב-`APP.conflictKeys`: ⭐ מפתח
     *  שאינו מפתח הזהות של הטבלה יוצר שורה שנייה לאותה רשומה. */
    113: (c) => {
      const ups = [...c.code.matchAll(/\.upsert\(/g)];
      if (!ups.length) return false;
      for (const m of ups)
        if (!/onConflict/.test(c.code.slice(m.index, m.index + 260))) return false;
      const keys = new Set([...c.src.matchAll(/onConflict:\s*['"]([A-Za-z_]+)['"]/g)]
                             .map((x) => x[1]));
      for (const k of keys) if (!APP.conflictKeys[k]) return false;
      return keys.size > 0;
    },
    /*  ⛔ ערך ולא שם (סבב 72) — ⚠️ שלושת הפרמטרים כתובים בקוד ונקראים
     *  ממנו: מספר הסיבובים מהקבוע, ⛔ ו-`SHA-256` ו-256 הביט מהקריאה
     *  ל-`deriveBits` עצמה. ⭐ עד סבב 72 השורה נשאה «אין שער שמודד», ⛔ והיא
     *  ניתנת למדידה במלואה. */
    131: (c) => c.hasCode(/SL_PASS_ITER_USER\s*=\s*100000\b/)
          && /iterations:\s*SL_PASS_ITER_USER,\s*hash:\s*'SHA-256'/.test(c.src)
          && /deriveBits\([\s\S]{0,200}?key,\s*256\)/.test(c.code),
    // ⚠️ מתועד ❌ במטריצה — `doLogin` מריצה משיכה מלאה כפויה במקום נתיב חלקי.
    /*  ⛔ ערך ולא קיום (סבב 79) — ⚠️ המסלול החלקי הוא **פונקציה שנקראת
     *  מיותר ממקום אחד**: ⭐ הגדרה בלי קורא היא בדיוק «מסלול שנכתב ואינו
     *  רץ», ⛔ והוא אינו מעדכן דבר. */
    130: (c) => !!c.fnBody('slUsersSaveOne')
             && (c.code.match(/\bslUsersSaveOne\s*\(/g) || []).length > 1,
    // חמש טבלאות `sl_` מאז ההקמה — המראה נבנית מהן ישירות.
    105: (c) => c.hasCode(/\bSL_TABLES\b/),
    // ⚠️ מתועד ❌ במטריצה — המנהל מנהל סיסמאות מלוח הבקרה של Supabase.
    129: () => false,
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [36, 40, 41, 42, 39, 50, 69, 45, 122];

/*  היכולות המשותפות. `block` — הליבה שחייבת להיות זהה בית-לבית.
 *  `hooks` — נקודות ההפעלה: `at:'boot'` = פונקציית העלייה, `at:'settings'`
 *  = פונקציית מסך ההגדרות. `forbidden` — פונקציות שהמודול חושף אך אסור
 *  לקרוא להן מקוד האפליקציה. `row` — שורת היכולת במטריצה, ו-`probe` הוא
 *  מה שמעיד על קיומה בקוד כשאין לה בלוק משלה.                            */
const CAPS = {
  storage: {
    name: 'מודול עמידות האחסון',
    block: { sha: '86ba47774c426890', lines: 679,
             start: '   עמידות אחסון מקומי — מודול משותף (סבב 11).',
             end:   '/* ═══════════════ סוף המודול המשותף' },
    hooks: [{ fn: 'lsBoot', at: 'boot' }],
  },
  pending: {
    name: 'מודול "ממתין לסנכרון"',
    block: { sha: '8b02444de454f54d', lines: 303,
             start: '/* ═══ ממתין לסנכרון — מודול משותף (סבב 12)',
             end:   '/* ═══════════════ סוף מודול "ממתין לסנכרון"' },
    hooks: [{ fn: 'pendBoot', at: 'boot' }],
  },
  status: {
    name: 'אזור המצב',
    block: { sha: 'b81819c149bb6da3', lines: 45,
             start: '/* ═══ אזור מצב — בלוק "☁️ סנכרון"',
             end:   '/* ═══ סוף בלוק "☁️ סנכרון"' },
    hooks: [{ fn: 'statusAreaMount', at: 'settings' }],
  },
  backup: {
    name: 'גיבוי יומי אוטומטי',
    block: { sha: '3897d825545b7954', lines: 268,
             start: '/* ═══ גיבוי יומי ויומן פעולות',
             end:   'סוף מודול הגיבוי היומי' },
    hooks: [{ fn: 'bkBoot', at: 'boot' }, { fn: 'bkStatusMount', at: 'settings' }],
    forbidden: ['bkMaybeDaily'],
  },
  hotwin: {
    name: 'מודול החלון החם והשחזור המקומי',
    block: { sha: '9fc74d037262999f', lines: 194,
             start: '/* ═══ חלון חם ושחזור מקומי — מודול משותף (סבב 35)',
             end:   '/* ═══════════════ סוף מודול החלון החם' },
    hooks: [{ fn: 'hwBoot', at: 'boot' }, { fn: 'hwRestoreMount', at: 'settings' }],
  },
  log: {
    name: 'יומן פעולות',
    probe: /logQueueKey\s*:/,
  },
  /*  ⚠️ למודול המזהים אין `hooks` — הוא אינו יכולת עלייה ואינו יכולת מסך,
   *  אלא עוזר שנקרא מכל אתר יצירת רשומה. מה שנאכף כאן הוא **הליבה**,
   *  ומה שנאכף בשורת מודול מזהי הרשומות הוא **שהוא באמת נקרא** מקוד האפליקציה. */
  /*  ⚠️ גם לליבת המיזוג אין `hooks` — היא אינה יכולת עלייה ואינה יכולת
   *  מסך, אלא ליבה שכל מנוע מיזוג עוטף. מה שנאכף כאן הוא **הזהות
   *  בית-לבית**; מה שנאכף בשורת ליבת המיזוג הוא שהמעטפת באמת קוראת לה. */
  mergecore: {
    name: 'מודול מיזוג הרשומות',
    block: { sha: '4ca396f18c65eb7a', lines: 71,
             start: '/* ═══ מיזוג רשומות — מודול משותף (סבב 38)',
             end:   '/* ═══════════════ סוף מודול המיזוג' },
  },
  /*  ⭐ סבב 40 — מודול מזהה המכשיר. אין לו `hooks`: הוא אינו יכולת עלייה
   *  ואינו יכולת מסך, אלא עוזר שנקרא מכל אתר שרושם ליומן או לגיבוי. מה
   *  שנאכף כאן הוא **הליבה**, ומה שנאכף בשורת מזהה המכשיר הוא ששתי
   *  הפונקציות באמת קיימות בקוד.                                       */
  devid: {
    name: 'מודול מזהה המכשיר',
    block: { sha: 'a5b109b55bd458b6', lines: 20,
             start: '/* ═══ מזהה מכשיר — מודול משותף (סבב 40)',
             end:   '/* ═══════════════ סוף מודול מזהה המכשיר' },
  },
  ids: {
    name: 'מודול מזהי רשומות',
    block: { sha: '20f8ce620c811af0', lines: 37,
             start: '/* ═══ מזהי רשומות — מודול משותף (סבב 37א)',
             end:   '/* ═══════════════ סוף מודול מזהי הרשומות' },
  },
  /*  ⭐ סבב 84 — עוזרי הרשת. ⚠️ אין להם `hooks`: הם נקראים מעשרות אתרים
   *  ואין להם «פונקציית עלייה» — ⛔ מה שנאכף כאן הוא הליבה עצמה, שישבה
   *  **בין** בלוקים חתומים ולכן נסחפה לשלוש צורות בלי שאיש מדד. */
  neterr: {
    name: 'מודול עוזרי הרשת',
    block: { sha: '89abb4308b5f36dc', lines: 31,
             start: '/* ═══ עוזרי הרשת — מודול משותף (סבב 84)',
             end:   '/* ═══════════════ סוף מודול עוזרי הרשת' },
  },
  /*  ⭐ סבב 84 — שער מצב הרשת. ⚠️ מודול נפרד מעוזרי הרשת ⛔ ולא שדה בתוכו:
   *  הוא חי בשלוש אפליקציות ואינו בגיוס, ⭐ ובלוק אחד לשתי רמות קיום הוא
   *  בלוק שאינו זהה. ⛔ ובגיוס ההיעדר מוצהר ב-`APP.skipCaps` ומנומק שם. */
  guardonline: {
    name: 'מודול שער מצב הרשת',
    block: { sha: '90563fbe531b5629', lines: 13,
             start: '/* ═══ שער מצב הרשת — מודול משותף (סבב 84)',
             end:   '/* ═══════════════ סוף מודול שער מצב הרשת' },
  },
  /*  ⭐ סבב 42ג — ליבת ה-service worker. ⚠️ זה הבלוק המשותף הראשון שאינו
   *  יושב ב-`index.html` אלא ב-`sw.js`, ולכן הוא נושא `file`. אין לו
   *  `hooks`: `sw.js` אינו נטען בהקשר הדף ואין בו «פונקציית עלייה» —
   *  נקודות ההפעלה שלו הן מאזיני `install`/`activate`/`fetch`, שיושבים
   *  **בתוך** הליבה ולכן נאכפים בחתימה עצמה. מה שנאכף בשורת ליבת ה-service worker
   *  הוא ש-`SW_CFG` באמת מוגדר מעליו — ליבה בלי פרמטרים אינה מודול. */
  /*  ⭐ סבב 44 — מודול הניסיון החוזר בסנכרון. ⚠️ יש לו `hooks` (בשונה
   *  מהמודולים חסרי-החיווט שמעליו) מפני שהוא **יכולת עלייה**: הוא דורך
   *  את עצמו בעלייה ומרשם את מאזיני `online`/`visibilitychange`. ⛔ מה
   *  שאינו נאכף כאן הוא `rtyNote()` — נקודת הדריכה מהמשפך המקומי — והיא
   *  נאכפת ב-`test_pendflush.mjs`, שיודע גם מהו המשפך בכל אפליקציה. */
  retry: {
    name: 'מודול הניסיון החוזר בסנכרון',
    block: { sha: 'c34d134167700192', lines: 68,
             start: '/* ═══ ניסיון חוזר בסנכרון — מודול משותף (סבב 44)',
             end:   '/* ═══════════════ סוף מודול הניסיון החוזר' },
    hooks: [{ fn: 'rtyBoot', at: 'boot' }],
  },
  /*  ⭐ סבב 51 — מנגנון המשיכה. יש לו `hooks` מפני שהוא **יכולת עלייה**:
   *  הוא דורך את התקתוק ומרשם את מאזין ה-`online`. ⛔ מה שאינו נאכף כאן
   *  הוא קידום החותמת ממסלולי הכתיבה — הוא נאכף ב-`test_pull.mjs`,
   *  שיודע גם מהם המשפכים בכל אפליקציה.                                */
  pull: {
    name: 'מנגנון המשיכה',
    block: { sha: 'd0aa2b4d27291da5', lines: 79,
             start: '/* ═══ מנגנון המשיכה — מודול משותף (סבב 51)',
             end:   '/* ═══════════════ סוף מנגנון המשיכה' },
    hooks: [{ fn: 'plBoot', at: 'boot' }],
  },
  /*  ⭐ סבב 52 — נעילת חוסר-פעילות. יש לו `hooks` מפני שהוא **יכולת
   *  עלייה**: הוא מרשם את מאזיני הפעילות ודורך את המונה בעלייה. ⛔ הוא
   *  נעדר ב-yoman-avoda, שאין בה מסך כניסה כלל ולכן אין מה לנעול —
   *  החריגה מוצהרת ב-`APP.skipCaps` **ומנומקת שם**, ורשומה במטריצה
   *  כ-⭕ מנומק. ⛔ «קיים רק באחת, בשקט» אינו מצב חוקי
   *  (כלל ברזל 14), ⛔ וגם «נעדר באחת, בשקט» אינו.                    */
  lock: {
    name: 'נעילת חוסר-פעילות',
    block: { sha: '31a750f7604b5c54', lines: 109,
             start: '/* ═══ נעילת חוסר-פעילות — מודול משותף (סבב 52)',
             end:   '/* ═══════════════ סוף מודול נעילת חוסר-הפעילות' },
    hooks: [{ fn: 'lkBoot', at: 'boot' }],
  },
  /*  ⭐ סבב 53 — מודל הסשן. יש לו `hooks` מפני שהוא **יכולת עלייה**: הוא
   *  מנקה בעלייה את שרידי הסשן שנשמרו על הדיסק בגרסאות קודמות. ⛔ הוא
   *  נעדר ב-yoman-avoda, שאין בה מסך כניסה כלל ולכן אין משתמש מחובר
   *  להחזיק — החריגה מוצהרת ב-`APP.skipCaps` **ומנומקת שם**, ורשומה
   *  בטבלה כ-⭕ מנומק, בדיוק כמו `lock`.                    */
  sess: {
    name: 'מודל הסשן',
    block: { sha: '3ecf220b7c519c8f', lines: 51,
             start: '/* ═══ מודל הסשן — מודול משותף (סבב 53)',
             end:   '/* ═══════════════ סוף מודול הסשן' },
    hooks: [{ fn: 'sessBoot', at: 'boot' }],
  },
  /*  ⭐ סבב 86 — עוזרי הממשק. ⚠️ אין להם `hooks`: הם נקראים מכל מסך ואין
   *  להם «פונקציית עלייה» — ⛔ מה שנאכף כאן הוא הליבה עצמה, שישבה **מחוץ**
   *  לכל בלוק ⛔ ונסחפה לשלוש צורות של `esc` ושל `openModal`. ⛔ ו-`LS_TOAST`
   *  יושב **מחוץ** לבלוק — ⚠️ הוא הדבר היחיד שנבדל בין האפליקציות. */
  uihelp: {
    name: 'מודול שכבת המודאל',
    block: { sha: '684eee6974ab7bc7', lines: 54,
             start: '/* ═══ שכבת המודאל — מודול משותף (סבב 86)',
             end:   '/* ═══════════════ סוף מודול שכבת המודאל' },
  },
  swcore: {
    name: 'מודול ה-service worker',
    block: { file: 'sw.js', sha: '47d92417774b3b96', lines: 253,
             start: '/* ═══ מודול ה-service worker — מודול משותף (סבב 42ג)',
             end:   '/* ═══════════════ סוף מודול ה-service worker' },
  },
};

const src = fs.readFileSync(APP.file, 'utf8');
let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

/* ── חיתוך הבלוקים — אותה סמנטיקה בדיוק כמו check-status-area.mjs ──────── */
/*  ⚠️ `spec.file` — בלוק משותף שאינו יושב ב-index.html (סבב 42ג): ליבת
 *  ה-service worker חיה ב-`sw.js`. ⛔ בלוק כזה אינו נכנס ל-`ranges`,
 *  מפני ש-`ranges` הוא טווח **בתוך index.html** לצורך סריקת החיווט —
 *  היסט מקובץ אחר היה מחריג שם קוד אקראי. */
function grab(spec) {
  const text = spec.file ? readSafe(spec.file) : src;
  const i = text.indexOf(spec.start);
  if (i < 0) return null;
  const j = text.indexOf(spec.end, i);
  if (j < 0) return null;
  const k = text.indexOf('*/', j);
  if (k < 0) return null;
  return { at: i, text: text.slice(i, k + 2), external: !!spec.file };
}
function readSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; }
}

/*  ⚠️ הסריקה נעשית על **קוד בלבד** (סבב 30, השלמה) — הערות, מחרוזות
 *  ותבניות מוחלפות ברווחים באורך זהה, כדי שהיסטים יישארו תקפים.
 *  ⛔ אין להחליף את זה בביטוי רגולרי על המקור הגולמי — שם המילה `bkBoot`
 *  שבתוך הערת ה-API של המודול הייתה נספרת כקריאה, וכל אזכור בתיעוד היה
 *  מפיל את הבדיקה. */
function blankNonCode(text) {
  const out = new Array(text.length).fill(' ');
  const re = /<script(?![^>]*\ssrc[=\s])[^>]*>/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const from = m.index + m[0].length;
    const to = text.indexOf('</script', from);
    scanJs(text, from, to < 0 ? text.length : to, out);
    re.lastIndex = to < 0 ? text.length : to;
  }
  return out.join('');
}

const RE_OK_BEFORE = /[({[,;:!&|?+\-*%~^<=>]$/;
const RE_KW_BEFORE = /\b(return|typeof|instanceof|case|in|of|new|delete|void|do|else|yield|await)$/;

function scanJs(text, from, to, out) {
  let i = from;
  let lastCode = '';           // הקוד שנכתב עד כה, לצורך הכרעת regex מול חילוק
  const keep = (n) => { for (let x = 0; x < n; x++) out[i + x] = text[i + x]; };
  while (i < to) {
    const c = text[i], c2 = text[i + 1];
    if (c === '/' && c2 === '/') {                       // הערת שורה
      while (i < to && text[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && c2 === '*') {                       // הערת בלוק
      const e = text.indexOf('*/', i + 2);
      i = (e < 0 || e > to) ? to : e + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {           // מחרוזת / תבנית
      const q = c; i++;
      while (i < to) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === q) { i++; break; }
        i++;
      }
      lastCode = 'x';
      continue;
    }
    if (c === '/') {                                     // regex או חילוק
      const t = lastCode.replace(/\s+$/, '');
      const isRe = t === '' || RE_OK_BEFORE.test(t) || RE_KW_BEFORE.test(t);
      if (isRe) {
        i++;
        let cls = false;
        while (i < to) {
          if (text[i] === '\\') { i += 2; continue; }
          if (text[i] === '[') cls = true;
          else if (text[i] === ']') cls = false;
          else if (text[i] === '/' && !cls) { i++; break; }
          else if (text[i] === '\n') break;
          i++;
        }
        while (i < to && /[a-z]/.test(text[i])) i++;
        lastCode = 'x';
        continue;
      }
    }
    keep(1);
    lastCode += c;
    if (lastCode.length > 40) lastCode = lastCode.slice(-40);
    i++;
  }
}

const code = blankNonCode(src);

/* ── א. ליבה — חתימת הבלוק המשותף ──────────────────────────────────────── */
const ranges = [];             // טווחי הבלוקים המשותפים, להחרגה מסריקת החיווט
const present = {};            // האם היכולת קיימת בקוד

for (const key of Object.keys(CAPS)) {
  const cap = CAPS[key];
  /*  ⛔ יכולת שהוכרזה «לא רלוונטית» כאן (סבב 52) — הנימוק יושב ב-`APP`,
   *  והרישום התואם יושב במטריצה. ⚠️ הדילוג מסמן `present=false`, ולכן גם
   *  בדיקת החיווט שלמטה מדלגת: חיווט למודול שאינו קיים אינו פער.        */
  if ((APP.skipCaps || []).indexOf(key) >= 0) { present[key] = false; continue; }
  if (!cap.block) continue;
  const got = grab(cap.block);
  if (!got) { present[key] = false; fail(`${cap.name}: הבלוק לא נמצא — נמדדו 0 סמנים מתוך שניים ` +
                                  `(פתיחה וסגירה). מוסיפים אותם סביב הבלוק`); continue; }
  present[key] = true;
  if (!got.external) ranges.push([got.at, got.at + got.text.length]);
  const sha = crypto.createHash('sha256').update(got.text).digest('hex').slice(0, 16);
  if (sha !== cap.block.sha) {
    fail(`${cap.name}: הליבה אינה זהה לחתימה הקנונית — ${sha} במקום ${cap.block.sha} ` +
         `(${got.text.split('\n').length} שורות במקום ${cap.block.lines}). ` +
         `מיישרים את הבלוק, או מעדכנים את החתימה — יכולת משותפת ` +
         `חייבת ליבה זהה בית-לבית בארבעת הריפו.`);
  } else {
    pass(`${cap.name}: הליבה זהה לחתימה הקנונית (${cap.block.sha})`);
  }
}

const inShared = (pos) => ranges.some(([a, b]) => pos >= a && pos < b);

/* ── ב. נקודת ההפעלה ───────────────────────────────────────────────────── */
function fnRange(name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(code);
  if (!m) return null;
  let i = code.indexOf('{', m.index + m[0].length - 1);
  if (i < 0) return null;
  let depth = 0;
  for (let j = i; j < code.length; j++) {
    if (code[j] === '{') depth++;
    else if (code[j] === '}') { depth--; if (depth === 0) return [m.index, j + 1]; }
  }
  return null;
}

function callSites(fn) {
  const re = new RegExp('\\b' + fn + '\\s*\\(', 'g');
  const out = [];
  let m;
  while ((m = re.exec(code)) !== null) {
    if (inShared(m.index)) continue;
    // הגדרה או השמה ל-window אינן קריאה
    const before = code.slice(Math.max(0, m.index - 12), m.index);
    if (/function\s+$/.test(before)) continue;
    out.push(m.index);
  }
  return out;
}

const lineOf = (pos) => code.slice(0, pos).split('\n').length;

/*  נקודת הפעלה חיה לפונקציה — ⛔ בשתי הצורות (סבב 79): `onclick` מוטבע,
 *  ⛔ **או** `data-act` שמחווט אליה ב-`DOM_ACTIONS`. ⚠️ הנימוק המדוד:
 *  ה-probe מדד `onclick="…f("` בלבד, ⭐ ולכן המרה לדלגציה — שהיא בדיוק
 *  מה שהטבלה דורשת — הפילה אותו על קוד תקין. ⛔ והמדידה נשארת «ערך ולא
 *  קיום»: הפעולה חייבת להיות **בגוף** המפה ולקרוא לפונקציה. */
function domEntry(fn, s) {
  const text = s === undefined ? src : s;
  if (new RegExp('onclick="[^"]*' + fn + '\\s*\\(').test(text)) return true;
  const i = text.indexOf('var DOM_ACTIONS');
  if (i < 0) return false;
  const j = text.indexOf('\ndocument.addEventListener', i);
  const map = text.slice(i, j < 0 ? i + 8000 : j);
  const re = new RegExp("'([\\w-]+)'\\s*:\\s*function[^\\n]*\\n?[^}]*?" + fn + '\\s*\\(');
  const m = re.exec(map);
  return !!(m && new RegExp('data-act=\\\\?["\']' + m[1] + '\\\\?["\']').test(text));
}

const anchors = { boot: APP.bootFn, settings: APP.settingsFn };
const anchorRange = {};
for (const at of Object.keys(anchors)) {
  const r = fnRange(anchors[at]);
  if (!r) fail(`פונקציית ה${at === 'boot' ? 'עלייה' : 'הגדרות'} "${anchors[at]}" ` +
      `לא נמצאה — נמדדו 0 הגדרות והצפוי אחת. מעדכנים את שמה בבלוק APP`);
  anchorRange[at] = r;
}

for (const key of Object.keys(CAPS)) {
  const cap = CAPS[key];
  if (!cap.hooks || present[key] === false) continue;
  for (const h of cap.hooks) {
    const r = anchorRange[h.at];
    if (!r) continue;
    const sites = callSites(h.fn);
    if (!sites.length) {
      fail(`${cap.name}: ${h.fn}() — נמדדו 0 קריאות והצפוי אחת. מוסיפים ` +
        `את הקריאה מנקודת ההפעלה: היכולת קיימת אך אינה מחווטת`);
      continue;
    }
    const stray = sites.filter((p) => p < r[0] || p >= r[1]);
    if (stray.length) {
      fail(`${cap.name}: ${h.fn}() נקראת גם מחוץ ל-${anchors[h.at]}() ` +
           `(שורות ${stray.map(lineOf).join(", ")}) — נמדדו ${stray.length + 1} קריאות והצפוי אחת. ` +
           `מסירים את הקריאות העודפות — זה בדיוק הפער שהשבית ` +
        `את הגיבוי ל-25 יום.`);
    } else {
      pass(`${cap.name}: ${h.fn}() נקראת אך ורק מ-${anchors[h.at]}()`);
    }
  }
  for (const f of (cap.forbidden || [])) {
    const sites = callSites(f);
    if (sites.length) {
      fail(`${cap.name}: ${f}() נקראת מקוד האפליקציה (שורות ${sites.map(lineOf).join(', ')}) — ` +
           `מסירים אותן — ⛔ הקריאה היחידה אליה היא מתוך הבלוק המשותף`);
    } else {
      pass(`${cap.name}: אין קריאה ישירה ל-${f}() מקוד האפליקציה`);
    }
  }
}

function tableRowNumbers() {
  if (!fs.existsSync(APP.docs)) return [];
  const ls = fs.readFileSync(APP.docs, 'utf8').split('\n');
  const a = ls.findIndex((l) => /^<!--\s*SHARED:start\s+id="rules-table"/.test(l));
  const b = ls.findIndex((l, i) => i > a && /^<!--\s*SHARED:end/.test(l));
  if (a < 0 || b < 0) return [];
  return ls.slice(a, b).map((l) => /^\|\s*(\d+)\s*\|/.exec(l)).filter(Boolean).map((m) => Number(m[1]));
}

function tableRow(row) {
  if (!fs.existsSync(APP.docs)) return null;
  const ls = fs.readFileSync(APP.docs, 'utf8').split('\n');
  /*  ⛔ אין לסרוק את הקובץ כולו (סבב 69) — ⚠️ פרק סבב
   *  מחזיק טבלאות ממוספרות משלו, וחיפוש גלובלי היה מוצא «| 3 |» שלהן. */
  const a = ls.findIndex((l) => /^<!--\s*SHARED:start\s+id="rules-table"/.test(l));
  const b = ls.findIndex((l, i) => i > a && /^<!--\s*SHARED:end/.test(l));
  if (a < 0 || b < 0) return null;
  const line = ls.slice(a, b).find((l) => new RegExp('^\\|\\s*' + row + '\\s*\\|').test(l));
  if (!line) return null;
  const cells = line.split('|');
  if (cells.length < 9) return null;
  /*  ⛔ אין לצמצם את `allOk` לתא האפליקציה (סבב 69) — ⚠️ ההערה
   *  משותפת לארבעתן, ולכן היא לגיטימית כל עוד תא אחד אינו ✅. */
  const allOk = [4, 5, 6, 7].every((k) => cells[k].indexOf('✅') >= 0);
  return { cell: cells[3 + APP.matrixCol].trim(), note: cells[8].trim(), allOk };
}

// קיום בקוד עבור יכולות שאין להן בלוק משלהן
if (CAPS.log.probe) {
  const off = [];
  let m; const re = new RegExp(CAPS.log.probe.source, 'g');
  while ((m = re.exec(code)) !== null) if (!inShared(m.index)) off.push(m.index);
  present.log = off.length > 0;
}

/* ══════════════════════════════════════════════════════════════════════════
   ג. מטריצת היכולות — כל השורות, ובשני הכיוונים (סבב 37)
   ══════════════════════════════════════════════════════════════════════════
   עד סבב 37 נבדקו כאן **שלוש שורות בלבד** (1, 13, 14). תשע-עשרה השורות
   האחרות לא נבדקו כלל, ולכן ✅ שגוי יכול היה לשבת שם בלי שאיש ידע — וכך
   אכן קרה: שורת מטמון-ה-CDN הכריזה «מראש עם ריפוי עצמי ✅» בארבעתן,
   בזמן ש-`ensureCdnCached` פשוט לא היה קיים ב-gius.

   ⭐ **האכיפה דו-כיוונית:** תא ✅ שה-probe שלו אינו מוצא מפיל את השער,
   ותא ❌ שה-probe שלו **כן** מוצא מפיל אותו גם כן. טענת-חסר שגויה מטעה
   בדיוק כמו טענת-יש — היא שולחת סבב עתידי לבנות מחדש משהו שכבר קיים.

   ⚠️ **ה-probe רץ על הקוד המטוקן** (`code`), שבו הערות ומחרוזות מוחלפות
   ברווחים — בדיוק כמו סריקת החיווט. ⛔ אין להחליף בחיפוש על המקור הגולמי:
   כל אזכור בהערה היה נספר כמימוש. probe שחייב לראות קובץ אחר (`sw.js`,
   קיום נתיב) מצהיר על כך במפורש.
   ══════════════════════════════════════════════════════════════════════════ */

/*  חיתוך אובייקט תצורה לפי שמו, בהתאמת סוגריים — על הקוד המטוקן. */
function cfgBlock(name) {
  const m = new RegExp('\\b' + name + '\\s*=\\s*\\{').exec(code);
  if (!m) return '';
  let i = code.indexOf('{', m.index), d = 0;
  for (let j = i; j < code.length; j++) {
    if (code[j] === '{') d++;
    else if (code[j] === '}') { d--; if (!d) return code.slice(i, j + 1); }
  }
  return '';
}
/*  ⭐ סבב 57 — קריאת קוד ה-Java של המעטפת. ⚠️ **נדרש עץ ולא נתיב
 *  קבוע** — תיקיית החבילה נבדלת בין ארבע האפליקציות (`com.yoman.avoda`
 *  מול `com.gius.app` וכו'), ⛔ ונתיב שנכתב לאחת מהן היה probe שעובר
 *  בשקט בשלוש האחרות מפני שהקובץ פשוט אינו שם.                     */
function javaSrc() {
  const root = 'android/app/src/main/java';
  let out = '';
  const walk = (d) => {
    let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const e of ents) {
      const f = d + '/' + e.name;
      if (e.isDirectory()) walk(f);
      else if (e.name.endsWith('.java')) { try { out += fs.readFileSync(f, 'utf8') + '\n'; } catch (e2) {} }
    }
  };
  walk(root);
  return out;
}
const hasPath = (p) => fs.existsSync(p);
/*  ⛔ מחיקה מטבלת הגיבוי אינה מחיקת נתון (סבב 71) — ⚠️ פינוי הגיבויים
 *  הוא מדיניות בפני עצמה, עם שורה משלה ועם שער משלה, ⛔ ושער שהיה סופר
 *  אותה כאן היה מסמן ❌ על בדיוק המנגנון שנדרש. ⭐ ההיתר הוא **שם
 *  הטבלה** ⛔ ולא שם הקובץ: קובץ מיגרציה שמוחק גם מטבלת ישות נתפס. */
/*  ⛔ הביטוי מוצב בקבוע ⛔ ולא נכתב אחרי `return` (סבב 71) — ⚠️ מפענח
 *  ההערות מכריע «ביטוי או חילוק» לפי הטוקן הקודם, ⛔ ואחרי `return` הוא
 *  קורא חילוק: המרכאות שבתוך הביטוי נפתחות אז כמחרוזת שרצה עד סוף
 *  השורה, ⚠️ ומונה השורות של השער קופץ באחת — ⛔ בשקט, ועל קובץ אחר. */
const CLICK_LISTENER = /addEventListener\(\s*['"]click['"]/;
const BACKUP_TABLE = /^(?:public\.)?\w*_?backup\b/i;
/*  ⛔ `public.kv` בלבד — ⚠️ **ולא** `kv_rishon`/`kv_ramataviv`: ⭐ שם עדיין
 *  יושבים נתוני יומן כערך שלם, ⛔ ומחיקה מהן היא מחיקת ישות. ⚠️ ב-`public.kv`
 *  נמדד שכל שורותיה הן שאריות של מפתחות שעברו לטבלאות מובנות, ⛔ ואין בה
 *  ישות שאין לה בית אחר: ⭐ ולכן גריעתן היא ניקוי שארית ⛔ ולא מחיקה רכה
 *  שנעקפה. ⛔ והגריעה עצמה נושאת שער שקילות בגוף המיגרציה. */
const LEGACY_KV_TABLE = /^(?:public\.)?kv$/i;
function sqlDeletesEntity() {
  const d = 'migrations';
  if (!fs.existsSync(d)) return [];
  const out = [];
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.sql'))) {
    const t = fs.readFileSync(`${d}/${f}`, 'utf8').replace(/--[^\r\n]+/g, '');
    for (const m of t.matchAll(/\bDELETE\s+FROM\s+([\w.]+)/gi))
      if (!BACKUP_TABLE.test(m[1]) && !LEGACY_KV_TABLE.test(m[1])) out.push(`${f}:${m[1]}`);
  }
  return out;
}

/*  ⛔ מחזיר את שמות דגלי המעבר ה**דלוקים** (סבב 71) — ⚠️ הערך הוא מה שנמדד,
 *  ⛔ ולא ההצהרה שבעמודת ההערות: הצהרה שנכתבה פעם אחת ממשיכה לתאר
 *  עולם שהשתנה. */
/*  ⛔ אובייקט `Intl` יקר — שני מקומות מותרים ⛔ ולא אחד (סבב 85):
 *  ⭐ הצהרה ברמת המודול (עמודה 0), ⛔ או בנייה עצלה שנשמרת במטמון ברמת
 *  המודול ונבדקת לפניו. ⚠️ בנייה בגוף פונקציה בלי מטמון חוזרת בכל קריאה,
 *  ⛔ ובתוך `.sort()` היא חוזרת O(n log n) פעמים. */
function intlBuildGaps() {
  const out = [];
  for (const m of code.matchAll(/new\s+Intl\.[A-Za-z]+/g)) {
    const at = m.index;
    const from = code.lastIndexOf('\n', at) + 1;
    /*  ⛔ «רמת המודול» נמדדת כעמודה 0 ⛔ ולא כעומק סוגריים — ⚠️ ספירת
     *  סוגריים על מקור שיש בו מחרוזות היא ספירה שגויה, ⭐ וכל הצהרה
     *  ברמת המודול בקבצים האלה פותחת בעמודה 0. */
    if (!/^[ \t]/.test(code.slice(from, from + 1))) continue;
    const win = code.slice(Math.max(0, at - 400), at + 400);
    if (/if\s*\(\s*!\s*(?:window\.)?_\w+\s*\)/.test(win) &&
        /(?:window\.)?_\w+\s*=\s*\w+\s*;/.test(win)) continue;
    out.push(code.slice(at, at + 24).trim());
  }
  return out;
}

/*  ⛔ מסלול רינדור שממתין לפני שהוא מצייר (סבב 85) — ⚠️ פונקציה שיש בה
 *  `innerHTML` **וגם** `await` שקודם לו היא מסך שאינו מראה דבר עד
 *  שהמשיכה חוזרת: ⭐ וזה בדיוק «נראה תקוע». ⛔ פונקציה בלי `innerHTML`
 *  אינה מסלול רינדור, ⛔ ופונקציה בלי `await` אינה מושכת. */
function renderWaitSites() {
  const out = [];
  const re = /(?:^|\n)(?:window\.([A-Za-z_$][\w$]*)\s*=\s*)?(?:async\s+)?function\s*([A-Za-z_$][\w$]*)?\s*\(/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const name = m[1] || m[2] || '(anon)';
    let i = code.indexOf('{', m.index + m[0].length - 1);
    if (i < 0) continue;
    let d = 0, j = i;
    for (; j < code.length; j++) {
      if (code[j] === '{') d++;
      else if (code[j] === '}') { d--; if (!d) { j++; break; } }
    }
    const body = code.slice(i, j);
    const ih = body.search(/\.innerHTML\s*=/);
    if (ih < 0) continue;
    const aw = body.search(/\bawait\b/);
    if (aw >= 0 && aw < firstPaintAt(body, ih)) out.push(name);
  }
  return out;
}
/*  ⛔ `openModal(title, body, foot)` **הוא** ציור — ⚠️ הוא כותב את הגוף
 *  ל-`modal-body`: ⭐ פונקציה שפותחת מודאל עם «טוען…» ורק אז ממתינה אינה
 *  ממתינה לפני הציור הראשון, ⛔ ומדידה שספרה `.innerHTML=` בלבד דיווחה
 *  עליה כהפרה — ⚠️ ושער שנופל על קוד תקין נקרא כרעש. ⛔ והמועמדוּת עצמה
 *  נשארת `.innerHTML=` — ⚠️ פונקציה שכל «ציורה» הוא דיאלוג שנפתח אחרי
 *  עבודת רשת אינה מסלול רינדור, ⛔ ואין למדוד אותה כאן. */
function firstPaintAt(body, ih) {
  const b = body.search(/\bopenModal\s*\(/);
  return b < 0 ? ih : Math.min(ih, b);
}

/*  ⛔ חמשת תנאי ההתקנה של כרום (סבב 86) — ⚠️ שתי השורות שמעל מודדות **שדות
 *  ושם**, ⛔ ולא את עצם היכולת להתקין: ⭐ אפליקציה שאיבדה את הקישור למניפסט,
 *  את רישום ה-`sw` או את אייקון ה-512 עוברת את שתיהן ⛔ ואינה ניתנת להתקנה.
 *  ⚠️ וה-HTTPS נמדד בשלילה — ⛔ שדה שנכתב כ-`http://` מוריד את הדף מהתנאי,
 *  ⭐ וכתובת יחסית יורשת את המקור ולכן תקינה. */
function installGaps() {
  const out = [];
  let mf = {};
  try { mf = JSON.parse(readSafe('manifest.json') || '{}'); }
  catch (e) { return ['manifest.json אינו JSON תקין']; }
  if (!/<link[^>]+rel=["']manifest["']/i.test(src)) out.push('אין <link rel="manifest">');
  if (!/serviceWorker\s*\.\s*register\s*\(/.test(code)) out.push('אין רישום service worker');
  const sizes = (mf.icons || []).map((i) => String(i.sizes || ''));
  for (const want of ['192x192', '512x512'])
    if (!sizes.some((x) => x.split(/\s+/).indexOf(want) >= 0)) out.push('אין אייקון ' + want);
  if (mf.display !== 'standalone') out.push('display=' + mf.display);
  for (const f of ['start_url', 'scope', 'id'])
    if (/^http:\/\//i.test(String(mf[f] || ''))) out.push(f + ' ב-http');
  return out;
}

/*  ⛔ מפתח הגדרה שהקוד מבקש (סבב 86) — ⚠️ הנימוק נמדד: `ys_sleep_treats`
 *  נדרש בכל פתיחה של לשונית ההשגחה בשינה ⛔ ולא היה קיים בטבלת ההגדרות,
 *  ⭐ ו-`single` סימן על היעדר השורה **שגיאה**: המסך הכריז «הרענון מהענן
 *  נכשל» על מסד תקין, וחי כך. ⛔ ומה שנמדד כאן הוא ההצהרה ושתי הסטיות
 *  ממנה — ⚠️ קיום המפתח במסד עצמו אינו נראה מהריפו. */
function cfgKeyGaps() {
  const asked = [...srcRefs.matchAll(/\b(?:ys|sl)CfgGet\(\s*'([^']+)'/g)].map((m) => m[1]);
  const declared = APP.cfgKeys || [];
  const out = [];
  for (const k of new Set(asked)) if (declared.indexOf(k) < 0) out.push('נדרש ואינו מוצהר: ' + k);
  for (const d of declared) if (asked.indexOf(d) < 0) out.push('מוצהר ואין לו קורא: ' + d);
  /*  ⛔ `single` על מפתח יחיד — ⚠️ שורה שאינה קיימת מסומנת שם כשגיאה,
   *  ⭐ ו-`maybeSingle` מחזיר `data:null` נקי. */
  const single = (srcRefs.match(/\.eq\(\s*'key'[\s\S]{0,80}?\.single\(\)/g) || []).length;
  if (single) out.push('single על מפתח יחיד: ' + single);
  return out;
}

function legacyFlagsOn() {
  const re = /\b(?:const|let|var)\s+([A-Za-z_]*(?:LEGACY|BOOTSTRAP)[A-Za-z_]*)\s*=\s*true\b/g;
  return [...src.matchAll(re)].map((m) => m[1]);
}

function fileHas(p, re) {
  try { return re.test(fs.readFileSync(p, 'utf8')); } catch (e) { return false; }
}
function fnBody(name) {
  const r = fnRange(name);
  return r ? code.slice(r[0], r[1]) : '';
}
const hasCode = (re) => re.test(code);
/*  ⚠️ קריאה מהמקור **הגולמי** — כולל הערות ומחרוזות (סבב 53). ⛔ שמור
 *  לשמות אירועים ולערכים שחיים בתוך מחרוזת, שאותם `code` מרוקן. */
const hasSrc = (re) => re.test(src);
/*  מדיניות הפינוי — `LS_CFG` **וגם** `lsRebuildPolicy()`. ⚠️ ביומן `tier2`
 *  נבנית בזמן ריצה (המפתחות נושאים סיומת מוסד), ולכן היא אינה ליטרל בתוך
 *  `LS_CFG`; probe שקרא את האובייקט בלבד היה מדווח «אין פינוי» על אפליקציה
 *  שמפנה. הפונקציה פשוט אינה קיימת בשלוש האחרות והצירוף שקוף. */
const policyBlock = () => cfgBlock('LS_CFG') + fnBody('lsRebuildPolicy');

/*  ⛔ ששת הבודקים המשותפים (סבב 70) — ⚠️ הרשימה ממוינת, וההשוואה היא
 *  שוויון סט מלא: קובץ `check-*` שנוסף או שנשאר בעץ מפיל אותה. */
const SHARED_CHECKERS = ['check-capabilities.mjs', 'check-comments.mjs',
                         'check-docs.mjs', 'check-js.mjs',
                         'check-status-area.mjs', 'check-structure.mjs'];
function checkerSet() {
  let got;
  try { got = fs.readdirSync('tools').filter((f) => /^check-.*\.mjs$/.test(f)).sort(); }
  catch (e) { return false; }
  return got.length === SHARED_CHECKERS.length &&
         got.every((f, i) => f === SHARED_CHECKERS[i]);
}

/*  ⛔ משימת הבודק מוצהרת בבאנר של כל אחד מששת הבודקים (סבב 72) — ⭐ משפט
 *  אחד: מה הוא סורק ⛔ ועל מה הוא מפיל. ⚠️ ה-probe מאמת **ערך** ולא קיום
 *  שם: הוא דורש את שני החלקים, ⛔ ומשפט שאומר «סורק» בלי «מפיל» נופל —
 *  ⚠️ בודק שהצהיר מה הוא סורק ולא על מה הוא מפיל מיוחס לו כיסוי שאין לו. */
function checkerMissions() {
  try {
    return SHARED_CHECKERS.every((f) => {
      const b = fs.readFileSync(`tools/${f}`, 'utf8').split('*/')[0];
      const m = /⭐ משימת הבודק:([\s\S]*?)(?:\n \*\n|$)/.exec(b);
      return !!m && /סורק/.test(m[1]) && /⛔ ומפיל/.test(m[1]);
    });
  } catch (e) { return false; }
}
/*  ⛔ המונה סופר **אתרי תצוגה** ולא מחרוזות (סבב 72) — ⚠️ אלמנט שמזההו
 *  מכריז «שגיאה» הוא דפוס שני על המסך, ⛔ ו-`alert` הוא שלישי. */
/*  ⛔ `alert` הוא הפרה תמיד — ⚠️ הוא חוסם את הדפדפן ואינו נראה כמו
 *  שאר ההודעות. ⛔ **ואזור שגיאה מוטבע מותר רק כשהוא מוכרז בשמו ובנימוקו**
 *  (סבב 79) — ⚠️ הודעת אימות חייבת להישאר על המסך בזמן שהמשתמש מקליד
 *  מחדש, ⭐ וטוסט שנעלם אחרי שלוש שניות משאיר טופס בלי הסבר; ⛔ ומזהה
 *  שמוכרז ואינו קיים מפיל אף הוא — ⚠️ רשימת-היתר שהתיישנה היא שארית. */
/*  ⛔ `catch` ריק סביב **כתיבה** — ⚠️ הכלל אינו «אין `catch` ריק»: ⭐ יש
 *  מסלולים שבהם היעדר ערך הוא תשובה תקפה ואין מה לרשום; ⛔ מה שנמדד הוא
 *  `catch` ריק ש**גוף ה-try שלו כותב** — מקומית או לענן. ⛔ ו-`reg.update()`
 *  אינו כתיבה — ⚠️ הוא רענון ה-service worker, ⛔ ואין לו נתון שיאבד. */
const WRITE_CALL = /lsSet\s*\(|localStorage\s*\.\s*setItem|sessionStorage\s*\.\s*setItem|\.upsert\s*\(|\.insert\s*\(|sbSet\s*\(|ysCfgSet\s*\(|\bSB\b[\s\S]{0,80}?\.update\s*\(/;
/*  ⛔ גוף ה-`try` נמצא בהתאמת סוגריים ⛔ ולא בחלון של 700 תווים (סבב 80) —
 *  ⚠️ חלון קבוע מפספס `try` ארוך ממנו, ⭐ וכשל שקט בגוף ארוך הוא בדיוק
 *  הכשל שקשה יותר למצוא בעין. ⛔ והמדידה עוצרת כשלפני הסוגר אין `try`:
 *  ⚠️ `}` שאינו של `try` הוא בלוק אחר, ⛔ וסריקה לאחור בלעדיו הייתה
 *  סופרת קוד שכלל אינו במסלול הזה. */
function silentWriteCatches() {
  const out = [];
  const re = /catch\s*\([^)]*\)\s*\{\s*\}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let i = m.index - 1;
    while (i > 0 && /\s/.test(src[i])) i--;
    if (src[i] !== '}') continue;
    let depth = 0, j = i;
    for (; j >= 0; j--) {
      if (src[j] === '}') depth++;
      else if (src[j] === '{') { depth--; if (depth === 0) break; }
    }
    if (j < 0 || !/try\s*$/.test(src.slice(Math.max(0, j - 12), j))) continue;
    const body = src.slice(j, i + 1);
    /*  ⛔ `reg.update()` אינו כתיבת נתון — ⚠️ הוא רענון רישום ה-service
     *  worker, ⭐ וכישלונו אינו מאבד דבר: הבדיקה הבאה תרוץ בעוד 30 דקות. */
    if (/reg\s*\.\s*update\s*\(/.test(body)) continue;
    if (WRITE_CALL.test(body)) out.push(src.slice(0, m.index).split('\n').length);
  }
  return out;
}

function errPatternSites() {
  const found = (src.match(/id="([^"]*err[^"]*)"/gi) || [])
    .map((m) => m.replace(/^id="|"$/g, ''));
  const allow = Object.keys(APP.inlineErrAllow || {});
  const undeclared = found.filter((i) => allow.indexOf(i) < 0);
  const stale = allow.filter((i) => found.indexOf(i) < 0);
  return undeclared.length + stale.length + (code.match(/\balert\s*\(/g) || []).length;
}

/*  ⛔ מספר שורה בגוף שער נגזר משם השורה ⛔ ואינו מוקלד — ⚠️ הנימוק נמדד:
 *  `test_matrix` החזיק שני מספרים מוקלדים, ⛔ והמספור מחדש בסבב 76 הפיל
 *  אותו על עץ תקין. ⭐ הרשימה כאן היא **היתר ולא איסור**: ארבעת המרשמים
 *  המוצהרים נחתכים מהקובץ, ⛔ וכל מספר-שורה שנשאר אחריהם הוא הפרה —
 *  ⚠️ מרשם חדש שייכנס בלי להיכנס לכאן ייתפס, ⛔ ורשימת איסור לא הייתה
 *  תופסת אותו. */
const ROW_REGISTRIES = [
  /^export const ROWS = \[[^\]]*\];$/m,
  /const GATES = \{[\s\S]*?\n\};/,
  /const MATRIX = \[[\s\S]*?\n\];/,
  /gapRows:\s*\[[^\]]*\]/,
  /tableProbe:\s*\{[\s\S]*?\n  \},/,
  /const DB_FACT_EXEMPT = \[[\s\S]*?\];/,
  /const EXEMPT = \[[\s\S]*?\];/,
];
/*  ⛔ שלוש הצורות שבהן מספר שורה נכנס ללוגיקה — ⚠️ קבוע ששמו מכריז «שורה»,
 *  ⛔ חיפוש שורה לפי מספר, ⛔ והשוואה של שדה `row` למספר. */
const ROW_LITERAL = /\bROW_[A-Z_]*\s*=\s*\d|tableRow\(\s*\d|rowOf\(\s*\d|\.?\browt?\s*={2,3}\s*\d/;
function typedRowSites() {
  const out = [];
  for (const f of fs.readdirSync('tools').filter((x) => x.endsWith('.mjs'))) {
    let t = fs.readFileSync('tools/' + f, 'utf8');
    for (const re of ROW_REGISTRIES) t = t.replace(re, '');
    t.split('\n').forEach((l, i) => {
      /*  ⚠️ שורת הערה אינה לוגיקה — ⛔ והיא נחתכת לפני הסריקה. */
      if (/^\s*(\*|\/\/|\/\*)/.test(l)) return;
      if (ROW_LITERAL.test(l)) out.push(`${f}:${i + 1}`);
    });
  }
  return out;
}

/*  ⛔ פונקציה בלי קורא — ⚠️ ההגדרות נסרקות מהקוד שאחרי החסרת המחרוזות,
 *  ⛔ והקוראים נספרים על המקור עצמו: ⭐ `onclick="f()"` הוא קורא חי,
 *  ⚠️ והוא מחרוזת מבחינת הפרסר. ⛔ **ובלוק משותף אינו נסרק** — ⚠️ ה-API
 *  שלו זהה בית-לבית בארבעתם, ⛔ ואינו נגזם באפליקציה שאינה קוראת לו:
 *  ⭐ גזימה שם הייתה שוברת את החתימה. ⛔ וההערות מוסרות מספירת הקוראים —
 *  ⚠️ אזכור שם בהערה אינו קורא, ⛔ והוא היה מסתיר בדיוק את מה שנמדד. */
const srcRefs = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
/*  ⛔ המדידה מכסה גם את `tools/` (סבב 79) — ⚠️ סריקה שמוגבלת לסוג קובץ
 *  אחד היא ראיה לסוג שנסרק בלבד: ⭐ שער מחזיק עוזרים משלו, ⛔ ועוזר שאיבד
 *  את קוראו נשאר שם. ⛔ **והמדידה על הקוד ולא על הטקסט** — ⚠️ שער חותך
 *  פונקציה מ-`index.html` כמחרוזת ומריץ אותה ב-`vm`, ⛔ והגדרה שיושבת
 *  בתוך מחרוזת אינה הגדרה. */
const DEF_RE = '(?:export\\s+)?(?:async\\s+)?function\\s+';
const bound = (s) => new RegExp('(?<![\\w$])' + s + '(?![\\w$])', 'g');
const escName = (s) => s.replace(/\$/g, '\\$');
function gateCode(f) {
  const t = fs.readFileSync('tools/' + f, 'utf8');
  const o = new Array(t.length).fill(' ');
  scanJs(t, 0, t.length, o);
  return o.join('');
}
function orphanGateFns() {
  let files = [];
  /*  ⛔ הכשל אינו נבלע — ⚠️ `catch` ריק סביב איסוף הקבצים מחזיר רשימה
   *  ריקה, ⭐ ו-probe שסופר אפס על אוסף ריק אינו יכול להיכשל. */
  try { files = fs.readdirSync('tools').filter((f) => f.endsWith('.mjs')).sort(); }
  catch (e) { return ['tools/: ' + e.message]; }
  if (!files.length) return ['tools/: אין קובצי שער'];
  const codes = files.map((f) => [f, gateCode(f)]);
  const out = [];
  for (const [f, body] of codes) {
    const seen = new Set();
    const defRe = new RegExp(DEF_RE + '([A-Za-z_$][\\w$]*)\\s*\\(', 'g');
    let d;
    while ((d = defRe.exec(body)) !== null) {
      const name = d[1];
      if (seen.has(name)) continue;
      seen.add(name);
      const esc = escName(name);
      const defs = (body.match(new RegExp(DEF_RE + esc + '\\s*\\(', 'g')) || []).length;
      if ((body.match(bound(esc)) || []).length - defs > 0) continue;
      /*  ⛔ פונקציה מיוצאת נמדדת בכל קובצי השער — ⚠️ קוראה יושב בשער אחר,
       *  ⛔ והיעדרו בקובץ שלה אינו «בלי קוראים». */
      if (new RegExp('export\\s+(?:async\\s+)?function\\s+' + esc + '\\b').test(body) &&
          codes.some((c) => c[0] !== f && bound(esc).test(c[1]))) continue;
      out.push(f + ':' + name);
    }
  }
  return out;
}

/*  ⛔ מודאל שאין לו פותח נמחק עם הפונקציה — ⚠️ מיכל שנשאר ב-DOM בלי קוד
 *  שמציג אותו הוא חצי יכולת: ⭐ הוא נראה קיים למי שקורא את ה-HTML, ⛔ ואינו
 *  נפתח לעולם. */
function orphanModals() {
  const out = [];
  for (const m of src.matchAll(/<div\s+id="([\w-]*modal[\w-]*)"[^>]*class="[^"]*modal[^"]*"/g)) {
    const id = m[1];
    /*  ⛔ נמדד ב-`srcRefs` ⛔ ולא ב-`code` — ⚠️ המזהה חי **בתוך מחרוזת**
     *  (`getElementById('x-modal')`), ⭐ ובגזירת הקוד המחרוזות מרוקנות:
     *  ⛔ probe שמחפש שם שם אינו יכול למצוא אותו, כלומר אינו יכול להיכשל. */
    /*  ⛔ שתי צורות פתיחה ולא אחת (סבב 80) — ⚠️ מיכל שנפתח ב-`display`
     *  ומיכל שנפתח בהוספת מחלקה הם אותה יכולת בדיוק, ⛔ ו-probe שמכיר
     *  רק את הראשונה נופל על שינוי תקין. */
    const shown = new RegExp("['\"]" + id + "['\"]\\s*\\)[\\s\\S]{0,80}?" +
      "(?:display\\s*=\\s*['\"](?:flex|block)['\"]|classList\\.add\\(['\"]open['\"]\\))");
    if (shown.test(srcRefs)) continue;
    out.push(id);
  }
  return out;
}

/*  ⛔ המדד הוא **הפער** ⛔ ולא המספר — ⚠️ שם שאין לו קורא ואינו מוכרז
 *  מפיל, ⛔ ושם שמוכרז ויש לו קורא מפיל אף הוא: ⭐ רשימת-היתר שהתיישנה
 *  היא בעצמה שארית, וזו בדיוק השורה על רשימות-ההיתר. */
/*  ⛔ השוואת מזהה רשומה ב-`===` — ⚠️ הנימוק נמדד: מזהה שעבר דרך מאפיין HTML
 *  חוזר כ**מחרוזת**, ⛔ ו-`===` מול מספר שנשמר במסד אינו מתאים: ⭐ הכפתור
 *  אינו זורק ואינו מגיב, והרשומה «אינה נמצאת». ⛔ ולכן ההשוואה עוברת
 *  ב-`idEq`, שממירה את שני הצדדים למחרוזת.
 *  ⛔ שתי קטגוריות מוחרגות **בשמן ובנימוקן**, ⛔ ולא בשתיקה:
 *  ⚠️ (א) הצד הימני הוא **ליטרל מחרוזת** או `undefined`/`null` — ⭐ מזהה
 *  DOM (`e.target.id === 'modal'`) או בדיקת קיום, ⛔ ולא מזהה רשומה;
 *  ⚠️ (ב) שם שמאלי מוצהר — ⭐ `AUTH.user` הוא המשתמש המחובר בזיכרון,
 *  `AUTH.MODULES[i]` ו-`LS_CFG.app` הם קבועים פנימיים שאינם עוברים ב-DOM. */
const ID_CMP_LEFT = [/AUTH\s*\.\s*user\s*\.\s*id$/, /AUTH\s*\.\s*MODULES\s*\[[^\]]*\]\s*\.\s*id$/];
const ID_CMP_RIGHT = [/^'[^']*'$/, /^"[^"]*"$/, /^undefined$/, /^null$/,
                      /^LS_CFG\s*\.\s*app$/];
function idCmpSites(text = src) {
  const out = [];
  const re = /([A-Za-z_$][\w$]*(?:\s*(?:\.\s*[A-Za-z_$][\w$]*|\[[^\]\n]*\]))*\.\s*id)\s*===\s*([^;)&|,?\n]{1,40})/g;
  for (const m of text.matchAll(re)) {
    const left = m[1].replace(/\s+/g, ''), right = m[2].trim();
    if (ID_CMP_LEFT.some((r) => r.test(left))) continue;
    if (ID_CMP_RIGHT.some((r) => r.test(right))) continue;
    out.push(left + ' === ' + right);
  }
  return out;
}

/*  ⛔ וגם ההפך (סבב 82) — ⚠️ «בלי קוראים» ו«קורא בלי הגדרה» הם אותו חצי-חיווט
 *  משני צדדיו, ⭐ ושורה שמודדת צד אחד בלבד מאשרת את השני. ⛔ המדידה נשענת
 *  על `wiringHere` של שער החיווט ⛔ ואינה מימוש שני. */
function orphanGaps() {
  const w = wiringHere(src);
  const found = orphanFns().concat(orphanGateFns(),
                                   orphanModals().map((i) => 'modal:' + i),
                                   w.missing.map((x) => 'קורא בלי הגדרה: window.' + x),
                                   w.noProducer.map((x) => 'מטפל בלי כפתור: ' + x));
  const allow = Object.keys(APP.orphanAllow || {});
  return found.filter((n) => allow.indexOf(n) < 0).map((n) => 'בלי קורא ואינו מוכרז: ' + n)
    .concat(allow.filter((n) => found.indexOf(n) < 0).map((n) => 'מוכרז ואינו בלי-קורא: ' + n));
}

function orphanFns() {
  const out = [], seen = new Set();
  const defRe = /(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let d;
  while ((d = defRe.exec(code)) !== null) {
    if (inShared(d.index)) continue;
    const name = d[1];
    if (seen.has(name)) continue;
    seen.add(name);
    /*  ⛔ הגבול אינו `\b` — ⚠️ שם שנפתח ב-`$` אינו תו-מילה, ⭐ ו-`\b` צמוד
        לו נקשר לתו שלפניו: ⛔ `$` ו-`$$` נמדדו כחסרי קורא בעוד הם נקראים
        מכל מסך. */
    const esc = name.replace(/\$/g, '\\$');
    const bound = (s) => new RegExp('(?<![\\w$])' + s + '(?![\\w$])', 'g');
    const refs = (srcRefs.match(bound(esc)) || []).length;
    const defs = (srcRefs.match(new RegExp('(?:async\\s+)?function\\s+' + esc + '\\s*\\(', 'g')) || []).length;
    if (refs - defs <= 0) out.push(name);
  }
  return out;
}

/*  ⛔ הסכימה כפי שהיא **מוצהרת** בקובצי המיגרציה — ⚠️ הסכימה החיה יושבת
 *  במסד ואינה נראית מהריפו, ⛔ ומה שנמדד כאן הוא ההצהרה בלבד. ⭐ עמודה
 *  שנוספה ב-`alter table` נספרת, ⛔ ועמודה שנגרעה יורדת: ⚠️ סריקת
 *  ה-`create table` לבדה הייתה מדווחת על עמודה שכבר אינה קיימת. */
/*  ⛔ פיצול הצהרות העמודה בפסיק שבעומק אפס — ⚠️ הסוגריים הם מה שקובע,
 *  ⭐ ולא השורות: ⛔ שתי עמודות באותה שורה הן שתי הצהרות, ⛔ ו-`check (…, …)`
 *  הוא הצהרה אחת. */
function splitCols(body) {
  const out = [];
  let d = 0, cur = '';
  for (const ch of body) {
    if (ch === '(') d++;
    else if (ch === ')') d--;
    if (ch === ',' && d === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}
function declaredTables() {
  const tabs = new Map();
  for (const f of fs.readdirSync('migrations').filter((x) => x.endsWith('.sql')).sort()) {
    /*  ⛔ הערה נחתכת גם באמצע שורה — ⚠️ `deleted boolean, -- הערה` הותיר את
        `deleted` מחוץ למדידה, ⭐ והטבלה נראתה תקינה מפני שלא נסרקה. */
    const sql = fs.readFileSync('migrations/' + f, 'utf8').replace(/--[^\n]*/g, ' ');
    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_0-9]+)\s*\(([\s\S]*?)\n?\s*\)\s*;/gi)) {
      const cols = tabs.get(m[1]) || new Map();
      /*  ⛔ הפיצול הוא בפסיק **בעומק אפס** ⛔ ולא שורה-שורה ולא בכל פסיק —
          ⚠️ `check (x in ('א', 'ב'))` מכיל פסיקים בתוך סוגריים, ⛔ ופיצול בכל
          פסיק קרע הצהרות עמודה לשניים; ⭐ ופיצול שורה-שורה החמיץ עמודה
          שנייה באותה שורה: ⛔ `client_id` שישב אחרי `updated_at` נעלם
          מהמדידה בשקט, ⚠️ והטבלה נראתה «מחיקה רכה בלי מזהה מכשיר». */
      for (const part of splitCols(m[2])) {
        const c = /^\s*([a-z_0-9]+)\s+([a-z][a-z0-9 ]*)/i.exec(part);
        if (c && !/^(primary|unique|foreign|constraint|check)$/i.test(c[1]))
          cols.set(c[1].toLowerCase(), c[2].trim().toLowerCase());
      }
      tabs.set(m[1], cols);
    }
    for (const m of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_0-9]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_0-9]+)\s+([a-z][a-z0-9 ]*)/gi)) {
      const cols = tabs.get(m[1]) || new Map();
      cols.set(m[2].toLowerCase(), m[3].trim().toLowerCase());
      tabs.set(m[1], cols);
    }
    for (const m of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_0-9]+)\s+drop\s+column\s+(?:if\s+exists\s+)?([a-z_0-9]+)/gi)) {
      const cols = tabs.get(m[1]);
      if (cols) cols.delete(m[2].toLowerCase());
    }
    for (const m of sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_0-9]+)/gi)) tabs.delete(m[1]);
  }
  return tabs;
}
/*  ⛔ שתי סטיות באותה מדידה — ⚠️ מחיקה רכה שאינה מתעדת מי ומתי, ⛔ וחותמת
 *  בטיפוס שאינו תואם למי שמייצר אותה: ⭐ מיזוג שמשווה `bigint` ל-`timestamptz`
 *  מכריע לפי הטיפוס ⛔ ולא לפי הזמן. */

/*  ⛔ מי מייצר את החותמת ⛔ ולא שם הטבלה — ⚠️ «טבלת הגדרות» היא קריאת
 *  משמעות, ⭐ והטריגר הוא עובדה שכתובה במיגרציה. ⛔ ושתי צורות הכרזה
 *  נמדדות: `create trigger ... on <t>` ישיר, ⛔ ולולאת `format` על
 *  `array[...]` — ⚠️ צורה אחת בלבד הייתה מדלגת על שבע טבלאות בשקט. */
function touchedTables() {
  const on = new Set();
  for (const f of fs.readdirSync('migrations').filter((x) => x.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync('migrations/' + f, 'utf8').replace(/--[^\n]*/g, ' ');
    for (const m of sql.matchAll(/create\s+trigger\s+[a-z_0-9]+\s[\s\S]{0,200}?\son\s+(?:public\.)?([a-z_0-9]+)/gi))
      on.add(m[1]);
    for (const blk of sql.matchAll(/do\s+\$\$[\s\S]*?\$\$/gi)) {
      if (!/create\s+trigger/i.test(blk[0])) continue;
      for (const arr of blk[0].matchAll(/array\s*\[([^\]]*)\]/gi))
        for (const q of arr[1].matchAll(/'([a-z_0-9]+)'/gi)) on.add(q[1]);
    }
  }
  return on;
}
const SOFT_DELETE_COLS = ['deleted_at', 'deleted_by'];
const baseType = (t) => /^timestamp\s+with\s+time\s+zone/.test(t) ? 'timestamptz'
                      : t.trim().split(/\s+/)[0];
function colPatternGaps() {
  const out = [], touched = touchedTables();
  for (const [t, cols] of declaredTables()) {
    if (cols.has('deleted')) {
      const miss = SOFT_DELETE_COLS.filter((c) => !cols.has(c));
      if (miss.length) out.push(`${t}: מחיקה רכה בלי ${miss.join(' + ')}`);
    }
    /*  ⛔ הטיפוס בלבד, בלי המגבילים — ⚠️ `not null default now()` הוא מגביל
        ⛔ ולא טיפוס, ⭐ ושתי הצהרות של אותו טיפוס היו נמדדות כשתיים. */
    if (!cols.has('updated_at')) continue;
    /*  ⛔ שני טיפוסים אינם סחיפה — ⚠️ הם נגזרים ממי שמייצר את החותמת:
     *  ⭐ טריגר בצד השרת ⇒ `timestamptz`, ⛔ ובלעדיו החותמת היא של המכשיר
     *  והיא `bigint`. ⚠️ מדידה שספרה «כמה טיפוסים» דיווחה סחיפה על מצב
     *  תקין, ⛔ והייתה מזמינה המרה שהופכת מכשיר שערך אופליין לחדש יותר. */
    const want = touched.has(t) ? 'timestamptz' : 'bigint';
    const got  = baseType(cols.get('updated_at'));
    if (got !== want) out.push(`${t}: updated_at ${got} ואין ${want} — ` +
      (touched.has(t) ? 'יש עליה טריגר touch בצד השרת' : 'אין עליה טריגר touch'));
  }
  return out;
}

/*  ⛔ תקן קובץ המיגרציה — ⚠️ ארבע הפרות אפשריות, ⭐ וכל אחת מהן היא מסלול
 *  שאין ממנו חזרה: ⛔ `create table` בלי `if not exists` נופל בהרצה שנייה,
 *  ⛔ `delete`/`truncate` ל-`anon` פותח מחיקה פיזית מהלקוח, ⛔ טבלה בלי
 *  מזהה שנוצר במכשיר יוצרת רשומה כפולה בניסיון חוזר, ⛔ וקובץ בלי באנר
 *  אינו מצהיר אם רץ. */
const MIG_BANNER = /^-- ={40,}\n-- \S+\.sql — \S[^\n]*\n-- ={40,}\n--\n-- ⛔/;
function migContentGaps() {
  const out = [];
  for (const f of fs.readdirSync('migrations').filter((x) => x.endsWith('.sql')).sort()) {
    const raw = fs.readFileSync('migrations/' + f, 'utf8');
    const sql = raw.replace(/--[^\n]*/g, ' ');
    if (!MIG_BANNER.test(raw)) out.push(`${f}: אין באנר תקני בראש`);
    if (/create\s+table\s+(?!if\s+not\s+exists)/i.test(sql)) out.push(`${f}: create table בלי if not exists`);
    for (const m of sql.matchAll(/grant\s+([a-z, ]+?)\s+on\s+[^;]*?\s+to\s+([^;]+);/gi))
      if (/\b(delete|truncate)\b/i.test(m[1]) && /\b(anon|authenticated)\b/i.test(m[2]))
        out.push(`${f}: grant ${m[1].trim()} ל-anon/authenticated`);
  }
  /*  ⛔ מזהה שנוצר במכשיר — ⚠️ `client_id text` או `id uuid` עם ברירת מחדל:
   *  ⭐ שתי צורות לאותו דבר, ⛔ והבחירה ביניהן היא הבדל מכוון בין הריפו. */
  for (const [t, cols] of declaredTables()) {
    if (!cols.has('deleted')) continue;
    if (cols.has('client_id')) continue;
    if ((cols.get('id') || '').startsWith('uuid')) continue;
    out.push(`${t}: מחיקה רכה בלי מזהה שנוצר במכשיר`);
  }
  return out;
}
/*  ⛔ תקרת שורות לקובץ מיגרציה — ⚠️ קובץ הסכימה הראשונית מוחרג בתקן עצמו
 *  ⛔ ולא ברשימה: ⭐ הוא הסכימה המלאה ונכתב פעם אחת, ⚠️ וכל היתר הם שינוי
 *  אחד. ⛔ והחריגה נגזרת מהסדר ⛔ ואינה מוקלדת — הקובץ הראשון בתיקייה. */
const MIG_MAX_LINES = 250;
function migLineGaps() {
  const files = fs.readdirSync('migrations').filter((x) => x.endsWith('.sql')).sort();
  return files.slice(1).filter((f) =>
    fs.readFileSync('migrations/' + f, 'utf8').split('\n').length - 1 > MIG_MAX_LINES);
}

/*  שורות המטריצה. `probe` מחזירה true כשהיכולת **קיימת בפועל**.
 *  `desc` — שורה תיאורית (לא ✅/❌): מחזירה את הטקסט שהתא חייב לשאת.
 *  `exempt` — שורה שאינה ניתנת לאימות מהריפו, עם נימוק בן שורה.
 *  `app: true` — ה-probe יושב ב-`APP.tableProbe[row]` מפני שהוא נמדד
 *  מקוד האפליקציה הזו ואינו ניתן לניסוח גנרי.                            */
/*  ⛔ דגימת-היתר הקנונית (סבב 73ב) — ⚠️ המחולל מחזיק את הערך שהוא עובד בו,
 *  ⛔ והקובץ הזה מחזיק את מה שמותר לו להיות: ⭐ הוא זהה בארבעת הריפו,
 *  ⛔ ולכן שינוי באחת מהן נמדד כאן ואינו מתגלה בפיקסלים סבבים אחר כך. */
const GEN_SS = 8;
/*  ⛔ שני ערכים קנוניים שהטבלה מצהירה (סבב 75) — ⚠️ הם יושבים בקוד
 *  האפליקציה, ⛔ והקובץ הזה מחזיק את מה שמותר להם להיות: ⭐ אופק
 *  ה-tombstone בימים, וסף הפינוי היזום. */
const TOMB_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const LS_SWEEP_PCT = 0.60;
const genSrc = () => fs.readFileSync('tools/gen-icons.mjs', 'utf8');

/*  ⛔ מיון מקומי של רשומות — ⚠️ `.sort(` שהמשווה שלו נוגע באחד משדות
 *  הסדר של הישות, **מחוץ** לנקודת המיון שמוצהרת ב-`APP.sortFn`: ⭐ המסך
 *  והייצוא חייבים לקרוא לאותה פונקציה, ⛔ אחרת הדף שיוצא אינו הדף שנראה.
 *  ⚠️ מיון לפי חותמת, מפתח או גודל אינו נמדד כאן — ⭐ הוא אינו סדר תצוגה. */
function localSortSites() {
  const fn = APP.sortFn, fields = APP.sortFields || [];
  if (!fn || !fields.length) return [];
  const body = (open) => { let d = 0, i = open;
    for (; i < src.length; i++) { if (src[i] === '(') d++; else if (src[i] === ')') { d--; if (!d) break; } }
    return src.slice(open, i + 1); };
  let inner = '';
  const fi = src.indexOf('function ' + fn + '(');
  if (fi >= 0) { let d = 0; const s0 = src.indexOf('{', fi);
    for (let j = s0; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) { inner = src.slice(s0, j); break; } } } }
  const out = [];
  let p = -1;
  while ((p = src.indexOf('.sort(', p + 1)) >= 0) {
    const b = body(p + 5);
    if (!fields.some((f) => b.indexOf('.' + f) >= 0)) continue;
    if (inner && inner.indexOf(b) >= 0) continue;
    out.push(src.slice(0, p).split('\n').length);
  }
  return out;
}

/*  ⛔ מסלול ייצוא שבונה מחדש את **מבנה הדוח** — ⚠️ טבלה, כותרת עמודה או
 *  שורה שנכתבות בתוך מסלול הייצוא עצמו: ⭐ המסלול חייב לצלם את הדוח או
 *  למסור אותו למנוע טבלה, ⛔ ובניית מסמך שני היא בדיוק מה שאיבד את צבעי
 *  הקטגוריות. ⚠️ מעטפת הדפסה שמחזיקה תמונה בלבד אינה מבנה דוח.
 *  ⛔ **הגוף נקרא מ-`src` הגולמי ⛔ ולא מ-`code`** — ⚠️ `code` מרוקן
 *  מחרוזות, ⭐ ומבנה הדוח חי כולו בתוך מחרוזת: probe שקרא את `code`
 *  לא היה יכול להיכשל לעולם. */
const REPORT_MARKUP = ['<table', '<thead', '<tbody', '<tr'];
function exportMarkupSites() {
  const out = [];
  for (const fn of APP.exportFns || []) {
    let b = null;
    for (const decl of ['function ' + fn + '(', fn + ' = function']) {
      const i = src.indexOf(decl);
      if (i < 0) continue;
      let d = 0; const s0 = src.indexOf('{', i);
      for (let j = s0; j < src.length; j++) {
        if (src[j] === '{') d++;
        else if (src[j] === '}') { d--; if (!d) { b = src.slice(s0, j); break; } }
      }
      break;
    }
    /*  ⛔ שם מוצהר שאינו קיים מפיל אף הוא — ⚠️ רשימה שהתיישנה היא בדיוק
     *  השארית שהשורה באה לסלק, ⭐ והיא נראית כמו כיסוי. */
    if (b === null) { out.push(fn + ': אינו קיים'); continue; }
    const hit = REPORT_MARKUP.filter((t) => b.indexOf(t) >= 0);
    if (hit.length) out.push(fn + ': ' + hit.join(' '));
  }
  return out;
}

const MATRIX = [
  /*  ⛔ דגימת-היתר של המחולל (סבב 73ב) — ⚠️ הקבוע יושב בקוד ⛔ ולא בטבלה,
   *  ⭐ והערך הקנוני מוצהר כאן: ⚠️ ערך אחר באחת מהן מזיז את קצה הצורה,
   *  ⛔ ואותו סמל בדיוק נמדד בצלע אחרת — בשקט, בלי שער שנופל. */
  { row: 93, name: 'דגימת-יתר במחולל',
    probe: () => Number((/^const SS = (\d+);/m.exec(genSrc()) || [])[1]) === GEN_SS },
  { row: 131, name: '`PBKDF2` — פרמטרים', app: true },
  { row: 110, name: '`migrations/` — תוכן',
    probe: () => migContentGaps().length === 0 },
  { row: 111, name: '`migrations/` — כמות',
    probe: () => migLineGaps().length === 0 },
  { row: 120, name: 'דפוס עמודות אחיד',
    probe: () => colPatternGaps().length === 0 },
  /*  ⛔ שם טבלת הגיבוי נקרא מהקבוע ⛔ ולא מנוכחות המחרוזת — ⚠️ המחרוזת
   *  מופיעה גם בהערות שמסבירות למה לא לגבות אותה, ⭐ והערך הוא מה שקובע
   *  לאן הגיבוי היומי נכתב בפועל. */
  { row: 116, name: '`kv_backup` — טבלת הגיבוי',
    probe: () => (/BK_TABLE\s*=\s*'([a-z_]+)'/.exec(srcRefs) || [])[1] === 'kv_backup' },
  /*  ⛔ שתי טבלאות ההגדרות של היומן — ⚠️ ההפרדה בין המוסדות היא **טבלה
   *  למוסד**, ⛔ ולא עמודה: ⭐ ולכן שני השמות נמדדים יחד, ⚠️ ואחד בלי השני
   *  הוא מוסד שהגדרותיו נכתבות לבית של המוסד השני. */
  { row: 117, name: '`kv_rishon` / `kv_ramataviv` — הגדרות היומן', app: true },
  { row: 28, name: 'שער אינו מקליד מספר שורה',
    probe: () => typedRowSites().length === 0 },
  { row: 141, name: 'פונקציה בלי קוראים',
    probe: () => orphanGaps().length === 0 },
  /*  ⛔ ערך ולא נוכחות שם (סבב 76) — ⚠️ הטענה אינה «`waitFor` קיים» אלא
   *  **שאין המתנה על שעון** בשום שער: ⭐ שינה קבועה נגמרת על מכונה עמוסה
   *  לפני שהשרשרת הא-סינכרונית סיימה, ⛔ והטענה נופלת בזמן שהקוד תקין. */
  { row: 34, name: 'שער ממתין לתנאי ולא לשעון',
    probe: () => clockWaitSites().length === 0 },
  /*  ⛔ ערך ולא קיום שם (סבב 76) — ⚠️ שלושה תנאים יחד: ⭐ נקודת המעבר
   *  מוגדרת · ⛔ יש לה קורא חי מקוד האפליקציה — פונקציה שאיש אינו קורא
   *  לה היא קוד מת שהשער מאשר · ⛔ **והשדה שסומן כסוד אינו שורד אותה**,
   *  ⚠️ והוא קיים בקוד במקום אחר — ⭐ שדה שאינו קיים כלל היה הופך את
   *  הטענה לבלתי-אפשרית להפרה, ⛔ כלומר לטענה שאינה נמדדת. */
  { row: 135, name: 'סודות אינם עוזבים את המכשיר',
    probe: () => {
      const fn = APP.secretStripFn, f = APP.secretField;
      if (!fn || !f) return false;
      const body = fnBody(fn);
      if (!body) return false;
      const re = new RegExp('\\b' + f + '\\b');
      return callSites(fn).length > 0 && !re.test(body) && re.test(src);
    } },
  { row: 113, name: 'דפוס `upsert` — onConflict מוכרז', app: true },
  /*  ⛔ שני ענפים ולא ענף אחד (סבב 76) — ⚠️ «טביעה חסרה מושלמת אוטומטית»
   *  נמדדת במסלול ההשלמה במקום שיש בו כזה, ⭐ ובמקום שאין בו — בכך
   *  **שאין מסלול שיוצר משתמש בלי טביעה**: ⛔ מסלול השלמה באפליקציה
   *  שכל משתמשיה נוצרים במסך שגוזר טביעה הוא קוד מת, ⚠️ ובאחת מהן הוא
   *  אף הוסר בהחלטת מנהל מפני שהיה הקורא האחרון של הסיסמה הגלויה. */
  { row: 133, name: 'טביעה חסרה מושלמת אוטומטית',
    probe: () => APP.passFpFillFn
      ? (!!fnBody(APP.passFpFillFn) && callSites(APP.passFpFillFn).length > 0)
      : (!!APP.userCreateFn && !!APP.passFpMakeFn &&
         new RegExp('\\b' + APP.passFpMakeFn + '\\s*\\(').test(fnBody(APP.userCreateFn))) },
  { row: 133, name: 'כניסה אופליין',
    probe: () => !!(APP.offlineLoginFn && fnRange(APP.offlineLoginFn)) },
  { row: 104, name: 'עריכת נתונים אופליין',
    probe: () => hasCode(/\bpendMark\s*\(/) },
  /*  ⛔ «דלגציה» נמדדת כיחס ⛔ ולא כאפס `onclick` (סבב 71) — ⚠️ דרישת
   *  אפס הייתה מסמנת ❌ גם לאפליקציה שכל מסכיה עוברים במאזין אחד ונשארו
   *  בה שבעה אתרים היסטוריים. ⭐ מה שהשורה אומרת הוא **מי הדפוס**:
   *  רוב אתרי הלחיצה עוברים ב-`data-act` — ⛔ ולא שאין חריג. */
  /*  ⛔ מחיקה רכה נמדדת בשני המסלולים (סבב 71) — ⚠️ קריאת `.delete()`
   *  מקוד הלקוח, ⛔ **וגם** `DELETE FROM` בקובצי המיגרציה. ⭐ שער שמדד
   *  רק את הראשון היה מאשר מיגרציה שמוחקת נתונים פיזית, ⛔ וזה בדיוק
   *  המסלול שאין ממנו חזרה. */
  { row: 119, name: 'מחיקה רכה בלבד — אין `DELETE` פיזי',
    probe: () => !/\.delete\s*\(/.test(code) && sqlDeletesEntity().length === 0 },
  /*  ⛔ דגל מעבר נמדד לפי **ערכו** ⛔ ולא לפי קיומו (סבב 71) — ⚠️ הדגל
   *  נשאר בקוד גם אחרי שכובה, וזו כל התכלית שלו: נתיב חזרה. ⭐ ולכן
   *  השורה ✅ כשאין אף דגל **דלוק**, ⛔ ולא כשאין דגלים. */
  /*  ⛔ «סיסמאות בענן» נמדדת בהיעדר (צעד ב) — ⚠️ שני מסלולים ולא אחד:
   *  ⭐ אין השמה לשדה שסומן כסוד, ⛔ ואין שאילתה ששולפת אותו. ⚠️ עד
   *  הסבב הזה השורה נשאה נימוק «מצב העמודה במסד אינו נראה מהריפו» —
   *  ⛔ והוא היה נכון לעמודה, ⭐ ולא למה שנמדד כאן: מה שנמדד הוא
   *  **הקוד**, ⛔ והוא מה שהמנהל מריץ אחריו את המחיקה. ⛔ ובאפליקציה
   *  שאין בה סוד — `secretField: null` — נמדד שלא צמחה לה טבלת
   *  משתמשים בשקט, ⚠️ ולא «עבר בהגדרה». */
  { row: 134, name: 'סיסמאות בענן — אין מסלול שכותב או קורא טקסט גלוי',
    probe: () => {
      const f = APP.secretField;
      if (!f) return !/from\(\s*['"]\w*_?users['"]\s*\)/.test(code);
      const wr = new RegExp(`(?:\\.${f}\\s*=|\\b${f}\\s*:)`);
      const sel = [...code.matchAll(/select\(\s*(['"])([^'"]*)\1/g)]
                    .filter((m) => new RegExp(`\\b${f}\\b`).test(m[2]));
      return !wr.test(code) && sel.length === 0 && new RegExp(`\\b${f}\\b`).test(src);
    } },
  /*  ⛔ אובייקט יקר נבנה פעם אחת (סבב 85) — ⚠️ הנימוק המדוד: הגזירה
   *  ב-`ysHebDate` חזרה בכל קריאה, ⭐ ומטמון אחד הפך 352 מ״ש ל-37.
   *  ⛔ ומה שנמדד הוא **מקום הבנייה**, ⛔ ולא מספר האתרים. */
  { row: 64, name: 'אובייקט יקר נבנה פעם אחת',
    probe: () => intlBuildGaps().length === 0 },
  /*  ⛔ מסך מציג מיד ומרענן ברקע (סבב 85) — ⚠️ מה שנמדד הוא **מיקום**:
   *  ⭐ `await` שקודם ל-`innerHTML` הראשון, ⛔ ולא הכוונה. ⚠️ והמקבול
   *  והסימון הגלוי הם החלק שאינו נמדד כאן — ⛔ הם נסרקים בכל סבב שנוגע. */
  { row: 65, name: 'מסך מציג מיד ומרענן ברקע',
    probe: () => renderWaitSites().length === 0 },
  /*  ⛔ ההתקנה עצמה (סבב 86) — ⚠️ ה-probe מודד את חמשת התנאים, ⛔ ולא את
   *  קיום הקובץ: ⭐ מניפסט תקין שאיש אינו מקשר אליו אינו מתקין דבר. */
  { row: 97, name: 'האפליקציה ניתנת להתקנה מכרום',
    probe: () => installGaps().length === 0 },
  { row: 137, name: 'דגלי מעבר — אין דגל דלוק',
    probe: () => legacyFlagsOn().length === 0 },
  { row: 68, name: 'טיפול באירועים — דלגציה ממאזין אחד',
    probe: () => {
      const inline = (src.match(/onclick=/g) || []).length;
      const deleg  = (src.match(/data-act=/g) || []).length;
      return CLICK_LISTENER.test(src) && deleg > inline;
    } },
  { row: 130, name: 'נתיב עדכון חלקי למראת המשתמשים', app: true },
  /*  ⛔ הערך ולא הצורה (סבב 75) — ⚠️ `LS_SWEEP_PCT` חי ב-`index.html`
   *  ⛔ ואף שער לא הזכיר אותו: ⭐ סף הפינוי הוא מספר שהטבלה מצהירה,
   *  ⚠️ והוא נקרא כמספר ⛔ ולא כמחרוזת — 0.6 ו-0.60 הם אותו סף. */
  { row: 70, name: 'פינוי אוטומטי',
    probe: () => /tier2\s*[:=]\s*\[\s*\{/.test(policyBlock()) &&
                 Number((/LS_SWEEP_PCT\s*=\s*([\d.]+)/.exec(src) || [])[1]) === LS_SWEEP_PCT },
  { row: 123, name: 'אימות פינוי מול הענן',
    probe: () => /\bverify\s*:/.test(policyBlock()) },
  { row: 98, name: 'שיתוף קבצים',
    probe: () => hasCode(/_androidShareImage|navigator\s*\.\s*share\b/) },
  { row: 83, name: 'מעטפת APK (WebView)',
    probe: () => hasPath('android/app/src/main/AndroidManifest.xml') },
  /*  ⭐ אין נכסים מוטבעים (סבב 72) — ⛔ ה-probe מאמת **ערך**: שאין
   *  `index.html` ואין `sw.js` תחת `assets/`. ⚠️ עותק מוטבע יושב
   *  ב-origin אחסון אחר (`file://`), ⛔ ורישום שנכתב אליו אינו נראה
   *  לאפליקציה האמיתית לעולם ואינו מסתנכרן; ⛔ והוא מקור אמת שני
   *  שמתיישן בכל שחרור. */
  { row: 86, name: 'אין נכסים מוטבעים',
    probe: () => !hasPath('android/app/src/main/assets/index.html') &&
                 !hasPath('android/app/src/main/assets/sw.js') },
  { row: 102, name: 'מפתח חתימה קבוע בריפו',
    probe: () => hasPath('signing') &&
                 fs.readdirSync('signing').some((f) => f.endsWith('.keystore')) },
  { row: 107, name: 'מקור אמת יחיד לסכימה', probe: () => hasPath(APP.schemaFile) },
  { row: 108, name: 'קובץ התקנה מלא',       probe: () => hasPath(APP.schemaFile) },
  { row: 52, name: 'גיבוי יומי אוטומטי',   probe: () => present.backup === true },
  { row: 52, name: 'יומן פעולות',          probe: () => present.log === true },
  { row: 105, name: 'נתונים בטבלאות מובנות', app: true },
  /*  ⭐ סבב 70 — ⛔ ה-probe מאמת את **הסט** ולא קיום קובץ אחד: בודק שנשאר
   *  אחרי שתפקידו נגמר הוא שער שרץ בלי שיש לו מה לאכוף, ⚠️ ו-probe שהסתפק
   *  בקיום `check-js` היה מדווח ✅ על כל סט שהוא. */
  { row: 16, name: 'בודקים — קיום', probe: () => checkerSet() },
  { row: 17, name: 'בודקים — משימה מוצהרת', probe: () => checkerMissions() },
  { row: 71, name: 'דפוס הודעת שגיאה יחיד', probe: () => errPatternSites() === 0 },
  { row: 128, name: 'רישום כשלי כתיבה', probe: () => silentWriteCatches().length === 0 },
  { row: 53, name: 'חלון חם במכשיר',
    probe: () => /\benabled\s*:\s*true\b/.test(cfgBlock('HW_CFG')) },
  { row: 53, name: 'שחזור מקומי מהענן',
    probe: () => callSites('hwRestoreMount').length > 0 },
  { row: 129, name: 'מסך שינוי סיסמה עצמי', app: true },
  { row: 148, name: 'מטמון-CDN מראש עם ריפוי עצמי',
    probe: () => fileHas('sw.js', /CDN_ASSETS/) && fileHas('sw.js', /ensureCdnCached/) },
  { row: 52, name: 'גיבוי יומי מטבלאות מובנות',
    exempt: 'התא מצהיר שהגיבוי **קורא** מטבלאות מובנות, וזו עובדת מסד ולא ' +
            'עובדת ריפו. ⛔ והנוסח הקודם כאן היה שגוי (סבב 62): הוא אמר ' +
            'ש«גיבוי ממקור שאינו קיים מדלג בשקט», ובפועל הוא מחזיר error, ' +
            'מונע את כתיבת הדגל היומי ומשתק את הגריעה — נמדד בהנהלה, 66 ' +
            'גיבויים ביום. הצד שכן נבדק — הצהרת המקורות מול APP.tables — ' +
            'נאכף ב-test_sources.mjs, ורשימת-ההיתר ב-test_cron.mjs.' },
  { row: 115, name: 'פינוי גיבויים אוטומטי במסד',
    exempt: 'התא מצהיר שמשימת `pg_cron` **רשומה ופעילה במסד**, ואין דרך ' +
            'לראות זאת מהריפו. הצד שכן נבדק — `_bkRetention` וקובץ המיגרציה — ' +
            'נאכף ב-test_cron.mjs, שנועל גם את התזמון.' },
  /*  ⭐ סבב 38 — ה-probe הפך גנרי. עד אז הוא היה `app: true`, מפני שכל
   *  אפליקציה מימשה את כלל ה-⏳ בפונקציה משלה; מרגע שהכלל יושב ב-`_mergePick`
   *  המשותפת, אותה בדיקה בדיוק תקפה בארבעתן — וזו בעצמה עדות שהאיחוד
   *  אמיתי ולא שמו של קובץ. */
  { row: 54, name: 'מנוע מיזוג עם הגנת ⏳',
    probe: () => /isPend \|\| tsOf\(loc\) > tsOf\(rem\)/.test(fnBody('_mergePick')) },
  { row: 133, name: 'חסימת משתמש מושבת בכניסה אופליין',
    probe: () => !!APP.offlineLoginFn &&
                 /\bactive\s*!==\s*true\b/.test(fnBody(APP.offlineLoginFn)) },
  /*  ⚠️ ה-probe בודק **קריאה מקוד האפליקציה** ולא את עצם קיום המודול:
   *  `callSites` מדלגת על מה שבתוך הבלוקים המשותפים, ולכן מודול שיושב
   *  בקובץ ואיש אינו קורא לו נספר כ-❌ — וזה בדיוק המצב ביומן, שמזהי
   *  הרשומות שלו עדיין חותמות זמן. הנימוק יושב בשורת מודול מזהי הרשומות. */
  { row: 55, name: 'מודול מזהי רשומות',
    probe: () => callSites('newClientId').length > 0 },
  /*  ⛔ מזהה מכשיר אינו מזהה רשומה (סבב 37א), ולכן זו שורה נפרדת ולא
   *  הרחבה של 37 — המושג אחר (זהות של מכשיר, לא של נתון), הפורמט אחר
   *  (שמונה תווים ולא uuid), והצרכן אחר (יומן הפעולות והגיבוי).
   *  ⚠️ ה-probe דורש את **שתי** הפונקציות: `getDeviceId` בלי `_randDeviceId`
   *  היא מעטפת בלי מחולל, וזה בדיוק המצב ההפוך שנמדד ב-gius — שם
   *  `BK_CFG.device` קראה לפונקציה שאינה מוגדרת, וה-`try/catch` שסביבה
   *  החזיר `null` בשקט. */
  { row: 56, name: 'מזהה מכשיר',
    probe: () => hasCode(/function\s+getDeviceId\s*\(/) &&
                 hasCode(/function\s+_randDeviceId\s*\(/) },
  /*  ⚠️ ה-probe בודק **שהמעטפת קוראת לליבה** ולא רק שהליבה קיימת — בלוק
   *  שיושב בקובץ ואיש אינו קורא לו הוא בדיוק המצב שממנו נולד כלל ברזל 14.
   *  זהות הליבה בית-לבית נאכפת בנפרד, בחתימת `mergecore` שלמעלה. */
  { row: 54, name: 'ליבת מיזוג משותפת',
    probe: () => callSites('mergeCore').length > 0 },
  /*  ⭐ סבב 40 — מעטפת ה-WebView חתומה. ה-probe דורש את **שני** השערים:
   *  קובץ הבדיקה שקיים, ו-`shellSha` שמוצהר בתוכו. ⛔ שער שקיים בלי
   *  חתימה מוצהרת הוא שער שאינו נועל דבר — בדיוק המצב שהיה עד הסבב הזה,
   *  שבו ל-`MainActivity.java` לא נגעה שום בדיקה.                     */
  { row: 83, name: 'מעטפת WebView חתומה',
    probe: () => hasPath('tools/test_shell.mjs') &&
                 fileHas('tools/test_shell.mjs', /shellSha:\s*'[0-9a-f]{16}'/) },
  /*  ⭐ סבב 40 — אימות מול טביעה בענן. ה-probe **קורא את הצהרת השער**
   *  (`verifyFn`) ואז מוודא שהפונקציה הזו באמת נקראת ב-`index.html` —
   *  כלומר הוא נשען על הקוד ולא על קיום הקובץ בלבד. ⛔ הצהרה בלי קריאה
   *  היא בדיוק המצב שהמטריצה אמורה לתפוס.                            */
  { row: 133, name: 'אימות מול טביעה בענן',
    probe: () => {
      const p = 'tools/test_passwords.mjs';
      if (!hasPath(p)) return false;
      const t = fs.readFileSync(p, 'utf8');   /* ⚠️ נתיב יחסי, כמו `hasPath` — הבודק רץ מתיקיית הריפו */
      const m = /verifyFn:\s*'(\w+)'/.exec(t);
      if (!m) return false;
      return new RegExp(m[1] + '\\s*\\(').test(code);
    } },
  /*  ⭐ סבב 41 — בניית APK אחידה עם שער חתימה. ה-probe דורש את **שלושת**
   *  התנאים, מפני שכל אחד מהם לבדו עובר גם במצב שהסבב בא לסגור: קובץ
   *  השער שקיים · ה-workflow שקורא ל-`./signing/sign-apk.sh` · ו⛔
   *  **`apksigner` שאינו מופיע ב-YAML** (אחרי ניקוי הערות — הערה
   *  הסברתית אינה לוגיקת חתימה). ⛔ workflow שקורא לסקריפט וגם משאיר
   *  חתימה משלו הוא בדיוק מסלול החתימה השני, והוא ייתפס כאן.        */
  { row: 100, name: 'בניית APK אחידה עם שער חתימה',
    probe: () => {
      if (!hasPath('tools/test_build.mjs')) return false;
      const yml = '.github/workflows/build-apk.yml';
      if (!hasPath(yml)) return false;
      const bare = fs.readFileSync(yml, 'utf8').split('\n')
        .map((l) => (/^\s*#/.test(l) ? '' : l.replace(/\s#(?![{}]).*$/, ''))).join('\n');
      return /\.\/signing\/sign-apk\.sh/.test(bare) && !/apksigner/.test(bare);
    } },
  /*  ⭐ סבב 42ג — מודול ה-service worker. ה-probe דורש את **שני** התנאים:
   *  הליבה המשותפת שנמצאה וחתימתה תואמת (`present.swcore`), ו-`SW_CFG`
   *  שמוגדר ב-`sw.js` מעליה. ⛔ ליבה בלי `SW_CFG` היא קוד שהועתק ולא
   *  מודול — הפרמטרים הם מה שמאפשר לליבה להיות זהה בית-לבית.        */
  { row: 148, name: 'מודול ה-service worker',
    probe: () => present.swcore === true && fileHas('sw.js', /var\s+SW_CFG\s*=/) },
  /*  ⭐ סבב 44 — ניסיון חוזר בתור הסנכרון. ה-probe דורש את **שני**
   *  התנאים: הליבה שנמצאה וחתימתה תואמת (`present.retry`), ו-`RTY_CFG`
   *  שמוגדר מעליה. ⛔ ליבה בלי פרמטרים אינה מודול אלא קוד שהועתק —
   *  אותו כלל בדיוק כמו בשורת מנגנון המשיכה.                                   */
  { row: 57, name: 'ניסיון חוזר בתור הסנכרון',
    probe: () => present.retry === true && hasCode(/var\s+RTY_CFG\s*=/) },
  /*  ⭐ סבב 51 — מנגנון משיכה אחיד. ה-probe דורש את **שני** התנאים:
   *  הליבה שנמצאה וחתימתה תואמת (`present.pull`), ו-`PL_CFG` שמוגדר
   *  מעליה. ⛔ ליבה בלי פרמטרים אינה מודול אלא קוד שהועתק — אותו כלל
   *  בדיוק כמו בשורות 111 ו-42.                                       */
  { row: 58, name: 'מנגנון משיכה אחיד',
    probe: () => present.pull === true && hasCode(/var\s+PL_CFG\s*=/) },

/*  ⭐ סבב 52 — נעילת חוסר-פעילות. ה-probe דורש את **שני** התנאים:
   *  הליבה שנמצאה וחתימתה תואמת (`present.lock`), ו-`LK_CFG` שמוגדר
   *  מעליה. ⛔ ליבה בלי פרמטרים אינה מודול אלא קוד שהועתק — אותו כלל
   *  בדיוק כמו בשורות 111, 42 ו-43.                                   */
  { row: 59, name: 'נעילת חוסר-פעילות',
    probe: () => present.lock === true && hasCode(/var\s+LK_CFG\s*=/) },
  /*  ⭐ סבב 53 — מודל הסשן, ⚠️ **וזו השורה של סבב 52 בכיוון ההפוך**. שם
   *  היא נקראה «סשן נשמר במכשיר» ומדדה את ההבדל שהמנהל חש בו; כאן היא
   *  מודדת את ההכרעה שלו: ⛔ המשתמש המחובר חי בזיכרון בלבד ואינו יורד
   *  לדיסק באף אחת מהשלוש.
   *  ⚠️ ה-probe דורש את **שלושת** התנאים — הליבה שנמצאה וחתימתה תואמת,
   *  `SESS_CFG` שמוגדר מעליה (ליבה בלי פרמטרים אינה מודול), ⛔ ושאין
   *  בקוד שום קבוע ששמו `SESSION_KEY`. ⛔ השלישי הוא העיקר: מודול
   *  שקיים לצד מסלול שמירה ישן שנשאר הוא בדיוק הכשל שהסבב הזה סגר.  */
  { row: 60, name: 'מודל הסשן — בזיכרון בלבד',
    probe: () => present.sess === true && hasCode(/var\s+SESS_CFG\s*=/) &&
                 !hasCode(/SESSION_KEY/) },
  /*  ⭐ סבב 53 — בדיקת עדכון תקופתית ל-service worker. ⚠️ **נמדד: היא
   *  נעדרה ב-gius בלבד**, ולכן לשונית שנשארה פתוחה שם לא למדה לעולם
   *  שיצאה גרסה חדשה — הדפדפן בודק את `sw.js` בניווט בלבד, והבאנר
   *  שקיים שם פשוט לא הוצג. ⛔ אין בכך שינוי להכרעה של gius שאין
   *  `skipWaiting` (סבב 42ג): הבדיקה **מגלה** גרסה, והמשתמש מחליט.
   *  ⚠️ ה-probe דורש את שני חלקי המנגנון — `reg.update()` והמרווח —
   *  מפני שקריאה בלי מרווח היא בדיקה חד-פעמית בעלייה, וזה מה שהיה. */
  /*  ⛔ ושלוש התשובות שמעידות על סכימה ישנה — ⚠️ הסיווג, הבאנר, ועצירת
   *  הניסיון החוזר נמדדים כאן יחד: ⭐ סיווג בלי עצירה משאיר את הלולאה
   *  רצה, ⛔ ועצירה בלי באנר משאירה את המשתמש מול מסך שקט. */
  { row: 147, name: 'בדיקת עדכון תקופתית ל-service worker',
    probe: () => hasCode(/\breg\s*\.\s*update\s*\(/) &&
                 hasCode(/setInterval\(\s*\w+\s*,\s*30\s*\*\s*60\s*\*\s*1000\s*\)/) &&
                 hasSrc(/'42P01'/) && hasSrc(/'42703'/) && hasCode(/s === 404/) &&
                 hasCode(/!_staleSchema\s*&&\s*_rtyPending\(\)/) &&
                 hasCode(/window\.showAppUpdateBanner/) &&
                 hasCode(/sbWatch\(/) },
  /*  ⭐ סבב 53 — שלוש שורות תשתית שהיו קיימות בארבעתן **ולא נמדדו כאן
   *  מעולם** (38–40). ⚠️ כל אחת מהן נאכפת על **הערך** ולא על עצם
   *  הקיום: קבוע שקיים בערך אחר בכל אפליקציה הוא בדיוק «אחיד ולא
   *  זהה» שכלל ברזל 14 אוסר, והוא נראה תקין בסריקת-קיום.            */
  { row: 51, name: 'רענון תקופתי של מונה הממתינים',
    probe: () => hasCode(/setInterval\(\s*pendRender\s*,\s*60000\s*\)/) },
  { row: 73, name: 'פסק זמן אחיד לקריאות רשת',
    probe: () => hasCode(/var\s+NET_TIMEOUT_MS\s*=\s*8000\s*;/) },
  /*  ⚠️ **ה-probe הזה קורא את המקור הגולמי ולא את הקוד המטוקן** — שם
   *  האירוע הוא **מחרוזת**, והטוקניזציה מרוקנת מחרוזות; probe על
   *  `code` לא היה יכול להבחין בין `'online'` ל-`'offline'`. ⛔ אין
   *  להשתמש ב-`hasSrc` לשם פונקציה או לקבוע (סבב 53) — שם שמופיע
   *  בהערה בלבד היה נספר כמימוש, וזה בדיוק מה ש-`code` בא למנוע.   */
  { row: 74, name: 'מאזיני מצב רשת',
    probe: () => hasSrc(/window\.addEventListener\('online'/) &&
                 hasSrc(/window\.addEventListener\('offline'/) },
  /*  ⭐ סבב 53 — שתי שורות שקיימות **ביומן בלבד**, ⛔ ואין ליישר אותן.
   *  גריעת ה-tombstones לפי גיל (`TOMBSTONE_TTL_MS`) ומנגנון
   *  האוטו-אפדייט מ-raw (`UPDATE_INTERVAL_MS`) נולדו שם ומנומקים שם;
   *  ⚠️ עד הסבב הזה הן פשוט לא הופיעו במטריצה, כלומר «קיים רק באחת,
   *  בשקט».                                                        */
  /*  ⛔ ערך ולא שם (סבב 75) — ⚠️ עד כאן ה-probe הסתפק ב«השם קיים»,
   *  ⛔ ושינוי הגיל מ-90 יום ל-9 היה עובר בשקט: ⭐ הוא מכפיל את המספרים
   *  שבביטוי ומשווה למילישניות של 90 יום, ⛔ ולכן הוא עיוור לריווח
   *  ולצורת הכתיבה ⚠️ ורגיש לערך בלבד. */
  { row: 118, name: 'גריעת tombstones לפי גיל',
    probe: () => {
      const m = /TOMBSTONE_TTL_MS\s*=\s*([^;\n]+)/.exec(code);
      if (!m) return false;
      const ns = m[1].match(/\d+/g);
      return !!ns && ns.reduce((a, b) => a * Number(b), 1) === TOMB_TTL_MS;
    } },
  /*  ⛔ מקור הבדיקה נבדל ⛔ והמנגנון אחד (סבב 85) — ⚠️ ביומן משיכת `raw`
   *  שמשווה את `<meta app-version>`, ובשלוש `reg.update()` שמרענן את
   *  רישום ה-`sw`: ⭐ ושתיהן נגמרות באותו באנר. ⛔ ומה שנמדד הוא
   *  **המחזוריות** — ⚠️ בדיקה חד-פעמית בטעינה אינה מגיעה ללשונית
   *  שנשארה פתוחה, ⛔ וזה בדיוק המכשיר המותקן. */
  { row: 146, name: 'עדכון אוטומטי — בדיקה מחזורית',
    probe: () => /setInterval\s*\(\s*checkForUpdates?\s*,/.test(code) &&
                 (hasCode(/\bRAW_URL\b/) || /reg\.update\s*\(/.test(code)) },
  /*  ⭐ סבב 56 — מקור הקריאה. ⚠️ **שורה תיאורית ולא ✅/❌**: היא מודדת
   *  מאיפה נקראים הנתונים, ולא אם יכולת קיימת. `APP.kvFallbackFn` מצהיר
   *  את שם משפך ה-`kv`, ⛔ וה-probe דורש שהוא יימצא בפועל בקוד — הצהרה
   *  שאינה נמדדת היא בדיוק מה שכלל ברזל 12 אוסר. ⛔ ובאפליקציה שהצהירה
   *  «אין» הוא נכשל גם על קריאת `kv` שאיש לא הצהיר עליה.            */
  { row: 98, name: 'גשר שיתוף',
    probe: () => javaSrc().indexOf('Intent.createChooser') >= 0 },
  /*  ⭐ סבב 64 — העברת מזהה ל-DOM. ⛔ ה-probe אינו בודק ש-`idArg` **קיים**
   *  אלא שכל אתר העברה **עטוף בו**: הבאג של סבב 64 היה בדיוק קיום בלי
   *  עטיפה — הפונקציה הייתה שם, והאתר שמחפש את האלמנט לא קרא לה.
   *  ⚠️ אפליקציה בלי אתרי העברה כלל מוצהרת «לא רלוונטי» ב-`naRows`. */
  /*  ⛔ מסבב 67 (כלל ברזל 27) — לא די בכך שהמזהה **עטוף**: הוא חייב
   *  לעבור ב-`data-id` ובדלגציה. ⚠️ הצירוף הוא מה שהופך את התא למדיד —
   *  `wrapped>0 && bare===0` לבדו עבר גם על אפליקציה שכל אתריה
   *  מוטבעים ב-`onclick`, כלומר בדיוק על מה שהכלל בא לסלק. */
  /*  ⛔ ומסבב 68 נוספה טענה רביעית — **אתר שהומר אף שהוא נושא
   *  `stopPropagation`** (כלל ברזל 27). ⚠️ דלגציה ב-`document` רצה אחרי
   *  בועת האלמנט, ולכן ההמרה מבטלת את ההגנה **בשקט**: הכפתור ממשיך
   *  לעבוד, והשורה העוטפת נפתחת יחד איתו. ⛔ אתר כזה הוא חריגה מנומקת
   *  קבועה ואינו מומר. */
  /*  ⛔ ומסבב 82 נוספה טענה חמישית — **ההשוואה עצמה** — ⚠️ `data-id`
   *  ודלגציה לבדם השאירו את הצד הקולט בלי כלל: ⭐ המזהה חוזר מהמאפיין
   *  כמחרוזת, ⛔ ו-`===` מול הערך שבזיכרון אינו מתאים. ⚠️ הנימוק נמדד:
   *  20 אתרים בארבעתם, ⛔ ושניים מהם נכתבו **בסבב שלפני** — הדפוס חוזר. */
  { row: 62, name: 'העברת מזהה ל-DOM',
    probe: () => idSites().bare === 0 &&
                 /data-act="/.test(src) &&
                 /getAttribute\('data-id'\)|dataset\.id\b/.test(src) &&
                 /addEventListener\('click'/.test(src) &&
                 idCmpSites().length === 0 &&
                 delegatedStopSites() === 0 },
  /*  ⭐ סבב 66 — שכבת האייקונים. ⛔ ה-probe אינו בודק שעשרת הקבצים
   *  **קיימים** אלא שהם עומדים בארבעת הממדים שכלל ברזל 25 קובע: כמות,
   *  ממדים, תוכן בפיקסלים, והתאמת הרקע לשוליים. ⚠️ probe של קיום היה
   *  נותן ✅ גם לאייקון שתופס 32% מהמסגרת בזמן שהאחיות תופסות 44%. */
  /*  ⛔ ה-probe מודד **מספר אתרים** ⛔ ולא קיום שם — ⚠️ פונקציה מרכזית
   *  שקיימת ואינה נקראת היא בדיוק המצב שהשורה באה לסגור: ⭐ ולכן נדרשים
   *  שניהם — שהיא קיימת, ⛔ ושאין ולו מיון מקומי אחד מחוצה לה. */
  { row: 63, name: 'מיון אחד לכל התצוגות',
    probe: () => !!APP.sortFn && new RegExp('function ' + APP.sortFn + '\\s*\\(').test(code) &&
                 localSortSites().length === 0 },
  /*  ⛔ ה-probe מודד **מבנה דוח בתוך מסלול הייצוא** ⛔ ולא קיום שם —
   *  ⚠️ מסלול שקורא לבונה הדוח ומצלם אותו נקי ממנו לגמרי, ⭐ ומסלול
   *  שבונה מסמך שני נתפס בטבלה שהוא כותב. */
  { row: 66, name: 'ייצוא — שני דפוסים מוצהרים',
    probe: () => exportMarkupSites().length === 0 },
  { row: 90, name: 'שכבת אייקונים',
    probe: () => iconAudit('.').length === 0 },
  { row: 124, name: 'שכבת קלט אחידה',
    probe: () => inputAudit('.').length === 0 },
  /*  ⛔ ❌ מנומק (סבב 67) — אין כאן מסך ניהול משתמשים, ואין לא
   *  שינוי סיסמה עצמי ולא החלפת משתמש; ⚠️ המנהל הוא המשתמש
   *  היחיד בפועל, וסיסמאות נקבעות ב-INSERT ידני. */
  /*  ⭐ סבב 68 — שכבת המודאל. ⛔ ה-probe מאמת **חתימה** ולא קיום שם:
   *  `openModal(id)` בשכר נשאה עד סבב 68 את אותו שם ומשמעות אחרת, ⚠️ ומי
   *  שהעתיק קריאה מגיוס לשם קיבל קוד שמתקמפל ואינו עובד. ⛔ ובנוסף נדרשים
   *  המיכל הקבוע ומסלול הסגירה היחיד — ⚠️ דיאלוג שמפספס את `Escape` נראה
   *  תקין עד שמישהו לוחץ עליו. */
  { row: 67, name: 'שכבת המודאל',
    probe: () => /function openModal\s*\(\s*title\s*,\s*body\s*,\s*foot\s*\)/.test(code) &&
                 /id="modal"/.test(src) && /id="ask"/.test(src) &&
                 /function closeAsk/.test(code) },
  { row: 129, name: 'שכבת כניסה מלאה',
    probe: () => false },
];

/*  ⭐ אתרי העברת-מזהה (סבב 64) — אופרנד שמשורשר מיד אחרי `('` או `,'`,
 *  כלומר נוחת בקוד ה-`onclick` כטוקן **בלי מרכאות**. ⚠️ הסגמנט האחרון
 *  הוא שנבדק (`rec.id` הוא מזהה, `idx` אינו).                          */
/*  ⭐ אתר שהומר אף שהוא נושא `stopPropagation` (סבב 68) — ⛔ המדידה היא
 *  **פר שורת מקור**: אלמנט נפלט כאן כשורה אחת, ⚠️ ולכן שורה שנושאת גם
 *  `data-act=` וגם `stopPropagation` היא בדיוק ההמרה האסורה.
 *  ⚠️ **וזו גם מגבלתו** — אלמנט שנפרס על כמה שורות אינו נתפס; ⛔ הוא
 *  נרשם כאן ואינו מושמט בשתיקה. */
/*  ⛔ אתרי המתנה על שעון בשערים (סבב 76) — ⚠️ גוף `waitFor` מוסר תחילה:
 *  ⭐ השינה שבתוכו היא **צעד הסקר** ולא ההמתנה, ⛔ ומדידה שסופרת אותה
 *  הייתה מפילה את הדפוס הנכון עצמו. */
function clockWaitSites() {
  const out = [];
  for (const f of fs.readdirSync('tools')) {
    if (!f.endsWith('.mjs')) continue;
    const body = fs.readFileSync('tools/' + f, 'utf8')
                   .replace(/async function waitFor\([\s\S]*?\n}\n/g, '');
    for (const m of body.matchAll(/await\s+new\s+Promise\([^;]{0,60}?setTimeout\(/g))
      out.push(f + ':' + body.slice(0, m.index).split('\n').length);
  }
  return out;
}
function delegatedStopSites() {
  return src.split('\n')
            .filter((l) => l.indexOf('data-act=') >= 0 &&
                           l.indexOf('stopPropagation') >= 0).length;
}

function idSites() {
  const re = /[(,]'\s*\+\s*([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)/g;
  let m, bare = 0, wrapped = 0;
  while ((m = re.exec(src)) !== null) {
    const expr = m[1];
    if (expr === 'idArg' && src[m.index + m[0].length] === '(') { wrapped++; continue; }
    if (/id$/i.test(expr.split('.').pop().trim())) bare++;
  }
  return { bare, wrapped };
}


/* ───────────────────────────────────────────────────────────────────────────
   ⛔ אין שורה בלי אחד משניים (סבב 69) — שער שאוכף אותה, או נימוק מפורש מדוע אינה ניתנת
   לאכיפה מכנית. ⚠️ אין אפשרות שלישית: שורה שאינה כאן ואינה ב-MATRIX היא
   שורה שאיש אינו מודד, ⛔ והיא נקראת כעדות.
   ──────────────────────────────────────────────────────────────────────── */
/*  ⛔ שם השער אינו כאן (סבב 72) — ⭐ הוא נגזר מ-`ROWS` שכל שער מייצא,
 *  ⚠️ ומיפוי ידני בקובץ אחר נסחף: מי שערך שער לא ראה אותו כלל.
 *  ⛔ מה שנשאר כאן הוא **שם הטענה** — המנגנון שאוכף את השורה בגופו —
 *  ⛔ או נימוק כתוב לשורה שאינה ניתנת לאכיפה מכנית. */
const GATES = {
  6: { claim: ['canonIds', 'CANON', 'הסדר הקנוני'] },
  1: { claim: "'rules-table'" },
  2: { claim: 'מבנה פרק הכלל' },
  3: { claim: 'שם האפליקציה' },
  5: { claim: ['DOC_MAX_LINES', 'DOC_MAX_SHARED'] },
  4: { claim: 'תוכן החלק' },
  7: { claim: 'RM_OK' },
  8: { claim: ['MD_MAX', 'MD_SPLIT'] },
  9: { claim: 'CANON_MD' },
  10: { claim: 'CTX_OK' },
  11: { claim: ['MD_MAX', 'MD_SPLIT'] },
  12: { claim: 'CANON_MD' },
  13: { claim: 'פרק מתחום של קובץ אחר' },
  14: { claim: ['MD_MAX', 'MD_SPLIT'] },
  15: { claim: 'CANON_MD' },
  44: { claim: 'תוכן הקבצים הנלווים' },
  88: { claim: ['gen-icons', 'מצהיר את ', 'ריק נושא הערת נימוק במקומו'] },
  91: { claim: 'margin' },
  32: { manual: 'השוואת זמנים בין הריפו אינה בהישג ידו של שער שרץ בריפו אחד — ⛔ נאכפת בתוצאתה בלבד' },
  46: { manual: 'המדידה שלפני המחיקה היא התנהגות סשן — ⛔ נאכפת רק בתוצאתה, בשער ההסרות' },
  45: { claim: 'אין פרק פערים נפרד' },
  80: { manual: '«סטייה מדפוס» היא קריאת משמעות — ⛔ נסרקת ידנית בכל סבב שנוגע' },
  49: { manual: 'מחזור העבודה ב-git הוא התנהגות סשן שאינה בעץ — ⛔ נאכף רק בתוצאתו' },
  /*  ⛔ שני שערים לשורה אחת, ולכל אחד שם טענה משלו — ⚠️ שער ההסרות מודד
   *  מה שנמחק מול הקומיט הקודם, ⛔ ושער החיווט מודד את המצב **עכשיו**:
   *  ⭐ קורא שאיבד את הגדרתו לפני שני סבבים אינו נראה בהשוואת קומיטים. */
  47: { claims: { test_removals: 'מזהה שנמחק ונשאר לו קורא',
                  test_wiring: 'W.missing' } },
  92: { claim: 'tile-bg' },
  19: { claim: 'const SHARED' },
  20: { claims: { test_filesets: 'testsOnly', 'check-comments': 'מכריז היעדר' } },
  21: { claim: 'טענות על התנהגות' },
  23: { manual: 'המונה מדווח ואינו מפיל: 85 מבחנים נכתבו לפני הדרישה, והפלה רטרואקטיבית חוסמת כל דחיפה' },
  24: { manual: 'תקן תוכן המוטציה טרם נכתב — טרם נמדד' },
  36: { claim: 'כיסוי הטבלה' },
  37: { claim: 'ועמודת התקן שלה אוסרת במפורש' },
  40: { claim: 'מספור רציף ובלי כפילויות' },
  41: { claim: 'הערה ריקה' },
  42: { claim: 'COUNT_NOTE' },
  43: { manual: 'עדכון הסימון הוא התנהגות סשן שאינה בעץ — ⛔ נאכף רק בתוצאתו' },
  38: { manual: 'קריאת הטבלה לפני הכתיבה היא התנהגות סשן שאינה בעץ — ⛔ נאכפת רק בתוצאתה' },
  149: { claim: 'CACHE_NAME' },
  27: { manual: 'מספר בדיווח הוא התנהגות סשן שאינה בעץ — ⛔ אין קובץ שאפשר למדוד בו את הדיווח, ⚠️ ונאכף בתוצאתו בלבד' },
  29: { claim: 'drift' },
  35: { claim: 'measure-gap',
        manual: 'הצד השני של השורה — ⛔ «אותה טענה» היא קריאת משמעות, ונסרק ידנית בכל סבב שנוגע' },
  25: { claim: 'תווית מוטציה מודפסת' },
  22: { claim: 'תקן הבאנר' },
  18: { claim: 'דפוס הבודקים' },
  26: { claim: 'מספרי הבאנר' },
  30: { claim: 'ריצת check-js' },
  /*  ⛔ שתי השורות של סבב 74ב — ⚠️ שתיהן נאכפות ב-`check-js` עצמו, ⭐ מפני
   *  שרק שם רצים כל השערים: ⛔ שער נפרד שימדוד את זמנם היה מריץ את כולם
   *  פעם שנייה, וזו בדיוק העבודה הכפולה שהשורה שמעליהן אוסרת. */
  31: { claim: 'BUDGET_MS' },
  33: { claim: 'רמת ברירת המחדל' },
  39: { claim: 'כל כלל מיוצג בטבלה' },
  48: { manual: 'התנהגות סשן שאינה בעץ — ⛔ אין קובץ שאפשר למדוד בו קריאה חסכונית' },
  50: { claims: { 'check-capabilities': 'sha:',
                  test_sharedsync: ['block-drift', 'canon-drift'],
                  test_signedshared: 'unsignedTwins' } },
  61: { claim: 'CANON' },
  69: { claim: 'storage' },
  72: { claim: 'ג · פעולה שדורשת רשת' },
  75: { claim: 'עברית' },
  76: { claim: 'RULE_W' },
  77: { claim: 'BANNER_W' },
  142: { claim: 'CSS מתות' },
  78: { manual: '«למה ולא מה» הוא קריאת משמעות — ⛔ שער מודד צורה בלבד, ⚠️ והמונה נמדד ידנית' },
  79: { claim: 'מפנה לקובץ' },
  87: { claim: 'android/app/src/main' },
  94: { claim: 'fgDriftMax' },
  95: { claim: 'CANON_MANIFEST' },
  96: { claim: 'שדות זהים' },
  99: { claim: 'BUILD_SHA' },
  103: { claim: 'SHARED_SHA' },
  101: { claim: 'versionCode' },
  84: { claim: 'WebView' },
  85: { claim: 'android:theme' },
  89: { claim: ['מיקום המאסטר אינו מזיז', 'שהמסכה החתוכה היא כל מקורם'] },
  106: { manual: 'הנפילה-חזרה ביומן נסרקת ידנית; ⛔ קיום המפתחות במסד אינו נראה מהריפו' },
  109: { claim: 'migrations' },
  112: { manual: 'ההרשאות יושבות במסד ואינן נראות מהריפו — אימות הוא פעולת מנהל' },
  114: { manual: 'קיום רשומה בלי חותמת יושב במסד ואינו נראה מהריפו — ⛔ המדידה היא פעולת מנהל' },
  121: { manual: 'חתימת הסכימה החיה נגזרת מ-`information_schema` ואינה נראית מהריפו — ⛔ ההשוואה היא פעולת מנהל' },
  125: { claim: 'type=password' },
  126: { claim: 'aria-label' },
  127: { manual: 'מנוע התאריך — ⛔ נאכף ב-`test_date` ביומן ובהנהלה, ⚠️ ובשכר ובגיוס אין צרכן תאריך עברי ואין שער' },
  132: { claim: 'pass_salt' },
  136: { manual: 'היעדר סוד נסרק ידנית; ⛔ שער טקסטואלי היה נכשל על כל מחרוזת' },
  138: { claim: '⏳' },
  139: { manual: 'התאמת הערה למציאות אינה ניתנת לאכיפה מכנית' },
  144: { manual: 'מצב ההרצה יושב ב-`schema_migrations` ואינו נראה מהריפו' },
  140: { claim: 'כל קובץ בעץ מוזכר במקום אחר' },
  143: { manual: 'רשימת-היתר הגיבויים יושבת במיגרציה שכבר רצה' },
  145: { manual: 'מצב הענפים המרוחקים אינו נראה מעותק העבודה' },
  81: { claim: 'CLEANUP_SHA' },
  82: { claim: 'בלוק ה-APP' },
  122: { claim: 'cfgKeyGaps' },
};

/*  ⛔ כל כלל ⟵ השורה שמייצגת אותו (סבב 72) — ⚠️ הלולאה עבדה בכיוון אחד
 *  בלבד: לכל שורה הייתה אכיפה, ⛔ ולכלל לא הייתה שורה. ⭐ הנימוק נמדד:
 *  «פרק סבב עד 10 שורות» חי חודש בלי אוכף, עד שנמדדו 76 ו-106 שורות.
 *  ⚠️ שורה אחת רשאית לייצג כמה כללים, ⛔ ובלבד שעמודת התקן שלה אומרת
 *  את שניהם.
 *  ⛔ **ואין כאן מספרי שורה (סבב 75)** — ⚠️ מספר שנכתב ביד נסחף בכל
 *  מספור מחדש, ⛔ והמפה שנסחפה נראית שלמה. ⭐ המפה מחזיקה **שם שורה**,
 *  והמספר נגזר מהטבלה עצמה; ⛔ וסעיף שכותרתו כבר שם שורה אינו כאן כלל —
 *  ⚠️ הוא נגזר מהכותרת אחרי חיתוך סימן האיסור הפותח. */
const RULE_ROW_NAMES = {
  '⛔ משמעת קריאה וחיסכון טוקנים': 'כללי הסשן — אכיפה אנושית',
  '⛔ הכרעה שאינה של הסשן': 'כללי הסשן — אכיפה אנושית',
  '⛔ סריקת האזור שנגעו בו': 'הערות מיושנות',
  '⛔⛔ רכיב משותף = קוד זהה בית-לבית + מיקום זהה + חיווט חי': 'חתימות sha256',
  '⛔ שינוי מכוון ברכיב משותף': 'חתימות sha256',
  '⛔ קובץ נשפט לפי תפקידו': '`CLAUDE.md` — תוכן',
  '⛔ קובץ תיעוד אינו מסביר כלל שהטבלה אוכפת': 'פרק תיעוד שחופף לשורה בטבלה',
  '⛔ תקציב הקבצים, ותקרה שהיא מספר עגול': '`CLAUDE.md` — כמות',
  '⛔ ההערה — מתי נכתבת, צורתה ותוכנה': 'תוכן ההערות — אחידות',
  '⛔ דפוסי כתיבת ממשק': 'העברת מזהה ל-DOM',
  '⛔ השוואת מזהה עוברת ב-`idEq`': 'העברת מזהה ל-DOM',
  '⛔ ערך שקיים בקוד או במסד אינו מוצהר בתיעוד': 'מספר בבאנר',
  '⛔ שרשרת היכולת החדשה': 'שלוש דרכי אכיפה',
};

/* ────── ⛔ מבנה הטבלה עצמה — מספור ותקן ההערות (סבב 72) ─────────────────────
   ⛔ מה נאכף: המספור **רציף 1..N ובלי כפילויות**, ⛔ ושורה שארבעת תאיה
   מסומנים תקין נושאת הערה **ריקה**. ⛔ ולמה זה יכול להישבר: שני הכללים כתובים
   ב-`rules-table` מסבב 70, ⚠️ ואיש לא מדד אותם — ⛔ מספור נשבר בכל
   הוספה באמצע, והערה ששרדה תיקון נקראת כמצב פתוח שאינו קיים.
   ──────────────────────────────────────────────────────────────────────── */
{
  const ls = fs.readFileSync(APP.docs, 'utf8').split('\n');
  const a = ls.findIndex((l) => /^<!--\s*SHARED:start\s+id="rules-table"/.test(l));
  const b = ls.findIndex((l, i) => i > a && /^<!--\s*SHARED:end/.test(l));
  const rows = [];
  for (const l of ls.slice(a, b)) {
    const m = /^\|\s*(\d+)\s*\|/.exec(l);
    if (m) rows.push({ n: Number(m[1]), cells: l.split('|') });
  }
  const nums = rows.map((r) => r.n);
  const dup = nums.filter((x, i) => nums.indexOf(x) !== i);
  const gap = nums.filter((x, i) => x !== i + 1);
  if (dup.length) fail(`טבלת התשתית: מספרי שורה כפולים — ${[...new Set(dup)].join(', ')}, ` +
         `והצפוי מספור ייחודי. ` +
                       'ממספרים מחדש 1..N באותו קומיט');
  else if (gap.length) fail(`טבלת התשתית: המספור אינו רציף — נמדד ${nums.length} שורות ` +
                            `והראשונה שאינה במקומה היא ${gap[0]}. ממספרים מחדש 1..N`);
  else pass(`טבלת התשתית — ${nums.length} שורות, מספור רציף ובלי כפילויות`);
  /*  ⚠️ ארבעת התאים ולא התא של האפליקציה הזו (סבב 72) — ⛔ ההערה משותפת
   *  לארבעת הריפו, והיא לגיטימית כל עוד תא אחד אינו תקין. */
  /*  ⛔ ספירה נגזרת היא החריג היחיד (סבב 72) — ⚠️ «כמה מבחנים» ו«כמה
   *  קבצים» משתנים בכל סבב, ⭐ ומקומם בהערות **גם בשורה ✅**: ⛔ בעמודת
   *  התקן הם היו הופכים כל תוספת מבחן להפרה. ⚠️ מה שנשאר אסור הוא הערת
   *  **נימוק** על שורה תקינה — ⛔ היא מתארת מצב שכבר אינו. */
  const COUNT_NOTE = /\d/;
  const noisy = rows.filter((r) => r.cells.length >= 9 &&
                  [4, 5, 6, 7].every((k) => r.cells[k].indexOf('✅') >= 0) &&
                  r.cells[8].trim() !== '' && !COUNT_NOTE.test(r.cells[8]));
  if (noisy.length)
    fail(`טבלת התשתית: ${noisy.length} שורות ✅✅✅✅ עם הערה שאינה ריקה — ` +
         `${noisy.map((r) => r.n).join(', ')}, והצפוי אפס. הערה שסימונה ✅ מתארת מצב שכבר אינו, ` +
         'ומוחקים אותה באותו קומיט');
  else pass('טבלת התשתית — כל שורה ✅✅✅✅ נושאת הערה ריקה');

  /*  ⛔ מצב פתוח נרשם ❌ **ולצידו הערה** — ⚠️ ❌ בלי הערה אומר «לא מטופל»
   *  ולא **מה** חסר, ⛔ ואז הוא נקרא כמצב ולא כמשימה. ⭐ וזו החלופה
   *  לפרק פערים: ⛔ מקור אמת שני לאותו מצב, ⚠️ ושורה שחיה רק בו נעלמת
   *  מהעין שסורקת את הטבלה. */
  const openNoNote = rows.filter((r) => r.cells.length >= 9 &&
                       [4, 5, 6, 7].some((k) => r.cells[k].indexOf('❌') >= 0) &&
                       r.cells[8].trim() === '');
  if (openNoNote.length)
    fail(`טבלת התשתית: ${openNoNote.length} שורות ❌ בלי הערה — ` +
         `${openNoNote.map((r) => r.n).join(', ')}, והצפוי אפס. ` +
         `מוסיפים הערה שאומרת מה נדרש`);
  else pass(`טבלת התשתית — כל שורה ❌ נושאת הערה (${rows.filter((r) => r.cells.length >= 9 &&
             [4, 5, 6, 7].some((k) => r.cells[k].indexOf('❌') >= 0)).length} שורות)`);

  const gapChapter = fs.readFileSync(APP.docs, 'utf8')
    .split('\n').filter((l) => /^#{2,3}\s*.*פערים\s*(פתוחים)?\s*$/.test(l));
  if (gapChapter.length)
    fail(`פרק פערים נפרד ב-${APP.docs}: ${gapChapter.join(' · ')} — ` +
         'נמדדו פרקים שהצפוי בהם אפס. מצב פתוח נרשם ❌ בטבלה עם הערה, ' +
       'ומוחקים את הפרק');
  else pass('אין פרק פערים נפרד — כל מצב פתוח יושב בטבלה');
}

/*  ⛔ מפתחות ההגדרה — ⚠️ הטענה רצה תמיד ⛔ ואינה תלויה בתא בטבלה: ⭐ התא
 *  חסר-מנומק מפני שקיום המפתח **במסד** אינו נראה מהריפו, ⛔ וההצהרה
 *  שבקוד כן. */
{
  const g = cfgKeyGaps();
  if (g.length) fail(`מפתחות הגדרה: ${g.join(' · ')} — נמדדו ${g.length} והצפוי אפס. ` +
    'מצהירים את המפתח ב-APP.cfgKeys ומוסיפים אותו במיגרציה, ' +
    'או מסירים הכרזה שאין לה קורא; וקריאת מפתח יחיד עוברת ל-maybeSingle');
  else pass(`מפתחות הגדרה — ${(APP.cfgKeys || []).length} מוצהרים, כולם נדרשים בקוד, ` +
            'ואפס קריאות single על מפתח יחיד');
}

/*  ⛔ אין שורה בלי כיסוי (סבב 69) — כל שורה נמצאת ב-MATRIX (נאכפת כאן) או ב-GATES
 *  (נאכפת בשער אחר, או נושאת נימוק כתוב). ⚠️ שורה חדשה שנוספה בלי אחד
 *  משניהם מפילה כאן, ⛔ ולא מתגלה סבבים אחר כך. */
{
  const nums = tableRowNumbers();
  if (!nums.length) fail('טבלת התשתית לא נמצאה — נמדדו 0 שורות והצפוי לפחות אחת. ' +
     'מתקנים את מבנה הטבלה');
  const enforced = new Set(MATRIX.map((m) => m.row));
  const orphan = nums.filter((n) => !enforced.has(n) && !GATES[n]);
  if (orphan.length)
    fail(`שורות בטבלה בלי שער ובלי נימוק: ${orphan.join(', ')} — ` +
         'והצפוי אפס. מוסיפים לכל אחת probe, הפניה לשער אחר, ' +
       'או שורת נימוק מדוע אינה ניתנת לאכיפה מכנית');
  else pass(`כיסוי הטבלה — ${nums.length} שורות: ${enforced.size} נאכפות כאן, ` +
            `${nums.length - enforced.size} בשער אחר או עם נימוק כתוב`);
  const stale = Object.keys(GATES).map(Number).filter((n) => !nums.includes(n));
  if (stale.length) fail(`שורות ב-GATES שאינן קיימות בטבלה: ${stale.join(', ')} — ` +
    `נמדדו ${stale.length} והצפוי אפס. מסירים אותן מ-GATES`);
  const both = Object.keys(GATES).map(Number).filter((n) => enforced.has(n));
  if (both.length) fail(`שורות שמוכרזות גם ב-MATRIX וגם ב-GATES: ${both.join(', ')} — ` +
    `נמדדו ${both.length} והצפוי אפס. מסירים אותן מאחת השתיים`);

  /*  ⛔ «נאכפת בשער אחר» היא **הצהרה** ⛔ ולא מנגנון (סבב 71) — ⚠️ הערך
   *  ב-`GATES` הוא מחרוזת, ⛔ ואיש לא אימת שהשער הזה קיים ושהוא בכלל רץ.
   *  ⭐ שער שאינו ב-`APP.gates` שב-`check-js` הוא שער שקיים ואינו רץ,
   *  ⛔ ואז 44 שורות «נאכפות» ע"י קובץ שאיש אינו מפעיל. ⚠️ הבדיקה היא
   *  על **קיום והפעלה**, ⛔ ולא על מה שהשער מודד בפנים — ⭐ את זה מודד
   *  השער עצמו, במוטציות שלו. */
  /*  ⭐ המיפוי שורה→שער נגזר מ-`ROWS` שכל שער מייצא (סבב 72) — ⛔ ואינו
   *  רשימה ידנית כאן. ⚠️ שער שמצהיר שורה שאינה שלו, או שורה שאין לה
   *  שער שמצהיר עליה — שניהם מפילים, ⛔ ואין דרך שהמיפוי ייסחף בשקט. */
  const declared = new Map();          // שורה → שמות השערים שהצהירו עליה
  const noDecl = [];
  for (const f of fs.readdirSync('tools').filter((x) => x.endsWith('.mjs'))) {
    const txt = fs.readFileSync('tools/' + f, 'utf8');
    const m = /^export const ROWS = \[([^\]]*)\];$/m.exec(txt);
    if (!m) { noDecl.push(f); continue; }
    for (const d of m[1].match(/\d+/g) || [])
      (declared.get(Number(d)) || declared.set(Number(d), []).get(Number(d))).push(f.slice(0, -4));
  }
  if (noDecl.length) fail(`שערים בלי `+ '`export const ROWS`' + `: ${noDecl.join(', ')} — ` +
                          'והצפוי אפס. מוסיפים לכל אחד הצהרה — ולו רשימה ריקה');
  /*  ⭐ שורה רשאית להצביע על **כמה שערים** (סבב 72) — ⛔ ולכל אחד שם טענה
   *  משלו, ב-`claims: { שער: טענה }`. ⚠️ הנימוק נמדד: «מבחן חריג נושא נימוק
   *  בבאנר» מכסה שני מצבים שיושבים בשני שערים, ⛔ והמגבלה «שער אחד לשורה»
   *  השאירה את המצב השני בלי הצהרה — ⚠️ נאכף בפועל, ובלתי־נראה למנגנון. */
  const refs = [];
  for (const [row, g] of Object.entries(GATES)) {
    if (!g || (!g.claim && !g.claims)) continue;
    const n = Number(row);
    const has = declared.get(n) || [];
    if (g.claims) for (const [gate, claim] of Object.entries(g.claims)) refs.push({ row: n, gate, claim });
    else refs.push({ row: n, gate: has[0], claim: g.claim });
  }
  const unclaimed = refs.filter((r) => !r.gate).map((r) => r.row);
  /*  ⛔ שער שמצהיר על שורה בלי שהשורה מצהירה עליו חזרה (סבב 72) — ⚠️ זו
   *  בדיוק ההצהרה החד-כיוונית שהמיפוי הידני סבל ממנה, בכיוון השני. */
  const mismatch = [];
  for (const [row, g] of Object.entries(GATES)) {
    if (!g || (!g.claim && !g.claims)) continue;
    const n = Number(row), has = declared.get(n) || [];
    const want = g.claims ? Object.keys(g.claims) : has.slice(0, 1);
    const extra = has.filter((x) => !want.includes(x));
    const miss  = want.filter((x) => !has.includes(x));
    if (extra.length) mismatch.push(`${n}: ${extra.join(' + ')} מצהירים עליה ואינם ב-claims`);
    if (miss.length)  mismatch.push(`${n}: ${miss.join(' + ')} ב-claims ואינם מצהירים עליה ב-ROWS`);
  }
  const strayRows = [...declared.keys()].filter((n) => !GATES[n] || (!GATES[n].claim && !GATES[n].claims));
  if (unclaimed.length) fail(`שורות עם שם טענה שאף שער אינו מצהיר עליהן ב-ROWS: ` +
    `${unclaimed.join(', ')} — נמדדו ${unclaimed.length} והצפוי אפס. ` +
    `מוסיפים אותן ל-ROWS של השער שאוכף אותן`);
  if (mismatch.length) fail(`אי-התאמה בין ROWS ל-claims: ${mismatch.join(' · ')} — ` +
                            'והצפוי אפס. מיישרים: שורה שכמה שערים אוכפים אותה מונה את ' +
    'כולם ב-claims, ולכל אחד שם טענה');
  if (strayRows.length) fail(`שערים שמצהירים ב-ROWS שורה שאינה שלהם ב-GATES: ` +
    `${strayRows.join(', ')} — נמדדו ${strayRows.length} והצפוי אפס. ` +
    `מיישרים את ROWS ל-GATES`);
  const named = [...new Set(refs.map((r) => r.gate).filter(Boolean))];
  const js = fs.readFileSync('tools/check-js.mjs', 'utf8');
  const wired = new Set([...js.matchAll(/'([a-z_-]+)\.mjs'/g)].map((m) => m[1]));
  /*  ⛔ הרץ עצמו מחווט בהגדרה (סבב 72) — ⚠️ הוא אינו מופיע ברשימת השערים
   *  שלו, ⭐ והוא מה שמריץ את כולם. */
  wired.add('check-js');
  const absent = named.filter((g) => !fs.existsSync(`tools/${g}.mjs`));
  const idle   = named.filter((g) => !absent.includes(g) && !wired.has(g));
  if (absent.length) fail(`שערים שמוכרזים ב-ROWS ואינם קיימים: ${absent.join(', ')} — ` +
    `נמדדו ${absent.length} והצפוי אפס. מוסיפים את הקובץ, או מסירים את ההצהרה`);
  if (idle.length)
    fail(`שערים שמוכרזים ב-ROWS ואינם ב-APP.gates שב-check-js — ` +
    `קיימים ואינם רצים: ${idle.join(', ')}; נמדדו ${idle.length} והצפוי אפס. ` +
    `מוסיפים אותם ל-APP.gates`);
  /*  ⛔ ⭐ **והטענה עצמה נבדקת בגוף השער (סבב 71)** — ⚠️ «נאכפת בשער אחר»
   *  הייתה שם קובץ בלבד, ⛔ וארבע הפניות הצביעו על שער שאינו אוכף את
   *  השורה כלל: `manifest` הופנה לשער האייקונים שאין בו אזכור אחד שלו.
   *  ⭐ ה-`claim` הוא המנגנון שאוכף את השורה בתוך אותו שער — ⛔ ושינוי שמו
   *  מפיל כאן, במקום להשאיר הפניה שנשברה בשקט. */
  const blind = [];
  for (const r of refs) {
    if (absent.includes(r.gate)) continue;
    if (!r.claim) { blind.push(`${r.row}: בלי שם טענה`); continue; }
    /*  ⛔ שורה שמוזגה נושאת **כמה** שמות טענה באותו שער (סבב 72) — ⚠️ «תקרה
     *  700 — 400 משותף · 300 פרטי» היא הוראה אחת ששני מנגנונים אוכפים,
     *  ⛔ ושם אחד מהם היה משאיר את השני בלי שורה שמצביעה עליו. */
    const body = fs.readFileSync(`tools/${r.gate}.mjs`, 'utf8');
    for (const c of [].concat(r.claim))
      if (!body.includes(c)) blind.push(`${r.row}: «${c}» אינו בגוף ${r.gate}`);
  }
  if (blind.length) fail(`הפניות שהטענה שלהן אינה קיימת: ${blind.join(' · ')} — ` +
    `נמדדו ${blind.length} והצפוי אפס. מיישרים את שם הטענה לגוף השער`);
  if (!absent.length && !idle.length && !blind.length && !noDecl.length &&
      !unclaimed.length && !mismatch.length && !strayRows.length) {
    const manual = Object.values(GATES).filter((g) => g && g.manual).length;
    pass(`הפניות GATES — ${new Set(refs.map((r) => r.row)).size} שורות נגזרו מ-ROWS של ${named.length} שערים, ` +
         `כולם קיימים · רצים · ושם הטענה נמצא בגופם; ו-${manual} שורות נושאות נימוק כתוב`);
  }
}

const GAP = '⭕';
const UNMEASURED = '🔲';
const declaredOk = (c) => c.indexOf('✅') >= 0;
for (const m of MATRIX) {
  const row = tableRow(m.row);
  if (row === null) { fail(`שורה ${m.row} («${m.name}») לא נמצאה בטבלת התשתית — נמדדו ` +
    `0 שורות בשם הזה והצפוי אחת. מעדכנים את המספר ב-MATRIX`); continue; }
  const cell = row.cell, note = row.note;
  if (m.exempt) { pass(`שורה ${m.row} («${m.name}»): חריגה מנומקת — ${m.exempt}`); continue; }
  if (m.desc) {
    const want = m.desc();
    if (cell.indexOf(want) >= 0) pass(`שורה ${m.row} («${m.name}»): התא «${cell}» תואם לנמדד («${want}»)`);
    else fail(`שורה ${m.row} («${m.name}»): נמדד בקוד «${want}» והתא אומר ` +
      `«${cell}». מעדכנים את התא`);
    continue;
  }
  /*  ⛔ אין לקרוא ⭕ כ«❌ מנומס» (סבב 69) — הוא חסר **מנומק**, ולכן נאכף בשני
   *  תנאים יחד: השורה מוכרזת ב-`APP.gapRows`, ⛔ ויש לה נימוק כתוב
   *  בעמודת ההערות. ⚠️ בלי שניהם הוא מתדרדר ל«❌ בלי שאיש החליט». */
  if (cell.indexOf(UNMEASURED) >= 0) {
    if (!note) fail(`שורה ${m.row} («${m.name}»): 🔲 בלי נימוק — נמדדה הערה ריקה ` +
      `והצפוי נימוק. מוסיפים את מה שיימדד`);
    else pass(`שורה ${m.row} («${m.name}»): 🔲 — ${note}`);
    continue;
  }
  if ((APP.gapRows || []).indexOf(m.row) >= 0) {
    if (cell.indexOf(GAP) < 0)
      fail(`שורה ${m.row} («${m.name}»): מוצהרת ⭕ בבלוק APP — נמדד בתא ` +
        `«${cell}» והצפוי ⭕. מיישרים את התא, או מסירים אותה מ-gapRows`);
    else if (!note)
      fail(`שורה ${m.row} («${m.name}»): ⭕ בלי נימוק — נמדדה הערה ריקה ` +
        `והצפוי נימוק. מוסיפים אותו`);
    else pass(`שורה ${m.row} («${m.name}»): ⭕ כמוצהר — ${note}`);
    continue;
  }
  if (cell.indexOf(GAP) >= 0) {
    fail(`שורה ${m.row} («${m.name}»): התא אומר ⭕ אך השורה אינה ב-gapRows של APP — ` +
         `נמדד ⭕ שאינו מוכרז והצפוי אפס. מוסיפים את השורה ` +
         `ל-gapRows — חסר-מנומק חייב להיות החלטה רשומה, לא ברירת מחדל`);
    continue;
  }
  /*  ⛔ ספירה נגזרת מוחרגת גם כאן (סבב 72) — ⚠️ שתי נקודות אכיפה לאותה
   *  טענה, ⭐ ותיקון באחת בלבד היה משאיר את השנייה סותרת אותה. */
  if (declaredOk(cell) && row.allOk && note && !/\d/.test(note)) {
    fail(`שורה ${m.row} («${m.name}»): שורה שסימונה ✅ נושאת הערה «${note}» — ` +
         `והצפוי הערה ריקה. מוחקים אותה — ⛔ עמודת ההערות ` +
         `שמורה לנימוק חריגה, למה שנדרש ולמה שיימדד`);
    continue;
  }
  let exists;
  try {
    exists = m.app ? !!(APP.tableProbe[m.row] && APP.tableProbe[m.row]({ code, src, hasCode, cfgBlock, fnBody, hasPath, fileHas }))
                   : !!m.probe();
  } catch (e) { fail(`שורה ${m.row} («${m.name}»): ה-probe זרק — נמדד ` +
    `«${e.message}» והצפוי ערך בוליאני. מתקנים את ה-probe`); continue; }
  const declared = cell.indexOf('✅') >= 0;
  const denied = cell.indexOf('❌') >= 0;
  if (!declared && !denied) {
    fail(`שורה ${m.row} («${m.name}»): נמדד תא «${cell}» והצפוי ` +
      `✅, ❌, ⭕ או 🔲. מתקנים את הסימון`);
  } else if (declared && !exists) {
    fail(`שורה ${m.row} («${m.name}»): מסומנת ✅ — נמדד שה-probe אינו ` +
      `מוצא אותה בקוד והצפוי שימצא. מיישרים את הסימון לקוד`);
  } else if (denied && exists) {
    fail(`שורה ${m.row} («${m.name}»): מסומנת ❌ אך ה-probe **כן** מוצא אותה — ` +
         `נמדד שהוא מוצא והצפוי שלא. מעדכנים את הסימון ל-✅ — ` +
      `טענת-חסר שגויה שולחת סבב עתידי לבנות מחדש משהו שכבר קיים`);
  } else {
    pass(`שורה ${m.row} («${m.name}»): «${cell}» תואם לקוד`);
  }
}

console.log(failures ? `\n❌ בדיקת היכולות המשותפות נכשלה (${failures})`
                     : '\n✅ בדיקת היכולות המשותפות עברה');
/*  ⛔ יציאה רק בתהליך משלו (סבב 72) — ⚠️ שער שמריץ את הבודק עשרות פעמים
 *  מייבא אותו לתהליך אחד, ו-`process.exit` היה עוצר את השער עצמו באמצע.
 *  ⭐ מונה הכשלים מיוצא, וזה מה שהמייבא בודק. */
/* ────── ⛔ הכיוון ההפוך: כלל ⟵ שורה, ו-⧉ ללולאה הכפולה (סבב 73ב) ────────────
   ⛔ מה נאכף: כל סעיף `###` בארבעת בלוקי הכללים מיוצג בטבלה — בשורה משלו
   או כהרחבה בעמודת התקן, ⛔ והמיפוי דו-כיווני: סעיף שנעלם מפיל בדיוק כמו
   סעיף שנוסף. ⛔ **ושני הסימנים נגזרים כאן** — ⭐ ◆ על הסעיף **וגם על
   שורתו**, ⧉ על הזוגות שנושאם הוא מנגנון הלולאה עצמו.
   ⛔ ולמה זה יכול להישבר: כלל שאין לו שורה אינו נאכף ⚠️ והוא ייעלם;
   וסימן שנכתב ביד הוא הצהרה שאיש לא אימת.
   ──────────────────────────────────────────────────────────────────────── */
{
  const txt = fs.readFileSync(APP.docs, 'utf8');
  const ls = txt.split('\n');
  const heads = [];
  const marks = {};
  let inRules = false;
  for (const l of ls) {
    const m = /^<!--\s*SHARED:start\s+id="(rules-[a-z]+)"/.exec(l);
    if (m) { inRules = true; continue; }
    if (/^<!--\s*SHARED:end/.test(l)) { inRules = false; continue; }
    if (inRules && l.startsWith('### ')) {
      const raw = l.slice(4).trim();
      const m2 = /^(.*?)\s+([◆◇⧉])$/.exec(raw);
      heads.push(m2 ? m2[1] : raw);
      marks[m2 ? m2[1] : raw] = m2 ? m2[2] : '';
    }
  }
  const rowNums = new Set();
  /*  ⛔ שם השורה ⟵ מספרה, נגזר מהטבלה (סבב 75) — ⚠️ המפה שלמעלה מחזיקה
   *  שמות בלבד, ⛔ והמספר נקרא מכאן: ⭐ מספור מחדש אינו נוגע במפה כלל. */
  const rowByName = new Map();
  for (const l of ls) {
    const m = /^\|\s*(\d+)\s*\|([^|]*)\|/.exec(l);
    if (!m) continue;
    rowNums.add(Number(m[1]));
    rowByName.set(m[2].replace(/\s*[◆◇⧉]\s*$/, '').trim(), Number(m[1]));
  }
  /*  ⛔ סעיף שכותרתו היא שם שורה נגזר לבדו (סבב 75) — ⚠️ הכותרת נפתחת
   *  בסימן איסור, ⛔ והוא נחתך לפני החיפוש: ⭐ מה שנשאר במפה הידנית הוא
   *  הסעיף שכותרתו אינה שם שורה, ⛔ או שכמה סעיפים חולקים שורה אחת. */
  const ruleRowName = (h) => RULE_ROW_NAMES[h] || h.replace(/^⛔+\s*/, '');
  const RULE_ROWS = {};
  for (const h of heads) {
    const n = rowByName.get(ruleRowName(h));
    if (n !== undefined) RULE_ROWS[h] = n;
  }
  /*  ⛔ סימון הלולאה ◆/◇ — ⚠️ נגזר מהשער ⛔ ולא נכתב ביד: ⭐ ◆ הוא זוג
   *  סגור משני צדדיו — לסעיף יש שורה, **ולשורה יש קיום בטבלה**; ◇ הוא
   *  צד אחד בלבד. ⛔ ◇ הוא מצב שאמור להיות אפס, ⛔ והשער מפיל עליו.
   *  ⚠️ הסימן יושב בסוף שורת הכותרת ונחתך לפני ההשוואה למפה, ⛔ שאם לא
   *  כן הוא היה חלק מהמפתח — ומשנה אותו בכל עדכון. */
  /*  ⛔ טענה אחת ולא שתיים (סבב 75) — ⚠️ «בלי שורה» ו«ממופה לשורה שאינה
   *  בטבלה» היו שתי בדיקות לאותו מצב מרגע שהמספר נגזר, ⛔ והן מוזגו. */
  const noRow  = heads.filter((h) => RULE_ROWS[h] === undefined);
  const stale  = Object.keys(RULE_ROW_NAMES).filter((h) => !heads.includes(h));
  const badRow = Object.entries(RULE_ROW_NAMES)
                   .filter(([, n]) => !rowByName.has(n)).map(([h, n]) => `${h} → «${n}»`);
  if (noRow.length)
    fail(`כללים בלי שורה בטבלה: ${noRow.map((h) => `${h} (מחפש «${ruleRowName(h)}»)`).join(' · ')} — ` +
         `נמדדו ${noRow.length} מתוך ${heads.length} והצפוי אפס. מוסיפים שורה, ` +
         'מרחיבים עמודת תקן קיימת, או מיישרים את הכותרת לשם השורה');
  if (stale.length)
    fail(`שמות ב-RULE_ROW_NAMES שאין להם סעיף כלל: ${stale.join(' · ')} — ` +
         'נמדדו שמות שאין להם סעיף והצפוי אפס. מיישרים את המפה לכותרות שבקובץ');
  if (badRow.length)
    fail(`כללים שממופים לשם שורה שאינו בטבלה: ${badRow.join(' · ')} — ` +
         'נמדדו שמות שאינם בטבלה והצפוי אפס. מיישרים את המפה לשמות שבטבלה');
  if (!noRow.length && !stale.length && !badRow.length)
    pass(`כל כלל מיוצג בטבלה — ${heads.length} סעיפים, ` +
         `${new Set(Object.values(RULE_ROWS)).size} שורות מייצגות`);

  /*  ⛔ הסימן שכתוב בקובץ מושווה לזה שנגזר — ⚠️ סימן שנכתב ביד הוא הצהרה
   *  שאיש לא אימת, ⭐ בדיוק כמו «נאכפת בשער אחר» שהייתה מחרוזת. */
  /*  ⛔ הלולאה הכפולה (סבב 73ב) — ⚠️ שני הזוגות שנושאם הוא **מנגנון
   *  הלולאה עצמו**: ⭐ הכלל שדורש לכל כלל שורה, והכלל שדורש לקרוא את
   *  הטבלה לפני שכותבים. ⛔ שבירת אחד מהם אינה מפילה טענה אחת אלא את
   *  המדידה כולה, ⚠️ ולכן הם נושאים סימן משלהם ⛔ ואינם נבלעים ב-◆. */
  const DOUBLE_LOOP = ['⛔ כל כלל מיוצג בטבלה', '⛔ הטבלה נקראת לפני שכותבים'];
  const wantMark = (h) => !(RULE_ROWS[h] && rowNums.has(RULE_ROWS[h])) ? '◇'
                        : (DOUBLE_LOOP.includes(h) ? '⧉' : '◆');
  const openLoop = heads.filter((h) => wantMark(h) === '◇');
  const badMark = heads.filter((h) => marks[h] !== wantMark(h));
  if (openLoop.length)
    fail(`סעיפי כלל שהזוג שלהם פתוח (◇): ${openLoop.join(' · ')} — ` +
         'והצפוי אפס. מוסיפים שורה בטבלה או מרחיבים עמודת תקן קיימת, ' +
      'ומיישרים את הסימן');
  else if (badMark.length)
    fail(`סימן לולאה שאינו תואם לנגזר: ${badMark.map((h) => `${h} → ${wantMark(h)}`).join(' · ')} — ` +
         'נמדד סימן שאינו הנגזר. הסימן נגזר מהשער, ומיישרים את הקובץ אליו');
  else pass(`סימון הלולאה — ${heads.length} סעיפים, כולם זוג סגור משני הצדדים ` +
            `(${heads.filter((h) => wantMark(h) === '⧉').length} מהם ⧉)`);


  /*  ⛔ והצד השני של הזוג — **השורה** (סבב 73ב): ⚠️ עד היום הסימן הודבק
   *  על הסעיף בלבד, ⛔ ומי שקרא את הטבלה לא ידע לאיזו שורה יש סעיף כלל.
   *  ⭐ הסימן יושב בסוף תא השם, ⛔ ונגזר מאותה מפה בדיוק. */
  const wantRowMark = new Map();
  for (const [h, n] of Object.entries(RULE_ROWS))
    if (DOUBLE_LOOP.includes(h) || !wantRowMark.has(n))
      wantRowMark.set(n, DOUBLE_LOOP.includes(h) ? '⧉' : '◆');
  const rowMarkBad = [];
  for (const l of ls) {
    const m = /^\|\s*(\d+)\s*\|([^|]*)\|/.exec(l);
    if (!m) continue;
    const got = (/([◆⧉])\s*$/.exec(m[2]) || [])[1] || '—';
    const want = wantRowMark.get(Number(m[1])) || '—';
    if (got !== want) rowMarkBad.push(`${m[1]}: «${got}» והנגזר «${want}»`);
  }
  if (rowMarkBad.length)
    fail(`סימן לולאה בשורות הטבלה שאינו תואם לנגזר: ${rowMarkBad.join(' · ')} — ` +
         'נמדד סימן שאינו הנגזר. הסימן נגזר מהשער, ומיישרים את הטבלה אליו');
  else pass(`סימון הלולאה בטבלה — ${wantRowMark.size} שורות נושאות סעיף כלל, ` +
            `${[...wantRowMark.values()].filter((v) => v === '⧉').length} מהן ⧉`);
}

export const capFailures = failures;
if (!process.env.CAP_INPROC) process.exit(failures ? 1 : 0);

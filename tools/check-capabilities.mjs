#!/usr/bin/env node
/*  בדיקת אחידות היכולות המשותפות — סבב 30, השלמה.
 *
 *  ⭐ משימת הבודק: סורק את טבלת התשתית מול הקוד — ⛔ ומפיל על תא שסימונו אינו
 *  מסכים עם ה-probe שלו, ועל שורה בלי אחת משלוש דרכי האכיפה.
 *
 *  ⭐ **יכולת משותפת מוגדרת בשלושה ממדים — ליבה זהה
 *  בית-לבית · נקודת הפעלה זהה · רישום תואם במטריצת היכולות.** ⚠️ עד היום
 *  נאכף הראשון בלבד, וזה בדיוק מה שהחמיץ את הכשל שהוליד את
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
  /*  ⛔ קבועי מסך הצפייה (סבב 90ג) — ⭐ ריק כאן, ⛔ ואינו נשמט: ⚠️ מסך
   *  «טבלת התשתית» קיים ביומן בלבד, ⭐ ושדה חסר נקרא «לא נשאל». */
  viewOnlyConsts: [],
  offlineLoginFn: 'slVerifyOffline',
  /*  ⛔ חתימת ה-keystore — ⚠️ היא מה שהופך «מפתח קבוע» למדיד:
   *  ⭐ keystore חדש הוא גם קובץ קיים, ⛔ וחתימה שונה מפילה. */
  keystoreSha: '9b6680d217decb43',
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
  /*  ⛔ ספריות ה-CDN בשמן ובגרסתן — ⚠️ הרשימה נמדדת משני צדדיה מול תגי
   *  ה-`script`: ⭐ תג בלי הצהרה ⛔ והצהרה בלי תג ⛔ שתיהן מפילות.
   *  ⚠️ `chart.js` היא **תרשים הדשבורד** ⛔ ואינה מסלול ייצוא. */
  cdnLibs: { 'supabase-js': '2.111.0', 'chart.js': '4.4.1' },
  /*  ⛔ אין ייצוא כאן — ⚠️ מוצהר ריק ⛔ ואינו נשמט: ⭐ שדה חסר נקרא
   *  «לא נשאל», וריק נקרא «נמדד ואין». */
  exportWay: '',
  exportFallback: '',
  exportFns: [],
  /*  ⛔ שם מפת מטפלי ה-`data-act` (סבב 89) — ⚠️ השם נבדל בין הארבע
   *  והמנגנון אחד: ⭐ מאזין יחיד ב-`document` שמנתב לפי המפה. */
  actMap: 'DOM_ACTIONS',
  gapRows: [38, 67, 104, 108, 126, 127, 131, 141, 143],
  /*  ⛔ אין כאן מסלול תצוגה שמושך משכבת השורות (סבב 89) — ⚠️ המסכים
   *  קוראים מהמראה שעל הדיסק, ⭐ ולכן אין קריאה שצריך למדוד בה חלון.
   *  ⛔ **והרשימות ריקות ואינן נשמטות** — ⚠️ שדה חסר נקרא «לא נשאל». */
  rowsLayerFns: {},
  fullPullAllow: {},
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
    /*  ⛔ מסלול תצוגה שקורא לשכבת השורות בלי טווח (סבב 87) — ⚠️ הטענה
     *  אינה «`_ysRowsPaged` קיימת» אלא **שכל קריאה מצהירה חלון**: ⭐ קריאה
     *  בת שני ארגומנטים משמיטה את `win`, ⛔ והשמטה נקראת «לא נשאלתי».
     *  ⚠️ ומסלול שמושך מלא בכוונה מוסר `null` **במפורש** — ⭐ זו הצהרה
     *  שנמדדת, ⛔ ולא היעדר שנקרא כתקין. */
    66: (c) => {
    /*  ⛔⛔ **וכל קריאה לשכבת השורות נמדדת בהיקפה** (סבב 89) — ⚠️ הנימוק
     *  המדוד: הטענה שמעל מדדה את **צורת** הקריאה — שכל קריאה ל-`_ysRowsPaged`
     *  נושאת שלושה ארגומנטים — ⛔ ולא את היקפה: ⭐ פתיחת סדר עברה דרך שתי
     *  עוטפות שקיבלו חלון `undefined`, ⚠️ ומשכה 18,688 שורות פעמיים ⛔ בעוד
     *  שהיא צריכה 248. ⛔ **ולכן נמדד גם מי קורא בלי חלון** — ⭐ וכל קורא
     *  כזה מוכרז ב-`APP.fullPullAllow` בשמו ובנימוקו: ⚠️ גיבוי · סנכרון ·
     *  מיזוג · ואימות חייבים את הטבלה כולה, ⛔ ומסלול תצוגה אינו.
     *  ⛔ **והחרגה שאין לה אתר בפועל מפילה אף היא** — ⚠️ רשימה שהתיישנה היא
     *  בעצמה השארית שהשורה באה לסלק. */
    const _r66 = (() => {
      const fns = APP.rowsLayerFns || {};
      const allow = APP.fullPullAllow || {};
      const names = Object.keys(fns);
      /*  ⛔ אפליקציה שאין לה שכבת שורות מוצהרת מדלגת ⛔ ואינה מדווחת «עבר»
       *  על כלום — ⚠️ שתי הרשימות חייבות להיות ריקות **שתיהן**: ⭐ הצהרה
       *  חלקית היא בדיוק המצב שהשורה אוסרת. */
      if (!names.length) return Object.keys(allow).length === 0;
      const seen = new Set();
      for (const fn of names) {
        const want = fns[fn];
        for (const call of callArityAt(c.code, fn)) {
          if (call.n >= want) continue;                     // חלון הועבר
          const upto = c.code.slice(0, call.i);
          const own = [...upto.matchAll(
            /(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(|([A-Za-z0-9_$.]+)\s*=\s*(?:async\s+)?function/g)].pop();
          const owner = own ? (own[1] || own[2] || '').replace(/^window\./, '') : '';
          if (!owner || !allow[owner]) return false;        // קורא בלי חלון שאינו מוכרז
          seen.add(owner);
        }
      }
      for (const k of Object.keys(allow)) if (!seen.has(k)) return false;  // החרגה שהתיישנה
      return seen.size > 0;
    })();
      return _r66 && (callArity(c.code, '_ysRowsPaged').every((a) => a === 3)
          && /var SYNC_TABLES=\[/.test(c.code)
          && callArity(c.code, 'slPullAll').length >= 2);
    },
    /*  ⛔ ערך ולא נוכחות (סבב 72) — ⚠️ כל `upsert` נושא `onConflict`,
     *  ⛔ וכל מפתח שנכתב בקוד מוכרז ומנומק ב-`APP.conflictKeys`: ⭐ מפתח
     *  שאינו מפתח הזהות של הטבלה יוצר שורה שנייה לאותה רשומה. */
    124: (c) => {
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
    145: (c) => c.hasCode(/SL_PASS_ITER_USER\s*=\s*100000\b/)
          && /iterations:\s*SL_PASS_ITER_USER,\s*hash:\s*'SHA-256'/.test(c.src)
          && /deriveBits\([\s\S]{0,200}?key,\s*256\)/.test(c.code),
    // ⚠️ מתועד ❌ במטריצה — `doLogin` מריצה משיכה מלאה כפויה במקום נתיב חלקי.
    /*  ⛔ ערך ולא קיום (סבב 79) — ⚠️ המסלול החלקי הוא **פונקציה שנקראת
     *  מיותר ממקום אחד**: ⭐ הגדרה בלי קורא היא בדיוק «מסלול שנכתב ואינו
     *  רץ», ⛔ והוא אינו מעדכן דבר. */
    144: (c) => !!c.fnBody('slUsersSaveOne')
             && (c.code.match(/\bslUsersSaveOne\s*\(/g) || []).length > 1,
    // חמש טבלאות `sl_` מאז ההקמה — המראה נבנית מהן ישירות.
    115: (c) => c.hasCode(/\bSL_TABLES\b/),
    // ⚠️ מתועד ❌ במטריצה — המנהל מנהל סיסמאות מלוח הבקרה של Supabase.
    143: () => false,
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [27, 37, 39, 41, 49, 71, 44, 136, 84];

/*  היכולות המשותפות. `block` — הליבה שחייבת להיות זהה בית-לבית.
 *  `hooks` — נקודות ההפעלה: `at:'boot'` = פונקציית העלייה, `at:'settings'`
 *  = פונקציית מסך ההגדרות. `forbidden` — פונקציות שהמודול חושף אך אסור
 *  לקרוא להן מקוד האפליקציה. `row` — שורת היכולת במטריצה, ו-`probe` הוא
 *  מה שמעיד על קיומה בקוד כשאין לה בלוק משלה.                            */
const CAPS = {
  /*  ⭐ סבב 97 — סולם נקודות השבירה. ⛔ אין לו `hooks`: הוא אינו יכולת
   *  עלייה ואינו יכולת מסך — ⚠️ הוא **הצהרה** שהשער משווה אליה את
   *  שאילתות ה-`@media`, ⭐ ולכן הוא ראשון בסדר: ⛔ שום בלוק אינו תלוי
   *  בו, ⚠️ והפריסה שמעליו תלויה בכולם. */
  bp: {
    name: 'סולם נקודות השבירה',
    block: { sha: '16072010ed787fd5', lines: 13,
             start: '/* ═══ סולם נקודות השבירה — מודול משותף (סבב 97)',
             end:   '/* ═══════════════ סוף מודול סולם נקודות השבירה' },
  },
  /*  ⭐ סבב 87 — המשיכה המסוננת. ⚠️ אין לו `hooks`: הוא נקרא מכל מסלול
   *  משיכה ואין לו «פונקציית עלייה» — ⛔ מה שנאכף כאן הוא הליבה עצמה,
   *  ⚠️ שהייתה קיימת בשתי אפליקציות בשתי צורות ⛔ ונעדרה משתיים. */
  rowswin: {
    name: 'מודול המשיכה המסוננת',
    block: { sha: '5b01d0d24e3299ca', lines: 41,
             start: '/* ═══ משיכה מסוננת בשרת — מודול משותף (סבב 87)',
             end:   '/* ═══════════════ סוף מודול משיכה מסוננת בשרת' },
  },
  storage: {
    name: 'מודול עמידות האחסון',
    block: { sha: '8260246f4630d610', lines: 688,
             start: '   עמידות אחסון מקומי — מודול משותף (סבב 11).',
             end:   '/* ═══════════════ סוף המודול המשותף' },
    hooks: [{ fn: 'lsBoot', at: 'boot' }],
  },
  /*  ⭐ סבב 91 — האזנת הסכימה. ⚠️ אין לה `hooks`: `sbWatch` עוטפת את הלקוח
   *  ברגע יצירתו ואין לה «פונקציית עלייה» — ⛔ מה שנאכף כאן הוא הליבה עצמה,
   *  ⚠️ שישבה מחוץ לכל בלוק מסבב 83 ⛔ ונשמרה ברשימת-היתר במקום בחתימה:
   *  ⭐ ארבע פונקציות זהות בית-לבית שאף `sha256` לא מדד. */
  stale: {
    name: 'מודול האזנת הסכימה',
    block: { sha: 'f6d52387874c7261', lines: 74,
             start: '/* ═══ האזנת הסכימה — מודול משותף (סבב 91)',
             end:   '/* ═══════════════ סוף מודול האזנת הסכימה' },
  },
  /*  ⭐ סבב 91 — רכיב «מידע טכני». ⚠️ הבלוק החתום של אזור המצב מכסה את
   *  «☁️ סנכרון» בלבד, ⛔ ושלוש הפונקציות שמציירות את הקיפול נשארו מחוצה
   *  לו. ⚠️ אין לו `hooks`: `techInfoMount` נקראת מתוך `statusAreaMount`
   *  ⛔ ולא ממסך ההגדרות עצמו, ⭐ והחיווט החי שלה נמדד בשער היתומים. */
  techinfo: {
    name: 'רכיב "מידע טכני"',
    block: { sha: '804fb2312ebd2b15', lines: 50,
             start: '/* ═══ מידע טכני — מודול משותף (סבב 91)',
             end:   '/* ═══════════════ סוף מודול מידע טכני' },
  },
  pending: {
    name: 'מודול "ממתין לסנכרון"',
    block: { sha: '43b95fc7165f0cff', lines: 303,
             start: '/* ═══ ממתין לסנכרון — מודול משותף (סבב 12)',
             end:   '/* ═══════════════ סוף מודול "ממתין לסנכרון"' },
    hooks: [{ fn: 'pendBoot', at: 'boot' }],
  },
  status: {
    name: 'אזור המצב',
    block: { sha: '4220ed915db9132d', lines: 45,
             start: '/* ═══ אזור מצב — בלוק "☁️ סנכרון" — מודול משותף (סבב 17)',
             end:   '/* ═══ סוף בלוק "☁️ סנכרון"' },
    hooks: [{ fn: 'statusAreaMount', at: 'settings' }],
  },
  backup: {
    name: 'גיבוי יומי אוטומטי',
    block: { sha: '7bafb90c82ab759e', lines: 344,
             start: '/* ═══ גיבוי יומי ויומן פעולות — מודול משותף (סבב 30)',
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
  /*  ⭐ סבב 93 — מודול גריעת ה-tombstones. ⛔ הוא יושב אחרי מודול המיזוג
   *  מפני שהוא פועל על **תוצאתו**: ⚠️ גריעה שרצה לפני המיזוג נמחקת בו,
   *  ⭐ שהענן מחזיר כל רשומה שאין לה מקבילה מקומית. */
  tomb: {
    name: 'מודול גריעת ה-tombstones',
    block: { sha: '96fe1f9f8e65cf92', lines: 65,
             start: '/* ═══ גריעת tombstones — מודול משותף (סבב 93)',
             end:   '/* ═══════════════ סוף מודול גריעת ה-tombstones' },
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
   *  ⛔ וגם «נעדר באחת, בשקט» אינו.                    */
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
    block: { sha: '4ab395fd78fa83f8', lines: 51,
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
    block: { sha: '125afa9d9e085588', lines: 107,
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

/*  ⛔ הסדר הקנוני של הבלוקים החתומים (סבב 87) — ⚠️ כל בלוק **אחרי מה שהוא
 *  תלוי בו**, ⭐ והרשימה זהה בית-לבית בארבעת עותקי השער: ⛔ בלוק שאינו
 *  קיים בריפו הזה מדולג ⛔ ואינו מפיל, ⚠️ אבל בלוק שקיים ויושב במקום אחר
 *  **מפיל**. ⛔ הנימוק המדוד: `uihelp` ישב במקום הרביעי בהנהלה ובאחרון
 *  בשלוש האחרות, ⛔ ו-`devid` לפני `merge` בשלוש ואחריו באחת — ⚠️ ואיש
 *  לא מדד, ⭐ מפני שכל ריפו לבדו נראה עקבי. */
/*  ⛔ תבנית באנר הבלוק החתום (סבב 91) — ⚠️ «— מודול משותף (סבב N)» הייתה
 *  **מוסכמה ולא כלל**: ⭐ שני בלוקים נכתבו אחרת, ⛔ ואף שער לא תפס.
 *  ⛔ **והרשימה ריקה מסבב 92** — ⚠️ שתי החרגות היו מוכרזות, «אזור מצב»
 *  ו«גיבוי יומי», ⭐ ושתיהן יושרו לתבנית: ⛔ מספר הסבב נגזר מהבאנר עצמו
 *  ⛔ ואינו מוקלד. ⚠️ והיא נשארת ריקה ⛔ ואינה נשמטת — ⭐ רשימה ריקה
 *  מצהירה «נמדד ואין», ⛔ ושדה חסר נקרא «לא נשאלתי». */
const BANNER_LEGACY = [];
/*  ⛔ מספר הסבב נושא סיומת עברית לסבב-המשך — ⚠️ «37א», ⭐ ולכן אינו ספרות בלבד. */
const BANNER_RE = /— מודול משותף \(סבב [0-9֐-׿]+\)/;
function bannerGaps() {
  const out = [];
  for (const k of Object.keys(CAPS)) {
    const b = CAPS[k].block;
    if (!b || b.file) continue;    /* ⛔ בלוק בקובץ אחר — אין לו באנר כאן */
    if (BANNER_LEGACY.indexOf(b.start) >= 0) continue;
    if (!BANNER_RE.test(b.start)) out.push(k + ' — ' + b.start.slice(0, 46));
  }
  /*  ⛔ והחרגה שאין לה בלוק בפועל מפילה אף היא — ⚠️ רשימה שהתיישנה
   *  היא בעצמה השארית שהשורה באה לסלק. */
  for (const s of BANNER_LEGACY)
    if (!Object.keys(CAPS).some((k) => CAPS[k].block && CAPS[k].block.start === s))
      out.push('החרגה בלי בלוק — ' + s.slice(0, 46));
  return out;
}

/*  ⛔ שלמות הסדר הקנוני (סבב 91) — ⚠️ השער בדק **סדר** ⛔ ולא **שלמות**:
 *  ⭐ בלוק שנחתם ואינו ב-`BLOCK_ORDER` פשוט לא נבדק, ⛔ ואיש לא ידע.
 *  ⚠️ ובלוק שחי בקובץ אחר (`block.file`) אינו בסדר של `index.html` ⛔ ואינו
 *  חסר — ⭐ ההיעדר נגזר מהשדה עצמו ⛔ ואינו רשימה שנייה. */
function orderGaps() {
  const inFile = Object.keys(CAPS).filter((k) => CAPS[k].block && !CAPS[k].block.file);
  return inFile.filter((k) => BLOCK_ORDER.indexOf(k) < 0).map((k) => 'חתום ואינו בסדר: ' + k)
    .concat(BLOCK_ORDER.filter((k) => inFile.indexOf(k) < 0).map((k) => 'בסדר ואינו חתום: ' + k));
}

const BLOCK_ORDER = ['bp', 'neterr', 'rowswin', 'guardonline', 'storage', 'stale', 'techinfo', 'status', 'backup',
                     'pending', 'ids', 'retry', 'lock', 'sess', 'pull', 'hotwin',
                     'devid', 'mergecore', 'tomb', 'uihelp'];


/*  ⛔ מזכר חוצה-ייבוא לגזירות היקרות (סבב 92) — ⚠️ `test_matrix` מייבא את
 *  הקובץ הזה **97 פעם** בתהליך אחד עם `?flip=N`, ⛔ וכל ייבוא גזר מחדש את
 *  אותו קוד בדיוק: ⭐ נמדד שהלבנת המקור ופענוח ה-PNG לבדם הם כרבע מזמן
 *  הריצה. ⛔ **והמפתח הוא חתימת התוכן ⛔ ולא נתיב או חותמת-זמן** — ⚠️ מזכר
 *  שנשען על `mtime` מחזיר גזירה ישנה כשמוטציה נכתבה באותה מילישנייה,
 *  ⭐ וזה בדיוק «probe שאינו יכול להיכשל»: ⛔ הקריאה מהדיסק נשארת, ⚠️ ורק
 *  העיבוד שמעליה נחסך. */
const _MEMO = (globalThis.__capMemo ||= new Map());
/*  ⛔ חתימת נכסי האייקון — ⚠️ שם הקובץ **וגם** תוכנו: ⭐ נכס שהוחלף בנכס
 *  אחר באותו גודל היה עובר על חתימה שסופרת גדלים בלבד, ⛔ ונכס שנוסף או
 *  שירד משנה את הרשימה. */
function ICON_SIG() {
  const out = [];
  const walk = (d) => {
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const e of ents.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const f = d + '/' + e.name;
      if (e.isDirectory()) walk(f);
      else if (e.name.endsWith('.png')) out.push(f + ':' + fs.readFileSync(f).toString('base64'));
    }
  };
  walk('icons'); walk('android');
  return out.join('\n');
}
function memoByHash(ns, text, fn) {
  const k = ns + ':' + crypto.createHash('sha256').update(text).digest('hex');
  if (_MEMO.has(k)) return _MEMO.get(k);
  const v = fn();
  _MEMO.set(k, v);
  return v;
}

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

const code = memoByHash('code', src, () => blankNonCode(src));

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

/* ── א2. סדר הבלוקים הקנוני ────────────────────────────────────────────── */
/*  ⛔ הסדר נמדד ⛔ ואינו מוצהר בתיעוד — ⚠️ בלוק שקיים בריפו הזה חייב לשבת
 *  אחרי כל מי שקדם לו ברשימה: ⭐ בלוק חסר מדולג (יומן בלי כניסה), ⛔ ובלוק
 *  שקיים במקום הלא-נכון מפיל. */
{
  const seen = [];
  for (const key of BLOCK_ORDER) {
    const cap = CAPS[key];
    if (!cap || !cap.block || cap.block.file) continue;
    const at = src.indexOf(cap.block.start);
    if (at < 0) continue;
    seen.push([key, at, cap.name]);
  }
  const bad = [];
  for (let i = 1; i < seen.length; i++)
    if (seen[i][1] < seen[i - 1][1]) bad.push(`${seen[i][2]} לפני ${seen[i - 1][2]}`);
  if (bad.length)
    fail(`סדר הבלוקים אינו הסדר הקנוני — נמדד ${bad.join(' · ')} והצפוי הסדר ` +
         `שב-BLOCK_ORDER. מזיזים את הבלוק למקומו, או מעדכנים את הסדר בארבעת עותקי השער`);
  else
    pass(`סדר הבלוקים תואם לסדר הקנוני (${seen.length} בלוקים בקובץ)`);

  /*  ⛔ ושלמות הסדר — ⚠️ השער בדק **סדר** ⛔ ולא **שלמות**: ⭐ בלוק שנחתם
   *  ואינו ב-`BLOCK_ORDER` פשוט לא נבדק, ⛔ ואיש לא ידע. */
  const og = orderGaps();
  if (og.length)
    fail(`שלמות הסדר הקנוני — נמדדו ${og.length} פערים והצפוי אפס (${og.join(' · ')}). ` +
         `מוסיפים את הבלוק ל-BLOCK_ORDER במקומו, או מסירים משם שם שאינו בלוק חתום`);
  else
    pass(`שלמות הסדר הקנוני — ${BLOCK_ORDER.length} בלוקים בסדר, וכולם חתומים`);

  /*  ⛔ ותבנית הבאנר — ⚠️ «— מודול משותף (סבב N)» הייתה מוסכמה ולא כלל. */
  const bg = bannerGaps();
  if (bg.length)
    fail(`באנר בלוק שאינו בתבנית — נמדדו ${bg.length} והצפוי אפס (${bg.join(' · ')}). ` +
         `כותבים «/* ═══ <שם> — מודול משותף (סבב N) ═══», או מכריזים ב-BANNER_LEGACY`);
  else
    pass(`תבנית באנר הבלוק — כולם נושאים «— מודול משותף (סבב N)» ` +
         `(${BANNER_LEGACY.length} החרגות מוצהרות)`);
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
  const a = ls.findIndex((l) => /^<!--\s*SHARED:start\s+id="table"/.test(l));
  const b = ls.findIndex((l, i) => i > a && /^<!--\s*SHARED:end/.test(l));
  if (a < 0 || b < 0) return [];
  return ls.slice(a, b).map((l) => /^\|\s*(\d+)\s*\|/.exec(l)).filter(Boolean).map((m) => Number(m[1]));
}

function tableRow(row) {
  if (!fs.existsSync(APP.docs)) return null;
  const ls = fs.readFileSync(APP.docs, 'utf8').split('\n');
  /*  ⛔ אין לסרוק את הקובץ כולו (סבב 69) — ⚠️ פרק סבב
   *  מחזיק טבלאות ממוספרות משלו, וחיפוש גלובלי היה מוצא «| 3 |» שלהן. */
  const a = ls.findIndex((l) => /^<!--\s*SHARED:start\s+id="table"/.test(l));
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

/*  ⛔ שכבת המודאל נמדדת בכמות (סבב 92) — ⚠️ ה-probe הקודם בדק **קיום שם**:
 *  חתימת `openModal`, `id="modal"`, `id="ask"` ו-`closeAsk` — ⛔ והוא היה
 *  עובר על מסך שיש בו **שני** מיכלים או **שני** מסלולי סגירה, ⚠️ שהם בדיוק
 *  מה שהשורה אוסרת. ⭐ ומה שנמדד מעכשיו: מיכל אחד לכל דיאלוג · פותח אחד
 *  וסוגר אחד לכל מיכל · ⛔ ואף מסלול אחר שנוגע במיכל · ⚠️ וגוף ה-`ask`
 *  ב-`textContent`, ⛔ שדיאלוג «כן/לא» אינו מקבל HTML. */
/*  ⛔ הגוף נלקח מ-`src` ולא מ-`code` — ⚠️ `blankNonCode` מלבין את **תוכן**
 *  המחרוזות, ⭐ ו-`'open'` הופך שם לרווחים: ⛔ regex שמחפש את שם המחלקה
 *  היה מוצא אפס על קוד תקין. ⚠️ והטווחים חופפים, ⭐ שההלבנה שומרת על
 *  אורך הטקסט. */
const fnBodyRaw = (name) => { const r = fnRange(name); return r ? src.slice(r[0], r[1]) : ''; };

function modalGaps() {
  const out = [];
  for (const id of ['modal', 'ask']) {
    const n = (src.match(new RegExp('id="' + id + '"', 'g')) || []).length;
    if (n !== 1) out.push(`מיכל «${id}» — נמדדו ${n} והצפוי 1`);
  }
  /*  ⛔ מחלקת המעטפת נגזרת מהמיכל ⛔ ואינה מוקלדת — ⚠️ היא נבדלת בין
   *  הארבע (`modal-overlay` מול `veil`), ⭐ ומה שמשותף הוא ש**שני**
   *  המיכלים נושאים את **אותה** מחלקה: ⛔ שם מוקלד היה מפיל שלוש מהן. */
  const cls = (id) => {
    const m = new RegExp('<div[^>]*id="' + id + '"[^>]*>').exec(src);
    const c = m && /class="([^"]+)"/.exec(m[0]);
    return c ? c[1].trim() : null;
  };
  const cm = cls('modal'), ca = cls('ask');
  if (!cm || !ca) out.push(`מחלקת המעטפת — נמדדו «${cm}»/«${ca}» והצפוי שם לשניהם`);
  else if (cm !== ca) out.push(`מחלקת המעטפת נבדלת בין המיכלים — «${cm}» מול «${ca}»`);
  else {
    const n = (src.match(new RegExp('class="' + cm + '"', 'g')) || []).length;
    if (n !== 2) out.push(`מיכלי «${cm}» — נמדדו ${n} והצפוי 2`);
  }
  const PAIRS = [['openModal', 'add'], ['closeModal', 'remove'],
                 ['ask', 'add'], ['closeAsk', 'remove']];
  let inside = 0;
  for (const [fn, op] of PAIRS) {
    const b = fnBodyRaw(fn);
    if (!b) { out.push(`הפונקציה «${fn}» אינה קיימת`); continue; }
    const n = (b.match(new RegExp("classList\\." + op + "\\('open'\\)", 'g')) || []).length;
    if (n !== 1) out.push(`«${fn}» — נמדדו ${n} קריאות classList.${op}('open') והצפוי 1`);
  }
  /*  ⛔ ואף מסלול אחר אינו **משנה** את מחלקת המיכלים — ⚠️ קריאה שמודדת
   *  אם המיכל פתוח היא שאילתה ⛔ ולא מסלול, ⭐ ולכן הנמדד הוא `classList`
   *  ⛔ ולא עצם האיתור: ⚠️ ספירת אתרי `getElementById` הייתה מפילה את
   *  מסלול ה-`Escape`, שקורא את המצב ומנתב לאותן ארבע. */
  let stray = 0;
  for (const b of src.split(/\nfunction /)) {
    if (/^(?:openModal|closeModal|ask|closeAsk)\s*\(/.test(b)) continue;
    if (!/getElementById\('(?:modal|ask)'\)/.test(b)) continue;
    stray += (b.match(/classList\.(?:add|remove)\('open'\)/g) || []).length;
  }
  if (stray) out.push(`מסלולי פתיחה/סגירה נוספים למיכלים — נמדדו ${stray} והצפוי 0`);
  if (!/function openModal\s*\(\s*title\s*,\s*body\s*,\s*foot\s*\)/.test(code))
    out.push('חתימת `openModal(title, body, foot)` אינה כמוצהר');
  const askB = fnBodyRaw('ask');
  if (askB && !/\.textContent\s*=\s*text\b/.test(askB))
    out.push('גוף ה-`ask` אינו ב-textContent');
  if (askB && /\.innerHTML\s*=/.test(askB))
    out.push('גוף ה-`ask` נכתב ב-innerHTML — דיאלוג «כן/לא» אינו מקבל HTML');
  return out;
}

/*  ⛔ מספר הארגומנטים של קריאה בשם (סבב 87) — ⚠️ הספירה היא של פסיקים
 *  **ברמה העליונה** ⛔ ולא של תווי `,` בטקסט: ⭐ הארגומנט הראשון של שכבת
 *  השורות הוא פונקציה, ⛔ והפסיקים שבתוכה אינם מפרידי ארגומנט. ⚠️ וקריאה
 *  שמשמיטה את החלון מוחזרת כ-2 ⛔ ולא כ-3, ⭐ וזה בדיוק מה שהשורה אוסרת. */
/*  ⛔ מימוש אחד ⛔ ושני מבטים (סבב 89) — ⚠️ `callArity` מחזירה מספרים,
 *  ⭐ ו-`callArityAt` את אותן קריאות עם ההיסט שלהן: ⛔ שני גופים לאותה
 *  ספירה היו נסחפים זה מזה. */
function callArityAt(text, name) {
  const out = [], NEEDLE = name + '(';
  let i = text.indexOf(NEEDLE);
  while (i >= 0) {
    const before = i ? text[i - 1] : ' ';
    if (/[A-Za-z0-9_$.]/.test(before)) { i = text.indexOf(NEEDLE, i + 1); continue; }
    let d = 0, n = 0, j = i + NEEDLE.length;
    for (; j < text.length; j++) {
      const ch = text[j];
      if (ch === ')' && d === 0) break;
      if (!n && !/\s/.test(ch)) n = 1;
      if (ch === '(' || ch === '[' || ch === '{') d++;
      else if (ch === ')' || ch === ']' || ch === '}') d--;
      else if (ch === ',' && d === 0) n++;
    }
    out.push({ i: i, n: n });
    i = text.indexOf(NEEDLE, j < 0 ? i + 1 : j);
  }
  return out;
}
function callArity(text, name) {
  return callArityAt(text, name).map((x) => x.n);
}
/*  ⚠️ קריאה מהמקור **הגולמי** — כולל הערות ומחרוזות (סבב 53). ⛔ שמור
 *  לשמות אירועים ולערכים שחיים בתוך מחרוזת, שאותם `code` מרוקן. */
const hasSrc = (re) => re.test(src);
/*  מדיניות הפינוי — `LS_CFG` **וגם** `lsRebuildPolicy()`. ⚠️ ביומן `tier2`
 *  נבנית בזמן ריצה (המפתחות נושאים סיומת מוסד), ולכן היא אינה ליטרל בתוך
 *  `LS_CFG`; probe שקרא את האובייקט בלבד היה מדווח «אין פינוי» על אפליקציה
 *  שמפנה. הפונקציה פשוט אינה קיימת בשלוש האחרות והצירוף שקוף. */
const policyBlock = () => cfgBlock('LS_CFG') + fnBody('lsRebuildPolicy');
/*  ⛔ **מבנה ה-`tier` נמדד, ולא רק שהוא מפנה** (סבב 96ד) — ⚠️ `tier` הוא
 *  מערך של פריטים, ⛔ וכל פריט נושא `key` ו-`syncedThrough` משלו: ⭐ העֵד
 *  נבדק **פר-פריט** ⛔ ולא בכניסה לרשימה. ⚠️ הנימוק המדוד: `tier1` בשכר
 *  היה `getter` שבדק את העֵד בכניסה, ⛔ והתקן אישר אותו — ⭐ ש«פר-מפתח»
 *  התקיים בשני המימושים, ⚠️ ואיש לא ידע ששניים הם. ⛔ ומערך ריק הוא
 *  הצהרה תקפה שאין מה לפנות, ⚠️ ואינו נספר כפריט. */
const tierArrays = (pb) => {
  const out = []; const re = /tier[12]\s*[:=]\s*\[/g; let m;
  while ((m = re.exec(pb)) !== null) {
    let i = m.index + m[0].length - 1, d = 0, j = i;
    for (; j < pb.length; j++) {
      if (pb[j] === '[') d++;
      else if (pb[j] === ']') { d--; if (!d) break; }
    }
    out.push(pb.slice(i + 1, j));
  }
  return out;
};
/*  ⛔ הפריטים נחתכים בהתאמת סוגריים ⛔ ולא בפסיק — ⚠️ `syncedThrough`
 *  הוא פונקציה, ⭐ ופסיק שבתוכה היה חותך פריט באמצע. */
const tierItems = (body) => {
  const out = []; let d = 0, start = -1;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '{') { if (!d) start = i; d++; }
    else if (body[i] === '}') { d--; if (!d && start >= 0) { out.push(body.slice(start, i + 1)); start = -1; } }
  }
  return out;
};
const tierShape = () => {
  const pb = policyBlock();
  if (/get\s+tier[12]\s*\(/.test(pb)) return { ok: false, items: 0 };
  let items = 0, bad = 0;
  for (const body of tierArrays(pb)) {
    if (!body.trim()) continue;
    /*  ⛔ פריט שאינו אובייקט — מחרוזת עירומה — הוא מפתח בלי עֵד. */
    bad += (body.match(/(?:^|,)\s*'[^']*'/g) || []).length;
    for (const it of tierItems(body)) {
      items++;
      if (!/\bkey\s*:/.test(it) || !/\bsyncedThrough\s*:/.test(it)) bad++;
    }
  }
  return { ok: bad === 0, items: items };
};
/*  ⛔ עֵד פר-מפתח — ⚠️ החותמת הגלובלית אינה עונה על השורה: ⭐ היא מתעדכנת
 *  גם במשיכה, ⛔ ומפנה מהדיסק רשומה שמעולם לא עלתה. */
const perKeyWitness = () => /_\w+Pushed(?:For|Through)\s*\(/.test(policyBlock());
/*  ⛔ ולעֵד יש אתר האכלה חי — ⚠️ ההגדרה לבדה אינה מאכילה: ⭐ נספרות
 *  ההופעות של שם הסימון, ⛔ ואחת מהן היא ההגדרה עצמה. */
const witnessFed = () => {
  const d = /function\s+(_\w+MarkPushed)\s*\(/.exec(code);
  if (!d) return false;
  return (code.match(new RegExp('\\b' + d[1] + '\\s*\\(', 'g')) || []).length >= 2;
};

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
/*  ⛔ גוף הפונקציה העוטפת — ⚠️ החיפוש הוא מהסוגר הפתוח הקרוב
 *  כלפי חוץ, ⛔ ונעצר בסוגר שלפניו כותרת פונקציה: ⭐ בלוק שאינו
 *  פונקציה מחזיר ריק, ⛔ ולא את הסקריפט כולו — ⚠️ גוף שמכיל הכול
 *  הוא probe שאינו יכול להיכשל. */
const FN_HEAD = /(?:function\s*[A-Za-z_$][\w$]*\s*\([^)]*\)|function\s*\([^)]*\)|\)\s*=>)\s*$/;
function enclosingFnBody(text, pos) {
  let d = 0;
  for (let i = pos; i >= 0; i--) {
    const c = text[i];
    if (c === '}') d++;
    else if (c === '{') {
      if (d) { d--; continue; }
      if (!FN_HEAD.test(text.slice(Math.max(0, i - 200), i))) continue;
      let d2 = 0;
      for (let j = i; j < text.length; j++) {
        if (text[j] === '{') d2++;
        else if (text[j] === '}') { d2--; if (!d2) return text.slice(i, j + 1); }
      }
      return '';
    }
  }
  return '';
}
/*  ⛔ שתי צורות פתיחה ולא אחת (סבב 80) — ⚠️ מיכל שנפתח ב-`display`
 *  ומיכל שנפתח בהוספת מחלקה הם אותה יכולת בדיוק. */
const MODAL_SHOWN = /classList\.add\(['"]open['"]\)|display\s*=\s*['"](?:flex|block)['"]/;
function orphanModals() {
  const out = [];
  for (const m of src.matchAll(/<div\s+id="([\w-]*modal[\w-]*)"[^>]*class="[^"]*modal[^"]*"/g)) {
    const id = m[1];
    /*  ⛔ נמדד ב-`srcRefs` ⛔ ולא ב-`code` — ⚠️ המזהה חי **בתוך מחרוזת**
     *  (`getElementById('x-modal')`), ⭐ ובגזירת הקוד המחרוזות מרוקנות:
     *  ⛔ probe שמחפש שם שם אינו יכול למצוא אותו, כלומר אינו יכול להיכשל. */
    /*  ⛔ החיפוש בגוף הפונקציה ⛔ ולא בחלון תווים קבוע — ⚠️ הנימוק
     *  המדוד: החלון היה 80 תווים, ⭐ ופתיחה שקוראת קודם לארבעת
     *  האלמנטים ומאמתת אותם נדחפה מעברו: ⛔ השער דיווח «מיכל בלי
     *  פותח» על מיכל שנפתח שלוש שורות אחריו. */
    const re = new RegExp("['\"]" + id + "['\"]", 'g');
    let mm, shown = false;
    while ((mm = re.exec(srcRefs)) !== null)
      if (MODAL_SHOWN.test(enclosingFnBody(srcRefs, mm.index))) { shown = true; break; }
    if (shown) continue;
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

/*  ⛔ מיקום מיכל המודאל (סבב 91) — ⚠️ **שתי מדידות ולא אחת**: ⭐ העומק
 *  **בעץ** שהפרסר בונה, ⛔ ו**המקום במקור** מול `</body>`: ⚠️ הדפדפן מעביר
 *  אלמנט שאחרי `</body>` בחזרה לתוך `body` — ⭐ ולכן עץ תקין לבדו אינו
 *  ראיה שהמקור תקין, ⛔ והוא בדיוק מה שהסתיר את הבאג.
 *  ⛔ **והעץ נבנה בכללי הסגירה המשתמעת** ⛔ ולא בספירת תגיות — ⚠️ `p` · `li`
 *  · `td` · `option` נסגרים מאליהם, ⭐ ומחסנית שאינה יודעת זאת סופרת אב
 *  שהפרסר כבר סגר: ⛔ עומק מנופח על מקור תקין, ⚠️ או אב אמיתי שנבלע.
 *  ⛔ **ותוכן raw-text מולבן** — `script` · `style` · `textarea` · `title`:
 *  ⚠️ מחרוזת HTML בתוך JS אינה תג בעץ. */
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                           'link', 'meta', 'param', 'source', 'track', 'wbr']);
/*  ⛔ תג פתיחה שסוגר מאליו את מה שפתוח — ⚠️ הרשימה היא כללי הסגירה
 *  המשתמעת של התקן, ⭐ ולא נוחות: ⛔ בלעדיה `<li>` שלא נסגר הוא אב. */
const AUTO_CLOSE = {
  li: ['li'], dt: ['dt', 'dd'], dd: ['dt', 'dd'],
  option: ['option'], optgroup: ['option', 'optgroup'],
  tr: ['td', 'th', 'tr'], td: ['td', 'th'], th: ['td', 'th'],
  tbody: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'],
  tfoot: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'],
  thead: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'],
};
/*  ⛔ תג בלוק סוגר `p` פתוח — ⚠️ הרשימה מהתקן, ⭐ ו-`p` הוא היחיד שנסגר כך. */
const CLOSES_P = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div',
  'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'header', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section',
  'table', 'ul']);
function modalPlacement(html) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  const t = html.replace(/<script[\s\S]*?<\/script>/gi, blank)
                .replace(/<style[\s\S]*?<\/style>/gi, blank)
                .replace(/<textarea[\s\S]*?<\/textarea>/gi, blank)
                .replace(/<title[\s\S]*?<\/title>/gi, blank)
                .replace(/<!--[\s\S]*?-->/g, blank);
  const re = /<(\/?)([A-Za-z][\w-]*)((?:\u0022[^\u0022]*\u0022|\u0027[^\u0027]*\u0027|[^>])*?)(\/?)>/g;
  const stack = [];
  let inBody = false, bodyClosed = false, m;
  const popTo = (tag) => {
    for (let i = stack.length - 1; i >= 0; i--)
      if (stack[i] === tag) { stack.length = i; return true; }
    return false;                       /* ⛔ תג סוגר בלי פתיחה — התקן מתעלם */
  };
  while ((m = re.exec(t)) !== null) {
    const close = m[1] === '/', tag = m[2].toLowerCase(), attrs = m[3], self = m[4] === '/';
    if (close) {
      if (tag === 'body' || tag === 'html') { bodyClosed = true; continue; }
      popTo(tag);
      continue;
    }
    if (tag === 'body') { inBody = true; stack.length = 0; continue; }
    /*  ⛔ הסגירה המשתמעת קודמת למדידה — ⚠️ אחרת האב שנספר כבר נסגר. */
    if (AUTO_CLOSE[tag]) while (stack.length && AUTO_CLOSE[tag].indexOf(stack[stack.length - 1]) >= 0) stack.pop();
    if (CLOSES_P.has(tag) && stack.indexOf('p') >= 0) popTo('p');
    if (/\bid\s*=\s*[\u0022\u0027]modal[\u0022\u0027]/.test(attrs))
      /*  ⛔ ההורה בשמו ⛔ ולא עומק מספרי (סבב 91) — ⚠️ «עומק 1» סופר רמות
       *  ⛔ ואינו בודק **מי** ההורה: ⭐ וזו הפעם השלישית שהשער הזה מדד את
       *  הדבר הלא נכון — ספירת תגיות · ספירת רמות · ועכשיו שם ההורה. */
      return { found: true, parent: stack.length ? stack[stack.length - 1] : (inBody ? 'body' : null),
               depth: inBody ? stack.length + 1 : 0, afterBodyClose: bodyClosed };
    if (VOID_TAGS.has(tag) || self) continue;
    stack.push(tag);
  }
  return { found: false, parent: null, depth: -1, afterBodyClose: bodyClosed };
}

/*  ⛔ נטישה בשקט בבלוק משותף (סבב 88) — ⚠️ הטענה אינה «יש `console.error`»
 *  אלא **שאין שער DOM שנוטש בלי לדווח**: ⭐ הסריקה על הבלוקים החתומים
 *  בלבד, ⛔ ועל משתנה שהוצב מ-`getElementById` באותה פונקציה.
 *  ⛔ ורשימת ההיתר היא **שמות פונקציה** — ⚠️ נקודת עגינה של מסך שאינו
 *  מצויר, או שער סביבה שאין בה `document`: ⭐ שם שקיים בבלוק ואין לו
 *  אתר כזה **מפיל**, ⛔ שרשימה שהתיישנה נראית כמו כיסוי. */
const SILENT_DOM_ALLOW = {
  pendRender: 'שער סביבה — ⛔ הפונקציה נקראת גם בהקשר שאין בו `document`, ⚠️ ושם היעדרו הוא תשובה תקפה',
  _lkWarnEl: 'שער סביבה — ⛔ אותו נימוק בדיוק, ⚠️ והיא מחזירה `null` שהקוראים שלה בודקים, ⛔ ולא נוטשת פעולה',
  techInfoMount: 'נקודת עגינה — ⛔ מסך ההגדרות אינו מצויר בכל מסך, ⚠️ והיעדר המיכל הוא «אין לאן לעגון» ולא כשל',
  syncStatusMount: 'נקודת עגינה — ⛔ אותו נימוק, ⚠️ ואזור המצב חי בסוף ההגדרות בלבד',
  bkStatusMount: 'נקודת עגינה — ⛔ אותו נימוק, ⚠️ והיא נתלית על «מידע טכני ›» שנפתח לפי דרישה',
  hwRestoreMount: 'נקודת עגינה — ⛔ אותו נימוק, ⚠️ והכפתור מוצג למנהל בלבד',
};
const SILENT_REPORT = /console\.(?:error|warn)|toast\(|uiNoDialog\(|WriteFail\(/;
/*  ⛔ חיתוך `if (…)` בסוגריים מאוזנים ⛔ ולא ב-`[^)]*` — ⚠️ תנאי שיש בו
 *  קריאה לפונקציה נחתך באמצע, ⭐ והשער היה מאשר בדיוק את מה שהוא מודד. */
function ifSites(body) {
  const out = [];
  let i = body.indexOf('if (');
  while (i >= 0) {
    let d = 0, j = i + 3;
    for (; j < body.length; j++) {
      if (body[j] === '(') d++;
      else if (body[j] === ')') { d--; if (!d) break; }
    }
    const cond = body.slice(i + 4, j);
    let k = j + 1, stmt = '';
    while (k < body.length && /\s/.test(body[k])) k++;
    if (body[k] === '{') {
      let d2 = 0, e = k;
      for (; e < body.length; e++) {
        if (body[e] === '{') d2++;
        else if (body[e] === '}') { d2--; if (!d2) break; }
      }
      stmt = body.slice(k, e + 1);
    } else {
      const e = body.indexOf(';', k);
      stmt = e < 0 ? body.slice(k) : body.slice(k, e + 1);
    }
    out.push({ cond, stmt });
    i = body.indexOf('if (', j);
  }
  return out;
}
function sharedFns() {
  const out = [];
  for (const [a, b] of ranges) {
    const blk = code.slice(a, b);
    const re = /function\s+([A-Za-z_$][\w$]*)\s*\(/g;
    let m;
    while ((m = re.exec(blk)) !== null) {
      let d = 0, s0 = blk.indexOf('{', m.index), j = s0;
      if (s0 < 0) continue;
      for (; j < blk.length; j++) {
        if (blk[j] === '{') d++;
        else if (blk[j] === '}') { d--; if (!d) break; }
      }
      out.push({ name: m[1], body: blk.slice(s0, j + 1) });
    }
  }
  return out;
}
function silentDomSites() {
  const bad = [], seen = new Set();
  for (const f of sharedFns()) {
    const vars = new Set([...f.body.matchAll(
      /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.getElementById/g)].map((x) => x[1]));
    for (const s of ifSites(f.body)) {
      if (!/\breturn\b/.test(s.stmt)) continue;
      const names = [...s.cond.matchAll(/!\s*([A-Za-z_$][\w$]*)/g)].map((x) => x[1]);
      const isDom = names.some((n) => vars.has(n)) || /!\s*document\.body/.test(s.cond);
      if (!isDom) continue;
      seen.add(f.name);
      if (SILENT_REPORT.test(s.stmt)) continue;
      if (SILENT_DOM_ALLOW[f.name]) continue;
      bad.push(f.name + ': if (' + s.cond.trim().slice(0, 40) + ')');
    }
  }
  /*  ⛔ הכרזה שאין לה אתר בפועל מפילה אף היא — ⚠️ ורק כשהפונקציה עצמה
   *  קיימת כאן: ⭐ בלוק שאינו קיים בריפו הזה מדולג ⛔ ואינו מפיל. */
  const here = new Set(sharedFns().map((f) => f.name));
  for (const n of Object.keys(SILENT_DOM_ALLOW))
    if (here.has(n) && !seen.has(n)) bad.push(n + ': מוכרז ואין לו אתר');
  return bad;
}

/*  ⛔ מסלול לחיצה שממתין בלי חיווי (סבב 89) — ⚠️ הטענה אינה «יש `ysBusy`
 *  בקובץ» אלא **שכל מטפל `data-act` שמגיע להמתנה מגיב לפניה**: ⭐ או
 *  שנקודת הניתוב האחת מחזיקה את ההשבתה לכל מטפל שחוזר עם הבטחה, ⛔ או
 *  שהמטפל עצמו משבית או מצייר לפני ה-`await` הראשון שלו.
 *  ⛔ **והתגובה נמדדת לפני ההשהיה הראשונה בלבד** — ⚠️ חיווי שיושב אחרי
 *  ה-`await` הוא בדיוק הכשל שהשורה באה למנוע: ⭐ המסך זז רק כשהרשת חוזרת.
 *  ⛔ **ורשימת צורות התגובה מוצהרת כאן** — ⚠️ השבתה · ציור · הודעה, ⭐ ולא
 *  «יש קריאה כלשהי לפני ה-await». */
const ACT_RESPOND = /ysBusy\(|btnBusy\(|startAuthLoad\(|openModal\(|\.innerHTML\s*=|\.textContent\s*=|\.disabled\s*=\s*true|toast\(/;
/*  ⛔ טווח המפה נמדד ב-`code` וגופה נקרא מ-`src` (סבב 89) — ⚠️ הנימוק
 *  המדוד: `blankNonCode` מלבין **גם את הגרשיים**, ⭐ ושם הפעולה ב-`code`
 *  הוא רווחים: ⛔ סריקה שחיפשה `'act'` שם החזירה אפס רשומות ⛔ ואישרה
 *  את כולן. ⚠️ ושני המערכים באותו אורך בדיוק, ⭐ ולכן ההיסט תקף בשניהם. */
function actMapRange() {
  const i = code.search(new RegExp('(?:var|const)\\s+' + APP.actMap + '\\s*=\\s*\\{'));
  if (i < 0) return null;
  const o = code.indexOf('{', i);
  const n = braceLen(code, o);
  return n ? [o, o + n] : null;
}
/*  ⛔ אורך הבלוק בהתאמת סוגריים — ⚠️ חלון תווים קבוע חותך גוף ארוך ממנו,
 *  ⭐ והמטפל שנחתך נקרא כמסלול סינכרוני ⛔ ועובר בשקט. */
function braceLen(text, o) {
  let d = 0;
  for (let j = o; j < text.length; j++) {
    if (text[j] === '{') d++;
    else if (text[j] === '}') { d--; if (!d) return j + 1 - o; }
  }
  return 0;
}
/*  ⛔ ההשבתה בנקודת הניתוב — ⚠️ שלושת התנאים יחד: שער כניסה-חוזרת · חיווי ·
 *  ⛔ ושחרור אחרי שההבטחה נפתרה: ⭐ בלי השחרור הכפתור נשאר מושבת לנצח. */
function actGateWrapped() {
  /*  ⛔ כל מאזיני הקליק ולא הראשון (סבב 89) — ⚠️ בהנהלה יושב מאזין אחר
   *  לפני מאזין הניתוב, ⭐ והראשון נמדד כניתוב ⛔ והחזיר «אינו עוטף». */
  for (let i = src.indexOf("addEventListener('click'"); i >= 0;
       i = src.indexOf("addEventListener('click'", i + 1)) {
    const o = code.indexOf('{', i);
    const b = code.slice(o, o + braceLen(code, o));
    if (b.indexOf(APP.actMap) < 0) continue;
    /*  ⛔ שער הכניסה-החוזרת נמדד בצורתו ⛔ ולא בשמו — ⚠️ דגל על האלמנט שיוצא
     *  מוקדם: ⭐ שינוי שם עקבי הוא שינוי חי ⛔ ואסור לו להפיל. */
    /*  ⛔ הביטויים נבנים ב-`new RegExp` ⛔ ולא כליטרל — ⚠️ הנימוק המדוד:
     *  ליטרל שנשא `;` לפני הסוגר הפיל את סורק ההערות של השער השני
     *  ⭐ והזיז את מספרי השורות שלו באחת, ⛔ בשקט. */
    const REENTER = new RegExp('if \\(el\\.[A-Za-z_$][\\w$]*\\)\\s*return');
    const AWAITED = new RegExp('\\.then\\(');
    return REENTER.test(b) && ACT_RESPOND.test(b) && AWAITED.test(b);
  }
  return false;
}
/*  ⛔ ארבע צורות ההגדרה ולא אחת (סבב 89) — ⚠️ הנימוק המדוד: עשרת המסלולים
 *  שנמדדו מוגדרים `window.X = async function`, ⭐ וסריקה שחיפשה
 *  `async function X` החזירה **אפס** ⛔ ואישרה אותם. */
function asyncBody(name) {
  /*  ⛔ גבול מזהה בשני הצדדים ⛔ ולא רק בסוף — ⚠️ הנימוק המדוד: בלעדיו
   *  משתנה מקומי בשם `f` נפתר להגדרה של שם אחר שנגמר ב-`f`, ⭐ והמטפל
   *  נמדד כמסלול שממתין ⛔ בלי שיש לו יעד כזה בכלל. */
  const re = new RegExp('(?:^|[^A-Za-z0-9_$.])(?:async\\s+function\\s+' + name + '\\s*\\(' +
    '|(?:window\\.)?' + name + '\\s*[:=]\\s*async\\s+function\\s*\\()');
  const m = re.exec(code);
  if (!m) return '';
  const o = code.indexOf('{', m.index + m[0].length - 1);
  if (o < 0) return '';
  return code.slice(o, o + braceLen(code, o));
}
function actNoFeedback() {
  const r = actMapRange();
  if (!r) return ['אין מפת ' + APP.actMap];
  /*  ⛔ ההערות נחתכות מהגוף — ⚠️ שם פונקציה שמוזכר בהערה אינו קריאה,
   *  ⭐ והוא היה נמדד כיעד. */
  const map = src.slice(r[0], r[1]).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const wrapped = actGateWrapped();
  const bad = [];
  for (const e of map.matchAll(/'([^'\n]*)'\s*:\s*(async\s+)?function\s*\([^)]*\)\s*\{([\s\S]*?)\}\s*,/g)) {
    const [, act, isAsync, body] = e;
    const names = [...new Set([...body.matchAll(/([A-Za-z0-9_$]+)\s*\(/g)].map((m) => m[1]))];
    const targets = names.filter((n) => asyncBody(n));
    if (!isAsync && !targets.length) continue;      // ⛔ מסלול סינכרוני — אין המתנה שצריך לחוות עליה
    /*  ⛔ העוטף מכסה מטפל שמחזיר את ההבטחה ⛔ ולא כל מטפל (סבב 89) — ⚠️ הנימוק
     *  המדוד: עשרים ושלושה מטפלים קראו לפונקציה אסינכרונית **בלי `return`**,
     *  ⭐ והענף שבניתוב לא רץ באף אחד מהם: ⛔ החיווי היה קוד מת שהשער אישר. */
    if (wrapped && (isAsync || /\breturn\b/.test(body))) continue;
    /*  ⛔ התגובה נמדדת בגוף היעד לפני ה-`await` הראשון, ⚠️ ולא בגוף הרשומה
     *  — ⭐ הרשומה היא שורת קריאה אחת. */
    const ok = targets.some((n) => {
      const b = asyncBody(n);
      const k = b.search(/\bawait\b/);
      return k < 0 || ACT_RESPOND.test(b.slice(0, k));
    });
    if (!ok) bad.push((act || '(ריק)') + ' → ' + targets.join(','));
  }
  return bad;
}
/*  ⛔ לוג מסלול — תג ורמה (סבב 91) — ⚠️ הטענה אינה «יש `console`» אלא
 *  **שכל לוג נושא תג מודול בתחילת ההודעה**: ⭐ ארבע האפליקציות חיות באותו
 *  origin, ⛔ וקונסולה בלי תג אינה ניתנת לסינון. ⛔ **והמדידה על הארגומנט
 *  הראשון** ⛔ ולא על ההודעה כולה — ⚠️ תג שיושב בסופה אינו מסנן דבר.
 *  ⛔ **ורישום ה-`sw` נמדד בית-לבית** — ⚠️ שתי השורות בדיוק, ⭐ אחת לכל
 *  רמה: ⛔ אפליקציה ששותקת על כשל רישום היא אפליקציה שאיש אינו יודע
 *  שה-`sw` שלה לא עלה. */
const SW_LOG_OK  = "console.log('[sw] registered:', reg.scope);";
const SW_LOG_BAD = "console.warn('[sw] registration failed:', err);";
/*  ⛔ תג ניפוי (סבב 91) — ⚠️ «יש תג» אינו «תג מסלול»: ⭐ `[Excel] 1 loading`
 *  נושא תג ⛔ והוא שריד ניפוי לכל דבר. ⛔ **שלוש הצורות** — ⚠️ `[dbg]` ·
 *  תג ואחריו מספר סידורי · ו«called» בגוף ההודעה: ⭐ תשעת השרידים שנמחקו
 *  היו נתפסים חלקית בלעדיהן. */
function debugLogs(s) {
  const out = [];
  /*  ⛔ הגרשיים נכתבים כ-`\u0027`/`\u0022` ⛔ ולא כתו — ⚠️ שער אחר מלבין
   *  מחרוזות לפני שהוא סורק, ⭐ וגרש בתוך מחלקת תווים נראה לו כפתיחת
   *  מחרוזת: ⛔ הוא בולע את מה שאחריו, ⚠️ והבליעה נראית כשדה חסר. */
  const re = /console\.\w+\s*\(\s*([\u0027\u0022\u0060])((?:[^\u0027\u0022\u0060\\]|\\.)*)\1/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const msg = m[2];
    if (/^\[\s*dbg\s*\]/i.test(msg)) out.push('[dbg] · ' + msg.slice(0, 34));
    else if (/^\[[^\]]+\]\s*\d+\b/.test(msg)) out.push('תג ומספר סידורי · ' + msg.slice(0, 34));
    else if (/\bcalled\b/i.test(msg)) out.push('called · ' + msg.slice(0, 34));
  }
  return out;
}
function untaggedLogs(s) {
  const out = [];
  /*  ⛔ הגרש האחורי נכתב כ-`\u0060` ⛔ ולא כתו — ⚠️ שער אחר מלבין
   *  מחרוזות לפני שהוא סורק, ⭐ ותו גרש-אחורי בתוך מחלקת תווים נראה לו
   *  כפתיחת תבנית: ⛔ הוא בולע את מה שאחריו, ⚠️ והבליעה נראית כשדה חסר. */
  const re = /console\.log\s*\(\s*([\u0027\u0022\u0060])/g;
  let m;
  while ((m = re.exec(s)) !== null)
    if (s[m.index + m[0].length] !== '[') out.push(s.slice(m.index, m.index + 48));
  return out;
}
/*  ⛔ ספרייה חיצונית — גרסה מוצהרת (סבב 91) — ⚠️ הטענה אינה «יש `script`»
 *  אלא **שכל תג נושא מספר גרסה מפורש ומוצהר ב-`APP.cdnLibs`**: ⭐ קישור
 *  בלי גרסה מקבל בכל טעינה מה שהספרייה פרסמה אתמול, ⛔ ושדרוג שובר מגיע
 *  בלי שאיש דחף דבר. ⛔ **והמדידה משני צדדיה** — ⚠️ תג בלי הצהרה ⛔ והצהרה
 *  בלי תג: ⭐ רשימה שהתיישנה היא בעצמה השארית שהשורה באה לסלק. */
function cdnTags(s) {
  const out = [];
  for (const m of s.matchAll(/<script[^>]*\ssrc="(https:\/\/[^"]+)"/g)) {
    const u = m[1];
    /*  ⛔ שתי תבניות הגרסה — ⚠️ `@1.2.3` של jsdelivr ⛔ ו-`/libs/x/1.2.3/`
     *  של cdnjs: ⭐ מי שאין לו אחת מהן הוא קישור צף. */
    const at   = /@(\d+\.\d+\.\d+)(?:\/|$)/.exec(u);
    const path = /\/libs\/[^/]+\/(\d+\.\d+\.\d+)\//.exec(u);
    const name = /\/libs\/([^/]+)\//.exec(u) || /\/npm\/(?:@[^/]+\/)?([^@/]+)/.exec(u);
    out.push({ url: u, ver: (at && at[1]) || (path && path[1]) || null,
               name: name ? name[1] : null });
  }
  return out;
}
function cdnGaps() {
  const tags = cdnTags(src), decl = APP.cdnLibs || {};
  const gaps = [];
  for (const t of tags) {
    if (!t.ver) gaps.push('קישור בלי גרסה: ' + t.url);
    else if (!t.name || decl[t.name] !== t.ver)
      gaps.push('תג שאינו מוצהר ב-APP.cdnLibs: ' + t.name + '@' + t.ver);
  }
  for (const k of Object.keys(decl))
    if (!tags.some((t) => t.name === k && t.ver === decl[k]))
      gaps.push('הצהרה בלי תג: ' + k + '@' + decl[k]);
  return gaps;
}

/*  ⛔ ייצוא והנפקה — דרך מוצהרת (סבב 91) — ⚠️ הטענה היא **שדרך אחת בלבד
 *  חיה באפליקציה**, ⭐ ושהיא זו שמוצהרת: ⛔ שתי דרכים באותה אפליקציה הן
 *  שני דוחות לאותו נתון, ⚠️ ומשתמש שמקבל תמונה במקום קובץ אינו יודע למה.
 *  ⛔ **וההיעדר מוצהר אף הוא** — ⭐ ריק נקרא «נמדד ואין», ⛔ וחסר נקרא
 *  «לא נשאל». */
function exportWayGaps() {
  const has = {
    'share-image':   /navigator\.share\s*\(/.test(src) || /html2canvas/.test(src),
    'download-file': /\.download\s*=/.test(src) || /createPdf\s*\(/.test(src),
  };
  const live = Object.keys(has).filter((k) => has[k]);
  const want = APP.exportWay || '', fb = APP.exportFallback || '';
  const gaps = [];
  /*  ⛔ נפילה-חזרה מוצהרת אינה דרך שנייה — ⚠️ אותו תוצר בדיוק כשהראשונה
   *  אינה זמינה, ⭐ והיא נמדדת ככזו: ⛔ נפילה-חזרה שאינה מוצהרת מפילה. */
  const allowed = [want, fb].filter(Boolean);
  const extra = live.filter((k) => allowed.indexOf(k) < 0);
  if (extra.length) gaps.push('דרך ייצוא שאינה מוצהרת: ' + extra.join(' · '));
  if (want && live.indexOf(want) < 0) gaps.push('מוצהר «' + want + '» ואינו בקוד');
  if (fb && !want) gaps.push('נפילה-חזרה מוצהרת בלי דרך ראשית');
  if (fb && live.indexOf(fb) < 0) gaps.push('נפילה-חזרה מוצהרת «' + fb + '» ואינה בקוד');
  return gaps;
}
/*  ⛔ המעטפת היא `WebView` ⛔ ולא TWA (סבב 91) — ⚠️ ה-probe מדד **קיום
 *  קובץ** בלבד: ⭐ הוא עבר על מעטפת TWA, על מניפסט ריק, ועל כל תוכן שהוא.
 *  ⛔ **ומה שנמדד עכשיו הוא ערך** — ⚠️ שהמניפסט מכריז את הפעילות המשגרת,
 *  ⛔ שהיא יורשת את `ShellActivity`, ⛔ שהמעטפת בונה `WebView` בפועל,
 *  ⚠️ **ושאין בעץ סימן TWA**: ⭐ שלושת התנאים יחד, ⛔ ולא אחד מהם. */
function shellIsWebView() {
  const man = 'android/app/src/main/AndroidManifest.xml';
  if (!hasPath(man)) return false;
  const xml = fs.readFileSync(man, 'utf8');
  if (!/android:name="\.MainActivity"/.test(xml)) return false;
  if (!/android\.intent\.category\.LAUNCHER/.test(xml)) return false;
  let main = '', shell = '';
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = d + '/' + e.name;
    if (e.isDirectory()) walk(p);
    else if (e.name === 'MainActivity.java')  main  = fs.readFileSync(p, 'utf8');
    else if (e.name === 'ShellActivity.java') shell = fs.readFileSync(p, 'utf8'); } };
  try { walk('android/app/src/main/java'); } catch (e) { return false; }
  if (!/extends\s+ShellActivity/.test(main)) return false;
  if (!/\bnew\s+WebView\s*\(/.test(shell) && !/\bWebView\b/.test(shell)) return false;
  /*  ⛔ סימני TWA — ⚠️ מעטפת שמכריזה אחד מהם אינה `WebView` מקורי. */
  const twa = /TrustedWebActivity|androidbrowserhelper|LauncherActivity/i;
  return !twa.test(xml) && !twa.test(main) && !twa.test(shell);
}

/*  ⛔ מפתח החתימה קבוע (סבב 91) — ⚠️ ה-probe מדד ש**קיים** קובץ `.keystore`:
 *  ⭐ keystore חדש הוא גם קובץ קיים, ⛔ והשורה אומרת «לעולם לא חדש».
 *  ⛔ **ולכן נמדדת זהותו** — ⚠️ חתימת התוכן מול הערך המוצהר ב-`APP.keystoreSha`. */
function keystoreFixed() {
  if (!hasPath('signing')) return false;
  const ks = fs.readdirSync('signing').filter((f) => f.endsWith('.keystore'));
  if (ks.length !== 1) return false;
  const sha = crypto.createHash('sha256')
                .update(fs.readFileSync('signing/' + ks[0])).digest('hex').slice(0, 16);
  return sha === APP.keystoreSha;
}

/*  ⛔ קובץ הסכימה — ⚠️ שתי שורות נשענו על **אותה** בדיקת קיום, ⭐ ואף אחת
 *  מהן לא מדדה את טענתה: ⛔ «מקור אחד» ו«התקנה מלאה» אינם «הקובץ קיים».
 *  ⛔ **וההערות נחתכות לפני המדידה** — ⚠️ המילים `create table` מופיעות
 *  בהערות הסבר, ⭐ וספירה גולמית מדווחת פער על קובץ תקין. */
function schemaSql() {
  if (!hasPath(APP.schemaFile)) return null;
  return fs.readFileSync(APP.schemaFile, 'utf8').replace(/--[^\n]*/g, '');
}
function schemaSingleSource() {
  const sql = schemaSql();
  if (!sql || !/create\s+table/i.test(sql)) return false;
  /*  ⛔ ואין עותק מוטבע — ⚠️ סכימה שנייה בקוד הלקוח מתיישנת בכל מיגרציה. */
  return !/create\s+table/i.test(src);
}
function schemaIdempotent() {
  const sql = schemaSql();
  if (!sql) return false;
  const all  = (sql.match(/create\s+table/gi) || []).length;
  const idem = (sql.match(/create\s+table\s+if\s+not\s+exists/gi) || []).length;
  return all > 0 && all === idem;
}
/*  ⛔ המסמך מתפרסר נקי (סבב 91) — ⚠️ הטענה אינה «יש `body`» אלא **שאין
 *  תיקון**: ⭐ פרסר תואם-תקן משלים תג חסר ומתעלם מתג עודף בשקט, ⛔ והמסמך
 *  «עובד» — ⚠️ ולכן `</div>` עודף ושבעה תווי BOM עברו את כל השערים: ⭐ כולם
 *  סורקים טקסט, ⛔ ואף אחד אינו בונה עץ.
 *  ⛔ **וההלבנה קודמת לפרסור** — ⚠️ `'</body></html>'` בתוך מחרוזת JS אינו
 *  תג, ⭐ והוא מסלול חי (חלון ההדפסה): ⛔ שער שסופר טקסט רואה בו כפילות. */
function docParseGaps() {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  const t = src.replace(/<script[\s\S]*?<\/script>/gi, blank)
               .replace(/<style[\s\S]*?<\/style>/gi, blank)
               .replace(/<!--[\s\S]*?-->/g, blank);
  const out = [];
  const lineOf = (i) => t.slice(0, i).split('\n').length;
  /*  ⛔ תו BOM בגוף הקובץ — ⚠️ הוא בלתי-נראה, ⭐ ולפני ה-`DOCTYPE` הוא
   *  דוחף את המסמך למצב quirks: ⛔ מי שצריך אותו לקידוד כותב `\uFEFF`. */
  const bom = (src.match(/\uFEFF/g) || []).length;
  if (bom) out.push(`${bom} תווי BOM`);
  /*  ⛔ תג יחיד לכל אחד מארבעת המבניים — ⚠️ תג שני נבלע בשקט,
   *  ⭐ והפרסר בוחר אחד מהם ⛔ בלי לומר מי. */
  for (const [re, nm] of [[/<html[\s>]/gi, '<html>'], [/<head[\s>]/gi, '<head>'],
                          [/<body[\s>]/gi, '<body>'], [/<\/body\s*>/gi, '</body>']]) {
    const n = (t.match(re) || []).length;
    if (n !== 1) out.push(`${nm} מופיע ${n} פעמים במקום 1`);
  }
  /*  ⛔ איזון התגים בגוף — ⚠️ תג סוגר בלי פותח, ⛔ או פותח שלא נסגר. */
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                        'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const re = /<(\/?)([A-Za-z][\w-]*)((?:\u0022[^\u0022]*\u0022|\u0027[^\u0027]*\u0027|[^>])*?)(\/?)>/g;
  const stack = []; let inBody = false, m, tail = -1;
  while ((m = re.exec(t)) !== null) {
    const close = m[1] === '/', tag = m[2].toLowerCase(), self = m[4] === '/';
    if (!inBody) { if (!close && tag === 'body') inBody = true; continue; }
    if (close) {
      if (tag === 'body') { tail = re.lastIndex; break; }
      let idx = -1;
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i][0] === tag) { idx = i; break; }
      if (idx < 0) out.push(`תג סוגר עודף </${tag}> בשורה ${lineOf(m.index)}`);
      else stack.length = idx;
      continue;
    }
    if (VOID.has(tag) || self) continue;
    stack.push([tag, lineOf(m.index)]);
  }
  if (stack.length)
    out.push(`תגים שלא נסגרו: ${stack.map((x) => x[0] + '@' + x[1]).join(' · ')}`);
  /*  ⛔ ואין אלמנט אחרי `</body>` — ⚠️ הדפדפן מחזיר אותו פנימה, ⭐ וזו
   *  התנהגות תיקון ⛔ ולא כוונה. */
  if (tail > 0) {
    const rest = t.slice(tail).replace(/<\/html\s*>/i, '').trim();
    if (rest) out.push(`תוכן אחרי </body>: ${rest.slice(0, 40)}`);
  }
  return out;
}
/*  ⛔ סולם נקודות השבירה (סבב 97) — ⚠️ הסולם נקרא **מהבלוק החתום**
 *  ⛔ ואינו מוקלד כאן: ⭐ שני מקומות לאותה רשימה הם שתי רשימות, ⚠️ ומי
 *  שמעדכן את הבלוק אינו רואה את השער. */
function bpScale() {
  const m = /var BP_SCALE = \[([^\]]*)\]/.exec(src);
  if (!m) return [];
  return m[1].split(',').map((x) => Number(x.trim())).filter((x) => x > 0);
}
/*  ⛔ שאילתות הרוחב שבמקור — ⚠️ `prefers-color-scheme` ו-`print` אינן
 *  שאילתות פריסה ⛔ ואינן נספרות: ⭐ אין להן נקודת שבירה. */
function widthQueries() {
  return [...src.matchAll(/@media[^{]*?\((min|max)-width\s*:\s*(\d+)px\)/g)]
    .map((m) => ({ dir: m[1], px: Number(m[2]), at: m.index }));
}
/*  ⛔ נקודת שבירה שאינה בסולם — ⚠️ **המדידה האחת** ששתי השורות נשענות
 *  עליה: ⭐ שורת הפריסה ושורת השאילתה המתה קוראות את אותה פונקציה,
 *  ⛔ ואינן מודדות פעמיים. */
function bpOutOfScale() {
  const scale = bpScale();
  if (!scale.length) return ['הסולם אינו מוצהר בבלוק החתום'];
  return widthQueries().filter((q) => !scale.includes(q.px))
    .map((q) => `נקודת שבירה מחוץ לסולם: ${q.dir}-width:${q.px}px`);
}
function bpGaps() {
  const out = [];
  const vp = (src.match(/<meta[^>]+name=["']viewport["']/g) || []).length;
  if (vp !== 1) out.push(`תגי viewport: ${vp} והצפוי 1`);
  for (const q of widthQueries())
    if (q.dir === 'max') out.push(`max-width בשאילתת פריסה: ${q.px}px`);
  return out.concat(bpOutOfScale());
}
/*  ⛔ שאילתה שאין בגופה כלל שחל (סבב 97) — ⚠️ הגוף נחתך בהתאמת סוגריים
 *  ⛔ ולא בחלון תווים: ⭐ שאילתה שגופה ארוך מהחלון נמדדה ריקה. */
function deadMediaSites() {
  const out = [];
  for (const m of src.matchAll(/@media[^{]*\{/g)) {
    let d = 0, i = m.index + m[0].length - 1;
    const s0 = i;
    for (; i < src.length; i++) {
      if (src[i] === '{') d++;
      else if (src[i] === '}') { d--; if (!d) break; }
    }
    const body = src.slice(s0 + 1, i).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!/[:{]/.test(body)) out.push(`שאילתה בלי כלל: ${m[0].trim().slice(0, 40)}`);
  }
  return out.concat(bpOutOfScale());
}
/*  ⛔ ערכת נושא — בהיר וכהה (סבב 97) — ⚠️ המבנה אחד בארבעתן: בלוק
 *  `prefers-color-scheme:dark` **יחיד** ובתוכו `:root` יחיד, ⛔ וכל
 *  אסימון צבע שבערכה הבהירה נושא מקבילה כהה — ⭐ ואסימון כהה שאין לו
 *  מקבילה בהירה הוא סחיפה: ⚠️ הוא צובע במצב אחד ואינו קיים בשני. */
function themeGaps() {
  const out = [];
  const n = (src.match(/@media\s*\(prefers-color-scheme/g) || []).length;
  if (n !== 1) { out.push(`בלוקי מצב כהה: ${n} והצפוי 1`); return out; }
  const dm = /@media\s*\(prefers-color-scheme\s*:\s*dark\)\s*\{([\s\S]*?)\n\}/.exec(src);
  if (!dm) { out.push('בלוק מצב כהה שאינו נסגר בעמודה הראשונה'); return out; }
  const li = src.indexOf(':root');
  const light = src.slice(li, src.indexOf('}', li));
  const grab = (t) => new Map([...t.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;\n}]+)/g)]
                              .map((m) => [m[1], m[2].trim()]));
  const L = grab(light), D = grab(dm[1]);
  if (!L.size) { out.push('הערכה הבהירה לא נמצאה'); return out; }
  for (const [k, v] of L)
    if (/#|rgba?\(/.test(v) && !D.has(k)) out.push(`אסימון בהיר בלי מקבילה כהה: ${k}`);
  for (const k of D.keys()) if (!L.has(k)) out.push(`אסימון כהה שאינו בערכה הבהירה: ${k}`);
  return out;
}
/*  ⛔ הערה שמתארת מצב שחלף (סבב 97) — ⚠️ הנמדד הוא **דפוס המצבה**
 *  בלבד: ⭐ שבע הצורות שברשימה שמתחת, ⛔ ושלושת הדפוסים
 *  האחרים שבשורה נסרקים ידנית — ⚠️ אין להם צורה קבועה שאפשר לגזור
 *  מהטקסט. ⛔ **וההיקף הוא מקור האפליקציה ו-`tools/`** ⛔ ולא קובצי
 *  הלקחים: ⭐ הם יומן היסטורי בכוונה, ⚠️ ותיאור מה שחלף הוא תוכנם. */
/*  ⛔ כל צורה מורכבת משני חלקים ⛔ ואינה מחרוזת שלמה — ⚠️ אחרת הקובץ
 *  הזה עצמו נספר כאתר, ⭐ והשער מפיל את עצמו. */
const STALE_MARKS = ['היה ' + 'כאן', 'הוסר ' + 'מכאן', 'הוסרה ' + 'מכאן',
                     'נמחק ' + 'מכאן', 'נמחקה ' + 'מכאן', 'הוחלף ' + 'ב-',
                     'בעבר ' + 'היה'];
function staleNoteSites() {
  const out = [];
  const files = ['index.html', 'sw.js'];
  try { for (const f of fs.readdirSync('tools').filter((x) => x.endsWith('.mjs'))) files.push('tools/' + f); }
  catch (e) { out.push('איסוף הקבצים נכשל'); }
  files.push('CLAUDE.md');
  for (const f of files) {
    let t = '';
    try { t = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    for (const mark of STALE_MARKS)
      if (t.includes(mark)) out.push(`${f}: «${mark}»`);
  }
  return out;
}

const MATRIX = [
  /*  ⛔ פריסה במסכי טלפון וטאבלט (סבב 97) — ⚠️ שלוש מדידות יחד: ⭐ תג
   *  `viewport` אחד · ⛔ אין `max-width` בשאילתת פריסה · ⛔ וכל נקודת
   *  שבירה בסולם המוצהר: ⚠️ שתי הראשונות לבדן עוברות על קובץ שסולמו
   *  שרירותי, ⭐ והשלישית לבדה עוברת על קובץ שמערבב כיוונים. */
  { row: 78, name: 'פריסה במסכי טלפון וטאבלט',
    probe: () => bpGaps().length === 0 },
  /*  ⛔ ערכת נושא — בהיר וכהה (סבב 97) — ⚠️ הטענה אינה «יש בלוק כהה»
   *  אלא **שהוא מכסה את הערכה הבהירה כולה**: ⭐ אסימון שנשכח נשאר בהיר
   *  במצב כהה, ⛔ והטקסט שמעליו נעלם. */
  { row: 79, name: 'ערכת נושא — בהיר וכהה',
    probe: () => themeGaps().length === 0 },
  /*  ⛔ הערה שמתארת מצב שחלף (סבב 97) — ⚠️ הנימוק המדוד: בסבבים 87–96
   *  ירדו מאות ספירות, מצבות והפניות לכללים שנמחקו, ⭐ וכולן נמצאו
   *  במקרה: ⛔ אף שורה לא אכפה אותן. */
  { row: 154, name: 'הערה שמתארת מצב שחלף',
    probe: () => staleNoteSites().length === 0 },
  /*  ⛔ שאילתת `@media` מתה (סבב 97) — ⚠️ שני צדדיה: גוף בלי כלל,
   *  ⛔ ונקודת שבירה שאינה בסולם — ⭐ והצד השני נמדד באותה פונקציה
   *  בדיוק שקוראת שורת הפריסה: ⛔ שתי מדידות לאותו ערך הן שתי אמיתות. */
  { row: 158, name: 'שאילתת `@media` מתה',
    probe: () => deadMediaSites().length === 0 },
  /*  ⛔ ספרייה חיצונית — גרסה מוצהרת (סבב 91) — ⚠️ קישור בלי גרסה, תג בלי
   *  הצהרה, והצהרה בלי תג — ⭐ שלושתם אותה טענה משני צדדיה. */
  { row: 91, name: 'ספרייה חיצונית — גרסה מוצהרת',
    probe: () => cdnGaps().length === 0 },
  /*  ⛔ ייצוא והנפקה — דרך מוצהרת (סבב 91) — ⚠️ דרך אחת בלבד באפליקציה,
   *  ⭐ והיא זו שמוצהרת ב-`APP.exportWay`. */
  { row: 92, name: 'ייצוא והנפקה — דרך מוצהרת',
    probe: () => exportWayGaps().length === 0 },
  /*  ⛔ המסמך מתפרסר נקי (סבב 91) — ⚠️ הטענה היא **היעדר תיקון**: ⭐ תג
   *  עודף · תג שלא נסגר · BOM · ותוכן אחרי `</body>` — ⛔ כולם עוברים
   *  בשקט מפני שהפרסר משלים אותם. */
  { row: 80, name: 'המסמך מתפרסר נקי',
    probe: () => docParseGaps().length === 0 },
  /*  ⛔ לוג מסלול — תג ורמה (סבב 91) — ⚠️ שתי טענות: ⭐ אין `console.log`
   *  שהארגומנט הראשון שלו אינו פותח בתג, ⛔ ורישום ה-`sw` הוא שתי השורות
   *  הקנוניות בדיוק — ⚠️ אחת לכל רמה. */
  { row: 81, name: 'לוג מסלול — תג ורמה',
    probe: () => untaggedLogs(src).length === 0 && debugLogs(src).length === 0 &&
                 src.split(SW_LOG_OK).length === 2 && src.split(SW_LOG_BAD).length === 2 },
  /*  ⛔ מיכל המודאל ילד ישיר של `body` (סבב 91) — ⚠️ הטענה אינה «`#modal`
   *  קיים» אלא **היכן הוא יושב**: ⭐ מיכל שיושב בתוך מסך נמחק יחד איתו,
   *  ⛔ ו-`openModal` יצאה בשקט. ⛔ **ושתי המדידות נדרשות יחד** — ⚠️ עומק 1
   *  **בעץ** ⛔ ומקום במקור שלפני `</body>`: ⭐ הדפדפן מחזיר פנימה אלמנט
   *  שאחרי הסוגר, ⛔ ולכן עומק 1 לבדו אינו מעיד שהמקור תקין. */
  { row: 69, name: 'מיכל המודאל ילד ישיר של `body`',
    probe: () => { const p = modalPlacement(src);
                   return p.found && p.parent === 'body' && !p.afterBodyClose; } },
  /*  ⛔ פונקציה משותפת אינה יוצאת בשקט (סבב 88) — ⚠️ הטענה היא **היעדר**
   *  שער DOM שנוטש בלי לדווח, ⭐ ורשימת ההיתר נמדדת משני צדדיה. */
  { row: 88, name: 'פונקציה משותפת אינה יוצאת בשקט',
    probe: () => silentDomSites().length === 0 },
  /*  ⛔ הגיבוי שלם ומעומד (סבב 87ג) — ⚠️ הטענה אינה «יש עימוד» אלא
   *  **שאין קריאת גיבוי בלי עימוד**: ⭐ הקריאה עוברת ב-`_ysRowsPaged`,
   *  ⛔ ומאומתת מול מונה השרת לפני שנשמר משהו. ⚠️ ושלוש השכבות מוצהרות —
   *  ⭐ עוגן, דיפ, והפינוי שגורע את שניהם. */
  { row: 129, name: 'הגיבוי שלם ומעומד',
    probe: () => {
      const b = fnBody('_bkReadRows');
      if (!b) return false;
      if (!/_ysRowsPaged\(/.test(b)) return false;
      /*  ⛔ מחרוזות מולבנות ב-`code` — ⚠️ ולכן אפשרות הספירה נמדדת ב-`src`,
       *  ⭐ וההשוואה עצמה ב-`code`: ⛔ שתיהן חייבות להימצא. */
      if (!/count:\s*'exact',\s*head:\s*true/.test(src)) return false;
      if (!/cr\.count !== rows\.length/.test(b)) return false;
      const d = fnBody('bkMaybeDaily') || '';
      if (/await q;/.test(d)) return false;
      const l = fnBody('_bkLayer') || '';
      return /BK_ANCHOR_PREFIX/.test(l) && /BK_DIFF_PREFIX/.test(l)
          && /BK_ANCHOR_MS/.test(l)
          && /BK_ANCHOR_PREFIX \+ bkey/.test(d) && /BK_DIFF_PREFIX \+ bkey/.test(d);
    } },
  /*  ⛔ החלפת הקשר (סבב 87ג) — ⚠️ ה-probe יושב ב-`APP.tableProbe` מפני
   *  ששמות משתני המצב נבדלים בין הארבע ⛔ והמנגנון אחד: ⭐ ביומן זהו
   *  מוסד, ⚠️ ובשלוש האחרות משתמש — ⛔ ושם הנתונים אינם פר-משתמש. */
  { row: 126, name: 'החלפת הקשר מאפסת את כל המצב', app: true },
  /*  ⛔ הקשר נלכד בכניסה לפונקציה (סבב 90) — ⚠️ הצד השני של «החלפת הקשר»:
   *  ⭐ שם נמדד שהמצב מאופס, ⛔ וכאן שכל פונקציה אסינכרונית לוכדת את ההקשר
   *  בכניסה ⛔ ואינה קוראת גלובלי פר-הקשר אחרי `await`. ⚠️ ה-probe יושב
   *  ב-`APP.tableProbe` מפני ששמות משתני ההקשר נבדלים בין הארבע ⛔ והמנגנון
   *  אחד. */
  { row: 127, name: 'הקשר נלכד בכניסה לפונקציה', app: true },
  /*  ⛔ המשיכה המסוננת (סבב 87) — ⚠️ ה-probe יושב ב-`APP.tableProbe`
   *  מפני שאתרי הקריאה נבדלים בין הארבע ⛔ והמנגנון אחד: ⭐ בהנהלה זהו
   *  מסך ההשגחה, ⚠️ ביומן דגל ה-`archived`, ⛔ ובשתיים האחרות אין מסלול
   *  תצוגה שמושך כלל. */
  /*  ⛔ פעולה מגיבה מיד (סבב 89) — ⚠️ נמדד: עשרה מטפלים בהנהלה המתינו
   *  לענן בשקט, ⭐ ולחיצה שנייה בתוך החלון יצרה רשומה שנייה. */
  { row: 65, name: 'פעולה מגיבה מיד',
    probe: () => actNoFeedback().length === 0 },
  { row: 66, name: 'משיכה מסוננת בשרת', app: true },
  /*  ⛔ דגימת-היתר של המחולל (סבב 73ב) — ⚠️ הקבוע יושב בקוד ⛔ ולא בטבלה,
   *  ⭐ והערך הקנוני מוצהר כאן: ⚠️ ערך אחר באחת מהן מזיז את קצה הצורה,
   *  ⛔ ואותו סמל בדיוק נמדד בצלע אחרת — בשקט, בלי שער שנופל. */
  { row: 103, name: 'דגימת-יתר במחולל',
    probe: () => Number((/^const SS = (\d+);/m.exec(genSrc()) || [])[1]) === GEN_SS },
  { row: 145, name: '`PBKDF2` — פרמטרים', app: true },
  { row: 120, name: '`migrations/` — תוכן',
    probe: () => migContentGaps().length === 0 },
  { row: 121, name: '`migrations/` — כמות',
    probe: () => migLineGaps().length === 0 },
  { row: 134, name: 'דפוס עמודות אחיד',
    probe: () => colPatternGaps().length === 0 },
  /*  ⛔ שם טבלת הגיבוי נקרא מהקבוע ⛔ ולא מנוכחות המחרוזת — ⚠️ המחרוזת
   *  מופיעה גם בהערות שמסבירות למה לא לגבות אותה, ⭐ והערך הוא מה שקובע
   *  לאן הגיבוי היומי נכתב בפועל. */
  { row: 130, name: '`kv_backup` — טבלת הגיבוי',
    probe: () => (/BK_TABLE\s*=\s*'([a-z_]+)'/.exec(srcRefs) || [])[1] === 'kv_backup' },
  /*  ⛔ שתי טבלאות ההגדרות של היומן — ⚠️ ההפרדה בין המוסדות היא **טבלה
   *  למוסד**, ⛔ ולא עמודה: ⭐ ולכן שני השמות נמדדים יחד, ⚠️ ואחד בלי השני
   *  הוא מוסד שהגדרותיו נכתבות לבית של המוסד השני. */
  { row: 131, name: '`kv_rishon` / `kv_ramataviv` — הגדרות היומן', app: true },
  { row: 21, name: 'שער אינו מקליד מספר שורה',
    probe: () => typedRowSites().length === 0 },
  { row: 156, name: 'פונקציה בלי קוראים',
    probe: () => orphanGaps().length === 0 },
  /*  ⛔ ערך ולא נוכחות שם (סבב 76) — ⚠️ הטענה אינה «`waitFor` קיים» אלא
   *  **שאין המתנה על שעון** בשום שער: ⭐ שינה קבועה נגמרת על מכונה עמוסה
   *  לפני שהשרשרת הא-סינכרונית סיימה, ⛔ והטענה נופלת בזמן שהקוד תקין. */
  { row: 25, name: 'שער ממתין לתנאי ולא לשעון',
    probe: () => clockWaitSites().length === 0 },
  /*  ⛔ ערך ולא קיום שם (סבב 76) — ⚠️ שלושה תנאים יחד: ⭐ נקודת המעבר
   *  מוגדרת · ⛔ יש לה קורא חי מקוד האפליקציה — פונקציה שאיש אינו קורא
   *  לה היא קוד מת שהשער מאשר · ⛔ **והשדה שסומן כסוד אינו שורד אותה**,
   *  ⚠️ והוא קיים בקוד במקום אחר — ⭐ שדה שאינו קיים כלל היה הופך את
   *  הטענה לבלתי-אפשרית להפרה, ⛔ כלומר לטענה שאינה נמדדת. */
  { row: 149, name: 'סודות אינם עוזבים את המכשיר',
    probe: () => {
      const fn = APP.secretStripFn, f = APP.secretField;
      if (!fn || !f) return false;
      const body = fnBody(fn);
      if (!body) return false;
      const re = new RegExp('\\b' + f + '\\b');
      return callSites(fn).length > 0 && !re.test(body) && re.test(src);
    } },
  { row: 124, name: 'דפוס `upsert` — onConflict מוכרז', app: true },
  /*  ⛔ שני ענפים ולא ענף אחד (סבב 76) — ⚠️ «טביעה חסרה מושלמת אוטומטית»
   *  נמדדת במסלול ההשלמה במקום שיש בו כזה, ⭐ ובמקום שאין בו — בכך
   *  **שאין מסלול שיוצר משתמש בלי טביעה**: ⛔ מסלול השלמה באפליקציה
   *  שכל משתמשיה נוצרים במסך שגוזר טביעה הוא קוד מת, ⚠️ ובאחת מהן הוא
   *  אף הוסר בהחלטת מנהל מפני שהיה הקורא האחרון של הסיסמה הגלויה. */
  { row: 147, name: 'טביעה חסרה מושלמת אוטומטית',
    probe: () => APP.passFpFillFn
      ? (!!fnBody(APP.passFpFillFn) && callSites(APP.passFpFillFn).length > 0)
      : (!!APP.userCreateFn && !!APP.passFpMakeFn &&
         new RegExp('\\b' + APP.passFpMakeFn + '\\s*\\(').test(fnBody(APP.userCreateFn))) },
  { row: 147, name: 'כניסה אופליין',
    probe: () => !!(APP.offlineLoginFn && fnRange(APP.offlineLoginFn)) },
  { row: 114, name: 'עריכת נתונים אופליין',
    probe: () => hasCode(/\bpendMark\s*\(/) },
  /*  ⛔ «דלגציה» נמדדת כיחס ⛔ ולא כאפס `onclick` (סבב 71) — ⚠️ דרישת
   *  אפס הייתה מסמנת ❌ גם לאפליקציה שכל מסכיה עוברים במאזין אחד ונשארו
   *  בה שבעה אתרים היסטוריים. ⭐ מה שהשורה אומרת הוא **מי הדפוס**:
   *  רוב אתרי הלחיצה עוברים ב-`data-act` — ⛔ ולא שאין חריג. */
  /*  ⛔ מחיקה רכה נמדדת בשני המסלולים (סבב 71) — ⚠️ קריאת `.delete()`
   *  מקוד הלקוח, ⛔ **וגם** `DELETE FROM` בקובצי המיגרציה. ⭐ שער שמדד
   *  רק את הראשון היה מאשר מיגרציה שמוחקת נתונים פיזית, ⛔ וזה בדיוק
   *  המסלול שאין ממנו חזרה. */
  { row: 133, name: 'מחיקה רכה בלבד — אין `DELETE` פיזי',
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
  { row: 148, name: 'סיסמאות בענן — אין מסלול שכותב או קורא טקסט גלוי',
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
  { row: 63, name: 'אובייקט יקר נבנה פעם אחת',
    probe: () => intlBuildGaps().length === 0 },
  /*  ⛔ מסך מציג מיד ומרענן ברקע (סבב 85) — ⚠️ מה שנמדד הוא **מיקום**:
   *  ⭐ `await` שקודם ל-`innerHTML` הראשון, ⛔ ולא הכוונה. ⚠️ והמקבול
   *  והסימון הגלוי הם החלק שאינו נמדד כאן — ⛔ הם נסרקים בכל סבב שנוגע. */
  { row: 64, name: 'מסך מציג מיד ומרענן ברקע',
    probe: () => renderWaitSites().length === 0 },
  /*  ⛔ ההתקנה עצמה (סבב 86) — ⚠️ ה-probe מודד את חמשת התנאים, ⛔ ולא את
   *  קיום הקובץ: ⭐ מניפסט תקין שאיש אינו מקשר אליו אינו מתקין דבר. */
  { row: 107, name: 'האפליקציה ניתנת להתקנה מכרום',
    probe: () => installGaps().length === 0 },
  { row: 151, name: 'דגלי מעבר — אין דגל דלוק',
    probe: () => legacyFlagsOn().length === 0 },
  { row: 70, name: 'טיפול באירועים — דלגציה ממאזין אחד',
    probe: () => {
      const inline = (src.match(/onclick=/g) || []).length;
      const deleg  = (src.match(/data-act=/g) || []).length;
      return CLICK_LISTENER.test(src) && deleg > inline;
    } },
  { row: 144, name: 'נתיב עדכון חלקי למראת המשתמשים', app: true },
  /*  ⛔ הערך ולא הצורה (סבב 75) — ⚠️ `LS_SWEEP_PCT` חי ב-`index.html`
   *  ⛔ ואף שער לא הזכיר אותו: ⭐ סף הפינוי הוא מספר שהטבלה מצהירה,
   *  ⚠️ והוא נקרא כמספר ⛔ ולא כמחרוזת — 0.6 ו-0.60 הם אותו סף. */
  /*  ⛔ **שני השלבים נמדדים, ⛔ ולא שלב ב לבדו** (סבב 96) — ⚠️ התקן אומר
   *  «`tier1`/`tier2`», ⭐ ואפליקציה שמפנה בשלב א בלבד מפנה: ⛔ probe
   *  שדרש `tier2` הכריז «אין פינוי» על מדיניות חיה. ⚠️ ומערך ריק אינו
   *  מדיניות — ⛔ `tier1: []` נמדד כריק, ⭐ ו-getter נמדד לפי מה שהוא
   *  שואל: ⛔ getter שאינו נשען על עֵד הדחיפה אינו פינוי מול ראיה. */
  /*  ⛔ ארבעת מימדי הסריקה (סבב 96) — ⚠️ ה-probe מאמת **ערך**: ⭐ ארבע
   *  רשומות במרשם, ⛔ וכל אחת נושאת את שם המימד ואת מה שנבדק בו;
   *  ⚠️ ושהמרשם **מצויר** — ⛔ מרשם שאיש אינו קורא הוא קוד מת שהשער
   *  מאשר. ⭐ ובשלוש האחרות אין מסך תשתית, ⛔ והשורה ⭕ מנומקת. */
  { row: 38, name: 'ארבעת מימדי הסריקה',
    probe: () => {
      const m = /YS_INF_DIMS\s*=\s*\[([\s\S]*?)\n\];/.exec(code);
      if (!m) return false;
      const rows = m[1].split('\n').filter((l) => /\[\s*$|\['|\[\s*'/.test(l) || /^\s*\[/.test(l));
      return rows.length === 4 && /YS_INF_DIMS\.forEach/.test(code);
    } },
  { row: 72, name: 'פינוי אוטומטי',
    probe: () => { const t = tierShape();
                   return t.ok && t.items > 0 &&
                          Number((/LS_SWEEP_PCT\s*=\s*([\d.]+)/.exec(src) || [])[1]) === LS_SWEEP_PCT; } },
  /*  ⛔ **העֵד ולא ה-`verify`** (סבב 96) — ⚠️ התקן אומר «העֵד הוא ראיה
   *  מהענן עצמו, פר-מפתח»: ⭐ `verify:` הוא **מסלול הגיבוי** של העֵד
   *  ולא העֵד, ⛔ ו-probe שחיפש אותו החמיץ מדיניות שהעֵד שלה תקין.
   *  ⚠️ ונמדדים שני צדדיו — ⛔ שהמדיניות שואלת עֵד פר-מפתח, ⛔ **ושיש לו
   *  אתר האכלה חי**: ⭐ עֵד שאיש אינו מסמן נשאר 0 לנצח. */
  { row: 137, name: 'אימות פינוי מול הענן',
    probe: () => perKeyWitness() && witnessFed() },
  { row: 108, name: 'שיתוף קבצים',
    probe: () => hasCode(/_androidShareImage|navigator\s*\.\s*share\b/) },
  { row: 93, name: 'מעטפת APK (WebView)',
    probe: () => shellIsWebView() },
  /*  ⭐ אין נכסים מוטבעים (סבב 72) — ⛔ ה-probe מאמת **ערך**: שאין
   *  `index.html` ואין `sw.js` תחת `assets/`. ⚠️ עותק מוטבע יושב
   *  ב-origin אחסון אחר (`file://`), ⛔ ורישום שנכתב אליו אינו נראה
   *  לאפליקציה האמיתית לעולם ואינו מסתנכרן; ⛔ והוא מקור אמת שני
   *  שמתיישן בכל שחרור. */
  { row: 96, name: 'אין נכסים מוטבעים',
    probe: () => !hasPath('android/app/src/main/assets/index.html') &&
                 !hasPath('android/app/src/main/assets/sw.js') },
  { row: 112, name: 'מפתח חתימה קבוע בריפו',
    probe: () => keystoreFixed() },
  { row: 117, name: 'מקור אמת יחיד לסכימה', probe: () => schemaSingleSource() },
  { row: 118, name: 'קובץ התקנה מלא',       probe: () => schemaIdempotent() },
  { row: 51, name: 'גיבוי יומי אוטומטי',   probe: () => present.backup === true },
  { row: 51, name: 'יומן פעולות',          probe: () => present.log === true },
  { row: 115, name: 'נתונים בטבלאות מובנות', app: true },
  /*  ⭐ סבב 70 — ⛔ ה-probe מאמת את **הסט** ולא קיום קובץ אחד: בודק שנשאר
   *  אחרי שתפקידו נגמר הוא שער שרץ בלי שיש לו מה לאכוף, ⚠️ ו-probe שהסתפק
   *  בקיום `check-js` היה מדווח ✅ על כל סט שהוא. */
  { row: 14, name: 'בודקים — קיום', probe: () => checkerSet() },
  { row: 15, name: 'בודקים — משימה מוצהרת', probe: () => checkerMissions() },
  { row: 73, name: 'דפוס הודעת שגיאה יחיד', probe: () => errPatternSites() === 0 },
  /*  ⛔ `toast` — חתימה, גוף ומחלקות (סבב 90) — ⚠️ הטענה אינה «יש `toast`»
   *  אלא **שהחתימה, הגוף והמחלקות זהים בארבעתן**: ⭐ הארגומנט השני היה משך
   *  בשלוש ושם מחלקה בגיוס, ⛔ ואותה שורה משותפת ייצרה `class="toast 6000"`
   *  במקום שש שניות. ⛔ ו-`div` **לכל הודעה** ⛔ ולא אלמנט קבוע אחד —
   *  ⚠️ הודעה שנייה דרסה את הראשונה, ⭐ ומי שקרא את המסך לא ידע שהייתה שנייה. */
  { row: 74, name: '`toast` — חתימה, גוף ומחלקות',
    /*  ⛔ הגוף נמדד ב-`src` ⛔ ולא ב-`code` — ⚠️ המחרוזות מולבנות שם,
     *  ⭐ ו-`createElement('div')` הוא בדיוק מה שנמדד כאן. */
    probe: () => {
      const r = fnRange('toast');
      if (!r) return false;
      const b = src.slice(r[0], r[1]);
      return /^function toast\(msg, dur, kind\)/.test(b)
          && /getElementById\('toasts'\)/.test(b)
          && /createElement\('div'\)/.test(b)
          && /\.className = 'toast' \+ \(kind \? ' ' \+ kind : ''\)/.test(b)
          && /\.appendChild\(el\)/.test(b)
          && /id="toasts"/.test(src)
          && /\.toast\{/.test(src) && /\.toast\.bad\{/.test(src) && /\.toast\.good\{/.test(src)
          && /#toasts\{[^}]*bottom:calc\(var\(--toast-bottom\)/.test(src)
          && (src.match(/--toast-bottom\s*:\s*\d+px/g) || []).length >= 1;
    } },
  { row: 142, name: 'רישום כשלי כתיבה', probe: () => silentWriteCatches().length === 0 },
  { row: 52, name: 'חלון חם במכשיר',
    probe: () => /\benabled\s*:\s*true\b/.test(cfgBlock('HW_CFG')) },
  { row: 52, name: 'שחזור מקומי מהענן',
    probe: () => callSites('hwRestoreMount').length > 0 },
  { row: 143, name: 'מסך שינוי סיסמה עצמי', app: true },
  { row: 164, name: 'מטמון-CDN מראש עם ריפוי עצמי',
    probe: () => fileHas('sw.js', /CDN_ASSETS/) && fileHas('sw.js', /ensureCdnCached/) },
  { row: 51, name: 'גיבוי יומי מטבלאות מובנות',
    exempt: 'התא מצהיר שהגיבוי **קורא** מטבלאות מובנות, וזו עובדת מסד ולא ' +
            'עובדת ריפו. ⛔ והנוסח הקודם כאן היה שגוי (סבב 62): הוא אמר ' +
            'ש«גיבוי ממקור שאינו קיים מדלג בשקט», ובפועל הוא מחזיר error, ' +
            'מונע את כתיבת הדגל היומי ומשתק את הגריעה — נמדד בהנהלה, 66 ' +
            'גיבויים ביום. הצד שכן נבדק — הצהרת המקורות מול APP.tables — ' +
            'נאכף ב-test_sources.mjs, ורשימת-ההיתר ב-test_cron.mjs.' },
  { row: 128, name: 'פינוי גיבויים אוטומטי במסד',
    exempt: 'התא מצהיר שמשימת `pg_cron` **רשומה ופעילה במסד**, ואין דרך ' +
            'לראות זאת מהריפו. הצד שכן נבדק — `_bkRetention` וקובץ המיגרציה — ' +
            'נאכף ב-test_cron.mjs, שנועל גם את התזמון.' },
  /*  ⭐ סבב 38 — ה-probe הפך גנרי. עד אז הוא היה `app: true`, מפני שכל
   *  אפליקציה מימשה את כלל ה-⏳ בפונקציה משלה; מרגע שהכלל יושב ב-`_mergePick`
   *  המשותפת, אותה בדיקה בדיוק תקפה בארבעתן — וזו בעצמה עדות שהאיחוד
   *  אמיתי ולא שמו של קובץ. */
  { row: 53, name: 'מנוע מיזוג עם הגנת ⏳',
    probe: () => /isPend \|\| tsOf\(loc\) > tsOf\(rem\)/.test(fnBody('_mergePick')) },
  { row: 147, name: 'חסימת משתמש מושבת בכניסה אופליין',
    probe: () => !!APP.offlineLoginFn &&
                 /\bactive\s*!==\s*true\b/.test(fnBody(APP.offlineLoginFn)) },
  /*  ⚠️ ה-probe בודק **קריאה מקוד האפליקציה** ולא את עצם קיום המודול:
   *  `callSites` מדלגת על מה שבתוך הבלוקים המשותפים, ולכן מודול שיושב
   *  בקובץ ואיש אינו קורא לו נספר כ-❌ — וזה בדיוק המצב ביומן, שמזהי
   *  הרשומות שלו עדיין חותמות זמן. הנימוק יושב בשורת מודול מזהי הרשומות. */
  { row: 54, name: 'מודול מזהי רשומות',
    probe: () => callSites('newClientId').length > 0 },
  /*  ⛔ מזהה מכשיר אינו מזהה רשומה (סבב 37א), ולכן זו שורה נפרדת ולא
   *  הרחבה של 37 — המושג אחר (זהות של מכשיר, לא של נתון), הפורמט אחר
   *  (שמונה תווים ולא uuid), והצרכן אחר (יומן הפעולות והגיבוי).
   *  ⚠️ ה-probe דורש את **שתי** הפונקציות: `getDeviceId` בלי `_randDeviceId`
   *  היא מעטפת בלי מחולל, וזה בדיוק המצב ההפוך שנמדד ב-gius — שם
   *  `BK_CFG.device` קראה לפונקציה שאינה מוגדרת, וה-`try/catch` שסביבה
   *  החזיר `null` בשקט. */
  { row: 55, name: 'מזהה מכשיר',
    probe: () => hasCode(/function\s+getDeviceId\s*\(/) &&
                 hasCode(/function\s+_randDeviceId\s*\(/) },
  /*  ⚠️ ה-probe בודק **שהמעטפת קוראת לליבה** ולא רק שהליבה קיימת — בלוק
   *  שיושב בקובץ ואיש אינו קורא לו הוא בדיוק המצב שהשער הזה בא לסלק.
   *  זהות הליבה בית-לבית נאכפת בנפרד, בחתימת `mergecore` שלמעלה. */
  { row: 53, name: 'ליבת מיזוג משותפת',
    probe: () => callSites('mergeCore').length > 0 },
  /*  ⭐ סבב 40 — מעטפת ה-WebView חתומה. ה-probe דורש את **שני** השערים:
   *  קובץ הבדיקה שקיים, ו-`shellSha` שמוצהר בתוכו. ⛔ שער שקיים בלי
   *  חתימה מוצהרת הוא שער שאינו נועל דבר — בדיוק המצב שהיה עד הסבב הזה,
   *  שבו ל-`MainActivity.java` לא נגעה שום בדיקה.                     */
  { row: 93, name: 'מעטפת WebView חתומה',
    probe: () => hasPath('tools/test_shell.mjs') &&
                 fileHas('tools/test_shell.mjs', /shellSha:\s*'[0-9a-f]{16}'/) },
  /*  ⭐ סבב 40 — אימות מול טביעה בענן. ה-probe **קורא את הצהרת השער**
   *  (`verifyFn`) ואז מוודא שהפונקציה הזו באמת נקראת ב-`index.html` —
   *  כלומר הוא נשען על הקוד ולא על קיום הקובץ בלבד. ⛔ הצהרה בלי קריאה
   *  היא בדיוק המצב שהמטריצה אמורה לתפוס.                            */
  { row: 147, name: 'אימות מול טביעה בענן',
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
  { row: 110, name: 'בניית APK אחידה עם שער חתימה',
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
  { row: 164, name: 'מודול ה-service worker',
    probe: () => present.swcore === true && fileHas('sw.js', /var\s+SW_CFG\s*=/) },
  /*  ⭐ סבב 44 — ניסיון חוזר בתור הסנכרון. ה-probe דורש את **שני**
   *  התנאים: הליבה שנמצאה וחתימתה תואמת (`present.retry`), ו-`RTY_CFG`
   *  שמוגדר מעליה. ⛔ ליבה בלי פרמטרים אינה מודול אלא קוד שהועתק —
   *  אותו כלל בדיוק כמו בשורת מנגנון המשיכה.                                   */
  { row: 56, name: 'ניסיון חוזר בתור הסנכרון',
    probe: () => present.retry === true && hasCode(/var\s+RTY_CFG\s*=/) },
  /*  ⭐ סבב 51 — מנגנון משיכה אחיד. ה-probe דורש את **שני** התנאים:
   *  הליבה שנמצאה וחתימתה תואמת (`present.pull`), ו-`PL_CFG` שמוגדר
   *  מעליה. ⛔ ליבה בלי פרמטרים אינה מודול אלא קוד שהועתק — אותו כלל
   *  בדיוק כמו בשורות 111 ו-42.                                       */
  { row: 57, name: 'מנגנון משיכה אחיד',
    probe: () => present.pull === true && hasCode(/var\s+PL_CFG\s*=/) },

/*  ⭐ סבב 52 — נעילת חוסר-פעילות. ה-probe דורש את **שני** התנאים:
   *  הליבה שנמצאה וחתימתה תואמת (`present.lock`), ו-`LK_CFG` שמוגדר
   *  מעליה. ⛔ ליבה בלי פרמטרים אינה מודול אלא קוד שהועתק — אותו כלל
   *  בדיוק כמו בשורות 111, 42 ו-43.                                   */
  { row: 58, name: 'נעילת חוסר-פעילות',
    probe: () => present.lock === true && hasCode(/var\s+LK_CFG\s*=/) },
  /*  ⭐ סבב 53 — מודל הסשן, ⚠️ **וזו השורה של סבב 52 בכיוון ההפוך**. שם
   *  היא נקראה «סשן נשמר במכשיר» ומדדה את ההבדל שהמנהל חש בו; כאן היא
   *  מודדת את ההכרעה שלו: ⛔ המשתמש המחובר חי בזיכרון בלבד ואינו יורד
   *  לדיסק באף אחת מהשלוש.
   *  ⚠️ ה-probe דורש את **שלושת** התנאים — הליבה שנמצאה וחתימתה תואמת,
   *  `SESS_CFG` שמוגדר מעליה (ליבה בלי פרמטרים אינה מודול), ⛔ ושאין
   *  בקוד שום קבוע ששמו `SESSION_KEY`. ⛔ השלישי הוא העיקר: מודול
   *  שקיים לצד מסלול שמירה ישן שנשאר הוא בדיוק הכשל שהסבב הזה סגר.  */
  { row: 59, name: 'מודל הסשן — בזיכרון בלבד',
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
  { row: 163, name: 'בדיקת עדכון תקופתית ל-service worker',
    probe: () => hasCode(/\breg\s*\.\s*update\s*\(/) &&
                 hasCode(/setInterval\(\s*\w+\s*,\s*30\s*\*\s*60\s*\*\s*1000\s*\)/) &&
                 hasSrc(/'42P01'/) && hasSrc(/'42703'/) && hasCode(/s === 404/) &&
                 hasCode(/!_staleSchema\s*&&\s*_rtyPending\(\)/) &&
                 hasCode(/window\.showAppUpdateBanner/) &&
                 hasCode(/sbWatch\(/) },
  /*  ⭐ סבב 53 — שלוש שורות תשתית שהיו קיימות בארבעתן **ולא נמדדו כאן
   *  מעולם** (38–40). ⚠️ כל אחת מהן נאכפת על **הערך** ולא על עצם
   *  הקיום: קבוע שקיים בערך אחר בכל אפליקציה הוא בדיוק «אחיד ולא
   *  זהה» שאסור, והוא נראה תקין בסריקת-קיום.            */
  { row: 50, name: 'רענון תקופתי של מונה הממתינים',
    probe: () => hasCode(/setInterval\(\s*pendRender\s*,\s*60000\s*\)/) },
  { row: 76, name: 'פסק זמן אחיד לקריאות רשת',
    probe: () => hasCode(/var\s+NET_TIMEOUT_MS\s*=\s*8000\s*;/) },
  /*  ⚠️ **ה-probe הזה קורא את המקור הגולמי ולא את הקוד המטוקן** — שם
   *  האירוע הוא **מחרוזת**, והטוקניזציה מרוקנת מחרוזות; probe על
   *  `code` לא היה יכול להבחין בין `'online'` ל-`'offline'`. ⛔ אין
   *  להשתמש ב-`hasSrc` לשם פונקציה או לקבוע (סבב 53) — שם שמופיע
   *  בהערה בלבד היה נספר כמימוש, וזה בדיוק מה ש-`code` בא למנוע.   */
  { row: 77, name: 'מאזיני מצב רשת',
    probe: () => hasSrc(/window\.addEventListener\('online'/) &&
                 hasSrc(/window\.addEventListener\('offline'/) },
  /*  ⛔⛔ המנגנון עבר לבלוק חתום וחווט בארבעתן (סבב 93) — ⚠️ עד כאן הוא חי
   *  **ביומן בלבד**, ⛔ והשורה עצמה הצהירה «אין גריעה לפי גיל בשלוש,
   *  והמחוקים נצברים»: ⭐ זה היה חוב מוצהר ⛔ ולא הבדל מכוון.
   *  ⚠️ **ומחוק שאין לו גריעה נצבר בלי גבול** — ⛔ הוא נמשך בכל משיכה
   *  ונשמר בכל מכשיר: ⭐ ההחלה מונעת את ההצטברות, ⛔ ואינה נוגעת
   *  ברשומה שטרם חצתה את הסף.                                       */
  /*  ⛔ ערך ולא שם (סבב 75) — ⚠️ עד כאן ה-probe הסתפק ב«השם קיים»,
   *  ⛔ ושינוי הגיל מ-90 יום ל-9 היה עובר בשקט: ⭐ הוא מכפיל את המספרים
   *  שבביטוי ומשווה למילישניות של 90 יום, ⛔ ולכן הוא עיוור לריווח
   *  ולצורת הכתיבה ⚠️ ורגיש לערך בלבד. */
  /*  ⛔ **הערך ⛔ והחיווט** (סבב 93) — ⚠️ קבוע שיושב בקוד ואיש אינו קורא לו
   *  הוא קוד מת שהשער מאשר: ⭐ נמדדים גם נקודת ההפעלה (`tombBoot`) וגם
   *  אתר הגריעה על תוצאת המיזוג (`tombPruneMerged`), ⛔ ושניהם **נקראים**
   *  ולא רק מוגדרים. */
  { row: 132, name: 'גריעת tombstones לפי גיל',
    probe: () => {
      const m = /TOMBSTONE_TTL_MS\s*=\s*([^;\n]+)/.exec(code);
      if (!m) return false;
      const ns = m[1].match(/\d+/g);
      if (!ns || ns.reduce((a, b) => a * Number(b), 1) !== TOMB_TTL_MS) return false;
      const calls = (re) => (code.match(re) || []).length;
      return calls(/\btombBoot\s*\(/g) >= 2 && calls(/\btombPruneMerged\s*\(/g) >= 2;
    } },
  /*  ⛔ מקור הבדיקה נבדל ⛔ והמנגנון אחד (סבב 85) — ⚠️ ביומן משיכת `raw`
   *  שמשווה את `<meta app-version>`, ובשלוש `reg.update()` שמרענן את
   *  רישום ה-`sw`: ⭐ ושתיהן נגמרות באותו באנר. ⛔ ומה שנמדד הוא
   *  **המחזוריות** — ⚠️ בדיקה חד-פעמית בטעינה אינה מגיעה ללשונית
   *  שנשארה פתוחה, ⛔ וזה בדיוק המכשיר המותקן. */
  /*  ⛔ מנגנון זיהוי אחד (סבב 90ג) — ⚠️ הענף השני נמדד ואינו קיים באף אחת
   *  מהארבע: ⭐ ביומן ירדה משיכת `raw.githubusercontent` השעתית, ⛔ ורשימת
   *  היתר שאין לה מקרה בפועל היא בעצמה השארית שהשורה באה לסלק. */
  { row: 162, name: 'עדכון אוטומטי — בדיקה מחזורית',
    probe: () => /setInterval\s*\(\s*checkForUpdates?\s*,/.test(code) &&
                 /reg\.update\s*\(/.test(code) && !hasCode(/\bRAW_URL\b/) },
  /*  ⭐ סבב 56 — מקור הקריאה. ⚠️ **שורה תיאורית ולא ✅/❌**: היא מודדת
   *  מאיפה נקראים הנתונים, ולא אם יכולת קיימת. `APP.kvFallbackFn` מצהיר
   *  את שם משפך ה-`kv`, ⛔ וה-probe דורש שהוא יימצא בפועל בקוד — הצהרה
   *  שאינה נמדדת היא בדיוק מה שאסור. ⛔ ובאפליקציה שהצהירה
   *  «אין» הוא נכשל גם על קריאת `kv` שאיש לא הצהיר עליה.            */
  { row: 108, name: 'גשר שיתוף',
    probe: () => javaSrc().indexOf('Intent.createChooser') >= 0 },
  /*  ⭐ סבב 64 — העברת מזהה ל-DOM. ⛔ ה-probe אינו בודק ש-`idArg` **קיים**
   *  אלא שכל אתר העברה **עטוף בו**: הבאג של סבב 64 היה בדיוק קיום בלי
   *  עטיפה — הפונקציה הייתה שם, והאתר שמחפש את האלמנט לא קרא לה.
   *  ⚠️ אפליקציה בלי אתרי העברה כלל מוצהרת «לא רלוונטי» ב-`naRows`. */
  /*  ⛔ מסבב 67 — לא די בכך שהמזהה **עטוף**: הוא חייב
   *  לעבור ב-`data-id` ובדלגציה. ⚠️ הצירוף הוא מה שהופך את התא למדיד —
   *  `wrapped>0 && bare===0` לבדו עבר גם על אפליקציה שכל אתריה
   *  מוטבעים ב-`onclick`, כלומר בדיוק על מה שהכלל בא לסלק. */
  /*  ⛔ ומסבב 68 נוספה טענה רביעית — **אתר שהומר אף שהוא נושא
   *  `stopPropagation`**. ⚠️ דלגציה ב-`document` רצה אחרי
   *  בועת האלמנט, ולכן ההמרה מבטלת את ההגנה **בשקט**: הכפתור ממשיך
   *  לעבוד, והשורה העוטפת נפתחת יחד איתו. ⛔ אתר כזה הוא חריגה מנומקת
   *  קבועה ואינו מומר. */
  /*  ⛔ ומסבב 82 נוספה טענה חמישית — **ההשוואה עצמה** — ⚠️ `data-id`
   *  ודלגציה לבדם השאירו את הצד הקולט בלי כלל: ⭐ המזהה חוזר מהמאפיין
   *  כמחרוזת, ⛔ ו-`===` מול הערך שבזיכרון אינו מתאים. ⚠️ הנימוק נמדד:
   *  20 אתרים בארבעתם, ⛔ ושניים מהם נכתבו **בסבב שלפני** — הדפוס חוזר. */
  { row: 61, name: 'העברת מזהה ל-DOM',
    probe: () => idSites().bare === 0 &&
                 /data-act="/.test(src) &&
                 /getAttribute\('data-id'\)|dataset\.id\b/.test(src) &&
                 /addEventListener\('click'/.test(src) &&
                 idCmpSites().length === 0 &&
                 delegatedStopSites() === 0 },
  /*  ⭐ סבב 66 — שכבת האייקונים. ⛔ ה-probe אינו בודק שעשרת הקבצים
   *  **קיימים** אלא שהם עומדים בארבעת הממדים שהטבלה קובעת: כמות,
   *  ממדים, תוכן בפיקסלים, והתאמת הרקע לשוליים. ⚠️ probe של קיום היה
   *  נותן ✅ גם לאייקון שתופס במסגרת שטח אחר מזה של האחיות. */
  /*  ⛔ ה-probe מודד **מספר אתרים** ⛔ ולא קיום שם — ⚠️ פונקציה מרכזית
   *  שקיימת ואינה נקראת היא בדיוק המצב שהשורה באה לסגור: ⭐ ולכן נדרשים
   *  שניהם — שהיא קיימת, ⛔ ושאין ולו מיון מקומי אחד מחוצה לה. */
  { row: 62, name: 'מיון אחד לכל התצוגות',
    probe: () => !!APP.sortFn && new RegExp('function ' + APP.sortFn + '\\s*\\(').test(code) &&
                 localSortSites().length === 0 },
  /*  ⛔ ה-probe מודד **מבנה דוח בתוך מסלול הייצוא** ⛔ ולא קיום שם —
   *  ⚠️ מסלול שקורא לבונה הדוח ומצלם אותו נקי ממנו לגמרי, ⭐ ומסלול
   *  שבונה מסמך שני נתפס בטבלה שהוא כותב. */
  { row: 67, name: 'ייצוא — שני דפוסים מוצהרים',
    probe: () => exportMarkupSites().length === 0 },
  { row: 100, name: 'שכבת אייקונים',
    probe: () => memoByHash('icons', ICON_SIG(), () => iconAudit('.')).length === 0 },
  { row: 138, name: 'שכבת קלט אחידה',
    probe: () => inputAudit('.').length === 0 },
  /*  ⛔ ❌ מנומק (סבב 67) — אין כאן מסך ניהול משתמשים, ואין לא
   *  שינוי סיסמה עצמי ולא החלפת משתמש; ⚠️ המנהל הוא המשתמש
   *  היחיד בפועל, וסיסמאות נקבעות ב-INSERT ידני. */
  /*  ⭐ סבב 68 — שכבת המודאל. ⛔ ה-probe מאמת **חתימה** ולא קיום שם:
   *  `openModal(id)` בשכר נשאה עד סבב 68 את אותו שם ומשמעות אחרת, ⚠️ ומי
   *  שהעתיק קריאה מגיוס לשם קיבל קוד שמתקמפל ואינו עובד. ⛔ ובנוסף נדרשים
   *  המיכל הקבוע ומסלול הסגירה היחיד — ⚠️ דיאלוג שמפספס את `Escape` נראה
   *  תקין עד שמישהו לוחץ עליו. */
  { row: 68, name: 'שכבת המודאל',
    probe: () => modalGaps().length === 0 },
  { row: 143, name: 'שכבת כניסה מלאה',
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
  122: { claim: 'בעלות הסכימה המשותפת' },
  4: { claim: ['canonIds', 'CANON', 'הסדר הקנוני'] },
  1: { claim: 'שם האפליקציה' },
  3: { claim: ['DOC_MAX_LINES', 'DOC_MAX_SHARED'] },
  2: { claim: 'תוכן החלק' },
  5: { claim: 'RM_OK' },
  6: { claim: ['MD_MAX', 'MD_SPLIT'] },
  7: { claim: 'CANON_MD' },
  8: { claim: 'CTX_OK' },
  9: { claim: ['MD_MAX', 'MD_SPLIT'] },
  10: { claim: 'CANON_MD' },
  11: { claim: 'פרק מתחום של קובץ אחר' },
  12: { claim: ['MD_MAX', 'MD_SPLIT'] },
  13: { claim: 'CANON_MD' },
  43: { claim: 'תוכן הקבצים הנלווים' },
  98: { claim: ['gen-icons', 'מצהיר את ', 'ריק נושא הערת נימוק במקומו'] },
  101: { claim: 'margin' },
  33: { manual: 'השוואת זמנים בין הריפו אינה בהישג ידו של שער שרץ בריפו אחד — ⛔ נאכפת בתוצאתה בלבד' },
  45: { manual: 'המדידה שלפני המחיקה היא התנהגות סשן — ⛔ נאכפת רק בתוצאתה, בשער ההסרות' },
  44: { claim: 'אין פרק פערים נפרד' },
  87: { manual: '«סטייה מדפוס» היא קריאת משמעות — ⛔ נסרקת ידנית בכל סבב שנוגע' },
  48: { manual: 'מחזור העבודה ב-git הוא התנהגות סשן שאינה בעץ — ⛔ נאכף רק בתוצאתו' },
  /*  ⛔ שני שערים לשורה אחת, ולכל אחד שם טענה משלו — ⚠️ שער ההסרות מודד
   *  מה שנמחק מול הקומיט הקודם, ⛔ ושער החיווט מודד את המצב **עכשיו**:
   *  ⭐ קורא שאיבד את הגדרתו לפני שני סבבים אינו נראה בהשוואת קומיטים. */
  46: { claims: { test_removals: 'מזהה שנמחק ונשאר לו קורא',
                  test_wiring: 'W.missing' } },
  102: { claim: 'tile-bg' },
  17: { claim: 'const SHARED' },
  20: { claims: { test_filesets: 'testsOnly', 'check-comments': 'מכריז היעדר' } },
  18: { claim: 'טענות על התנהגות' },
  28: { manual: 'המונה מדווח ואינו מפיל: 85 שערים נכתבו לפני הדרישה, והפלה רטרואקטיבית חוסמת כל דחיפה' },
  29: { manual: 'תקן תוכן המוטציה טרם נכתב — טרם נמדד' },
  27: { claim: 'כיסוי הטבלה' },
  36: { claim: 'ועמודת התקן שלה אוסרת במפורש' },
  37: { claim: 'מספור רציף ובלי כפילויות' },
  39: { claim: 'הערה ריקה' },
  41: { claim: 'COUNT_NOTE' },
  42: { manual: 'עדכון הסימון הוא התנהגות סשן שאינה בעץ — ⛔ נאכף רק בתוצאתו' },
  165: { claim: 'CACHE_NAME' },
  35: { manual: 'מספר בדיווח הוא התנהגות סשן שאינה בעץ — ⛔ אין קובץ שאפשר למדוד בו את הדיווח, ⚠️ ונאכף בתוצאתו בלבד' },
  22: { claim: 'drift' },
  26: { claim: 'measure-gap',
        manual: 'הצד השני של השורה — ⛔ «אותה טענה» היא קריאת משמעות, ונסרק ידנית בכל סבב שנוגע' },
  30: { claim: 'תווית מוטציה מודפסת' },
  19: { claim: 'תקן הבאנר' },
  16: { claim: 'דפוס הבודקים' },
  34: { claim: 'מספרי הבאנר' },
  23: { claim: 'ריצת check-js' },
  /*  ⛔ שתי השורות של סבב 74ב — ⚠️ שתיהן נאכפות ב-`check-js` עצמו, ⭐ מפני
   *  שרק שם רצים כל השערים: ⛔ שער נפרד שימדוד את זמנם היה מריץ את כולם
   *  פעם שנייה, וזו בדיוק העבודה הכפולה שהשורה שמעליהן אוסרת. */
  31: { claim: 'BUDGET_MS' },
  32: { claim: 'תקציב זמן לסט' },
  24: { claim: 'ברירת המחדל אינה המהירה' },
  47: { manual: 'התנהגות סשן שאינה בעץ — ⛔ אין קובץ שאפשר למדוד בו קריאה חסכונית' },
  49: { claims: { 'check-capabilities': ['sha:', 'orderGaps'],
                  test_sharedsync: ['block-drift', 'canon-drift'],
                  test_signedshared: 'unsignedTwins' } },
  60: { claim: 'CANON' },
  71: { claim: 'storage' },
  75: { claim: 'ג · פעולה שדורשת רשת' },
  83: { claim: 'עברית' },
  84: { claims: { 'check-comments': 'RULE_W', 'check-capabilities': 'bannerGaps' } },
  85: { claim: 'BANNER_W' },
  157: { claim: 'CSS מתות' },
  40: { claim: 'פתיחת ההערה בטבלה',
        manual: '«למה ולא מה» הוא קריאת משמעות — ⛔ שער מודד צורה בלבד, ⚠️ ונסרק ידנית' },
  86: { claim: 'מפנה לקובץ' },
  97: { claim: 'android/app/src/main' },
  104: { claim: 'fgDriftMax' },
  105: { claim: 'CANON_MANIFEST' },
  106: { claim: 'שדות זהים' },
  109: { claim: 'BUILD_SHA' },
  113: { claim: 'SHARED_SHA' },
  111: { claim: 'versionCode' },
  94: { claim: 'WebView' },
  95: { claim: 'android:theme' },
  99: { claim: ['מיקום המאסטר אינו מזיז', 'שהמסכה החתוכה היא כל מקורם'] },
  116: { manual: 'הנפילה-חזרה ביומן נסרקת ידנית; ⛔ קיום המפתחות במסד אינו נראה מהריפו' },
  119: { claim: 'migrations' },
  123: { manual: 'ההרשאות יושבות במסד ואינן נראות מהריפו — אימות הוא פעולת מנהל' },
  125: { claim: 'א. חותמת בכל רשומה' },
  135: { claim: 'ב. חתימת סכימה' },
  139: { claim: 'type=password' },
  140: { claim: 'aria-label' },
  141: { manual: 'מנוע התאריך — ⛔ נאכף ב-`test_date` ביומן ובהנהלה, ⚠️ ובשכר ובגיוס אין צרכן תאריך עברי ואין שער' },
  146: { claim: 'pass_salt' },
  150: { manual: 'היעדר סוד נסרק ידנית; ⛔ שער טקסטואלי היה נכשל על כל מחרוזת' },
  152: { claim: '⏳' },
  153: { manual: 'התאמת הערה למציאות אינה ניתנת לאכיפה מכנית' },
  160: { manual: 'מצב ההרצה יושב ב-`schema_migrations` ואינו נראה מהריפו' },
  155: { claim: 'כל קובץ בעץ מוזכר במקום אחר' },
  159: { claim: 'ד. רשימת-היתר' },
  161: { manual: 'מצב הענפים המרוחקים אינו נראה מעותק העבודה' },
  /*  ⛔ «קורא סביר יופתע» אינו נגזר מהטקסט (סבב 96) — ⚠️ **מתי** נכתבת
   *  הערה הוא שיקול דעת, ⭐ ומה שכן נאכף הוא **תוכנה**: בלי היסטוריה,
   *  בלי ספירה שתסחף, «למה ולא מה». ⛔ והקיום נאכף בתוצאתו בלבד. */
  82: { manual: '«קורא סביר יופתע» אינו נגזר מהטקסט — ⛔ נאכף בתוצאתו בלבד' },
  89: { claim: 'CLEANUP_SHA' },
  90: { claim: 'בלוק ה-APP' },
  136: { claims: { 'check-capabilities': 'cfgKeyGaps', test_dbfacts: 'ג. כל מפתח שהקוד מבקש' } },
};

/* ────── ⛔ מבנה הטבלה עצמה — מספור ותקן ההערות (סבב 72) ─────────────────────
   ⛔ מה נאכף: המספור **רציף 1..N ובלי כפילויות**, ⛔ ושורה שארבעת תאיה
   מסומנים תקין נושאת הערה **ריקה**. ⛔ ולמה זה יכול להישבר: שני הכללים כתובים
   ב-`table` מסבב 70, ⚠️ ואיש לא מדד אותם — ⛔ מספור נשבר בכל
   הוספה באמצע, והערה ששרדה תיקון נקראת כמצב פתוח שאינו קיים.
   ──────────────────────────────────────────────────────────────────────── */
{
  const ls = fs.readFileSync(APP.docs, 'utf8').split('\n');
  const a = ls.findIndex((l) => /^<!--\s*SHARED:start\s+id="table"/.test(l));
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
  /*  ⛔ מבנה ולא רק מספור (סבב 87ג) — ⚠️ הנימוק המדוד: מציג הטבלה פירק
   *  שורה אחת פחות ממה שהשער ספר, ⭐ ששתי שורות נגמרו בלי סוגר לעמודה
   *  האחרונה ⛔ והשער בדק **רציפות** ולא **מבנה**. ⚠️ וקטגוריה בלי כותרת
   *  היא אותו כשל מהצד השני — ⭐ קורא שמפרק את הטבלה מקבל קבוצה בלי שם. */
  const badShape = rows.filter((r) => r.cells.length !== 10).map((r) => r.n);
  const heads = ls.slice(a, b).filter((l) => /^\|\s*\|\s*\*\*/.test(l));
  const firstRow = ls.slice(a, b).findIndex((l) => /^\|\s*\d+\s*\|/.test(l));
  const firstHead = ls.slice(a, b).findIndex((l) => /^\|\s*\|\s*\*\*/.test(l));
  if (badShape.length)
    fail(`טבלת התשתית: שורות שאינן מתפרקות לשבע עמודות — ${badShape.join(', ')}, ` +
         'והצפוי אפס. מוסיפים `|` בסוף השורה, אחרי עמודת ההערה');
  else if (firstHead < 0 || firstHead > firstRow)
    fail('טבלת התשתית: הקטגוריה הראשונה בלי כותרת — נמדדה שורת נתונים לפני ' +
         'כותרת קטגוריה כלשהי והצפוי כותרת. מוסיפים שורת כותרת לקטגוריה');
  else pass(`מבנה הטבלה — ${rows.length} שורות בשבע עמודות, ${heads.length} קטגוריות`);
  /*  ⛔ אות הקטגוריה יחידה ורצופה (סבב 89) — ⚠️ הנימוק המדוד: `ב1` ו-`ב2`
   *  נקראו כענפים של `ב` ⛔ והיו שלושה נושאים נפרדים, ⭐ ומי שחיפש שורה
   *  בקטגוריה «אכיפה» קרא שלושים וארבע שורות במקום עשרים ואחת.
   *  ⛔ **והרצף נגזר מסדר האותיות** ⛔ ואינו מוקלד — ⚠️ רשימה מוקלדת של
   *  שתים-עשרה אותיות הייתה נשברת בכל קטגוריה שנוספת. */
  const HEB_ORD = (n) => {
    const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    return TENS[Math.floor(n / 10)] + ONES[n % 10];
  };
  const letters = heads.map((l) => (/^\|\s*\|\s*\*\*\s*([^·]*?)\s*·/.exec(l) || [])[1] || '—');
  const badLetter = letters
    .map((g, i) => (g === HEB_ORD(i + 1) ? null : `«${g}» במקום «${HEB_ORD(i + 1)}»`))
    .filter(Boolean);
  if (badLetter.length)
    fail(`אותיות הקטגוריות בטבלת התשתית: ${badLetter.join(' · ')} — ` +
         'נמדדה אות שאינה הבאה ברצף, או תת-מספור. ' +
         'ממספרים את הקטגוריות באות אחת רצופה');
  else pass(`אותיות הקטגוריות — ${letters.length} קטגוריות באות אחת רצופה, ` +
            `«${letters[0]}» עד «${letters[letters.length - 1]}»`);
  /*  ⚠️ ארבעת התאים ולא התא של האפליקציה הזו (סבב 72) — ⛔ ההערה משותפת
   *  לארבעת הריפו, והיא לגיטימית כל עוד תא אחד אינו תקין. */
  /*  ⛔ מדידה היא החריג היחיד (סבב 72) — ⚠️ «כמה שערים» ו«כמה קבצים»
   *  משתנים בכל סבב, ⭐ ומקומם בהערות **גם בשורה ✅**: ⛔ בעמודת התקן הם
   *  היו הופכים כל תוספת שער להפרה. ⚠️ מה שנשאר אסור הוא הערת **נימוק**
   *  על שורה תקינה — ⛔ היא מתארת מצב שכבר אינו.
   *  ⛔⛔ **והמדידה נמדדת בפתיחה ⛔ ולא בספרה** (סבב 96) — ⚠️ «נמדד: אפס
   *  בדיקות נוכחות עירומות» הוא מדידה בדיוק כמו «נמדד: 615», ⭐ וספרה
   *  היא היוריסטיקה ולא הטענה: ⛔ תקן פתיחת ההערה נותן את ההבחנה
   *  במדויק — «נמדד» היא מדידה, ⚠️ ושתי הפתיחות האחרות הן נימוק. */
  const COUNT_NOTE = /^[\s*⛔⚠️⭐️\uFE0F]*נמדד/;
  const noisy = rows.filter((r) => r.cells.length >= 9 &&
                  [4, 5, 6, 7].every((k) => r.cells[k].indexOf('✅') >= 0) &&
                  r.cells[8].trim() !== '' && !COUNT_NOTE.test(r.cells[8].trim()));
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

/*  ⛔ קבועי מסך הצפייה — ⚠️ ההצהרה נמדדת משני צדדיה: ⭐ שם שמוצהר וקיים
 *  בקוד, ⛔ ושם משלוש האחרות שמוצהר ריק ואינו קיים בהן. ⚠️ הכרזה שאין לה
 *  אתר בפועל מפילה אף היא, ⛔ והצהרה ריקה שיש לה אתר — כך גם. */
{
  const want = APP.viewOnlyConsts || [];
  const ALL = ['RAW_BASE', 'YS_INF_MD'];
  const has = (n) => new RegExp('(?<![\\w$])' + n + '(?![\\w$])').test(code);
  const missing = want.filter((n) => !has(n));
  const stray = ALL.filter((n) => want.indexOf(n) < 0 && has(n));
  if (missing.length || stray.length)
    fail(`קבועי מסך הצפייה: ${missing.map((n) => 'מוצהר ואינו בקוד: ' + n)
      .concat(stray.map((n) => 'בקוד ואינו מוצהר: ' + n)).join(' · ')} — ` +
      `נמדדו ${missing.length + stray.length} והצפוי אפס. ` +
      'מיישרים את APP.viewOnlyConsts לקוד — ⛔ המסך קיים ביומן בלבד');
  else pass(`קבועי מסך הצפייה — ${want.length} מוצהרים וקיימים, ` +
            `${ALL.length - want.length} מוצהרים כריקים ואינם בקוד`);
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
   *  משלו, ב-`claims: { שער: טענה }`. ⚠️ הנימוק נמדד: «שער חריג נושא נימוק
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
    fail(`שערים שמוכרזים ב-ROWS ואינם ברשימת השערים שב-check-js — ` +
    `קיימים ואינם רצים: ${idle.join(', ')}; נמדדו ${idle.length} והצפוי אפס. ` +
    `מוסיפים אותם לרשימת השערים שב-check-js`);
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
export const capFailures = failures;
if (!process.env.CAP_INPROC) process.exit(failures ? 1 : 0);

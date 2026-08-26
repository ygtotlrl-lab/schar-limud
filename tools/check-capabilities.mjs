#!/usr/bin/env node
/*  בדיקת אחידות היכולות המשותפות — סבב 30, השלמה.
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
  // ⚠️ שורה 7 «לא רלוונטי» — אין כאן פינוי כלל (שורה 6), ולכן אין מה לאמת.
  /*  ⭐ שם משפך ה-`kv` (סבב 56) — `null` כשאין כאן `kv` כלל. */
  kvFallbackFn: null,
  naRows: [7],
  matrixProbe: {
    // ❌ מתועד: `doLogin` מריצה משיכה מלאה כפויה במקום נתיב חלקי.
    4:  () => false,
    // חמש טבלאות `sl_` מאז ההקמה — המראה נבנית מהן ישירות.
    15: (c) => c.hasCode(/\bSL_TABLES\b/),
    // ❌ מתועד: המנהל מנהל סיסמאות מלוח הבקרה של Supabase.
    19: () => false,
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  היכולות המשותפות. `block` — הליבה שחייבת להיות זהה בית-לבית.
 *  `hooks` — נקודות ההפעלה: `at:'boot'` = פונקציית העלייה, `at:'settings'`
 *  = פונקציית מסך ההגדרות. `forbidden` — פונקציות שהמודול חושף אך אסור
 *  לקרוא להן מקוד האפליקציה. `row` — שורת היכולת במטריצה, ו-`probe` הוא
 *  מה שמעיד על קיומה בקוד כשאין לה בלוק משלה.                            */
const CAPS = {
  storage: {
    name: 'מודול עמידות האחסון',
    block: { sha: 'b65b91300715b8f3', lines: 690,
             start: '   עמידות אחסון מקומי — מודול משותף (סבב 11).',
             end:   '/* ═══════════════ סוף המודול המשותף' },
    hooks: [{ fn: 'lsBoot', at: 'boot' }],
  },
  pending: {
    name: 'מודול "ממתין לסנכרון"',
    block: { sha: '9eefbb4da3ebc37c', lines: 328,
             start: '/* ═══ ממתין לסנכרון — מודול משותף (סבב 12)',
             end:   '/* ═══════════════ סוף מודול "ממתין לסנכרון"' },
    hooks: [{ fn: 'pendBoot', at: 'boot' }],
  },
  status: {
    name: 'אזור המצב',
    block: { sha: '65ff4f75bc4f6756', lines: 60,
             start: '/* ═══ אזור מצב — בלוק "☁️ סנכרון"',
             end:   '/* ═══ סוף בלוק "☁️ סנכרון"' },
    hooks: [{ fn: 'statusAreaMount', at: 'settings' }],
  },
  backup: {
    name: 'גיבוי יומי אוטומטי',
    block: { sha: 'f17875916d7a4b3d', lines: 315,
             start: '/* ═══ גיבוי יומי ויומן פעולות',
             end:   'סוף מודול הגיבוי היומי' },
    hooks: [{ fn: 'bkBoot', at: 'boot' }, { fn: 'bkStatusMount', at: 'settings' }],
    forbidden: ['bkMaybeDaily'],
  },
  hotwin: {
    name: 'מודול החלון החם והשחזור המקומי',
    block: { sha: '0a8ea3499a688691', lines: 221,
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
   *  ומה שנאכף במטריצה (שורה 25) הוא **שהוא באמת נקרא** מקוד האפליקציה. */
  /*  ⚠️ גם לליבת המיזוג אין `hooks` — היא אינה יכולת עלייה ואינה יכולת
   *  מסך, אלא ליבה שכל מנוע מיזוג עוטף. מה שנאכף כאן הוא **הזהות
   *  בית-לבית**; מה שנאכף במטריצה (שורה 27) הוא שהמעטפת באמת קוראת לה. */
  mergecore: {
    name: 'מודול מיזוג הרשומות',
    block: { sha: 'cc0329965238994c', lines: 91,
             start: '/* ═══ מיזוג רשומות — מודול משותף (סבב 38)',
             end:   '/* ═══════════════ סוף מודול המיזוג' },
  },
  /*  ⭐ סבב 40 — מודול מזהה המכשיר. אין לו `hooks`: הוא אינו יכולת עלייה
   *  ואינו יכולת מסך, אלא עוזר שנקרא מכל אתר שרושם ליומן או לגיבוי. מה
   *  שנאכף כאן הוא **הליבה**, ומה שנאכף במטריצה (שורה 26) הוא ששתי
   *  הפונקציות באמת קיימות בקוד.                                       */
  devid: {
    name: 'מודול מזהה המכשיר',
    block: { sha: '96caaf595b7a1692', lines: 39,
             start: '/* ═══ מזהה מכשיר — מודול משותף (סבב 40)',
             end:   '/* ═══════════════ סוף מודול מזהה המכשיר' },
  },
  ids: {
    name: 'מודול מזהי רשומות',
    block: { sha: '3edcfd6f5b4be129', lines: 35,
             start: '/* ═══ מזהי רשומות — מודול משותף (סבב 37א)',
             end:   '/* ═══════════════ סוף מודול מזהי הרשומות' },
  },
  /*  ⭐ סבב 42ג — ליבת ה-service worker. ⚠️ זה הבלוק המשותף הראשון שאינו
   *  יושב ב-`index.html` אלא ב-`sw.js`, ולכן הוא נושא `file`. אין לו
   *  `hooks`: `sw.js` אינו נטען בהקשר הדף ואין בו «פונקציית עלייה» —
   *  נקודות ההפעלה שלו הן מאזיני `install`/`activate`/`fetch`, שיושבים
   *  **בתוך** הליבה ולכן נאכפים בחתימה עצמה. מה שנאכף במטריצה (שורה 31)
   *  הוא ש-`SW_CFG` באמת מוגדר מעליו — ליבה בלי פרמטרים אינה מודול. */
  /*  ⭐ סבב 44 — מודול הניסיון החוזר בסנכרון. ⚠️ יש לו `hooks` (בשונה
   *  מהמודולים חסרי-החיווט שמעליו) מפני שהוא **יכולת עלייה**: הוא דורך
   *  את עצמו בעלייה ומרשם את מאזיני `online`/`visibilitychange`. ⛔ מה
   *  שאינו נאכף כאן הוא `rtyNote()` — נקודת הדריכה מהמשפך המקומי — והיא
   *  נאכפת ב-`test_round44_retry.mjs`, שיודע גם מהו המשפך בכל אפליקציה. */
  retry: {
    name: 'מודול הניסיון החוזר בסנכרון',
    block: { sha: 'b26046c13cb36986', lines: 100,
             start: '/* ═══ ניסיון חוזר בסנכרון — מודול משותף (סבב 44)',
             end:   '/* ═══════════════ סוף מודול הניסיון החוזר' },
    hooks: [{ fn: 'rtyBoot', at: 'boot' }],
  },
  /*  ⭐ סבב 51 — מנגנון המשיכה. יש לו `hooks` מפני שהוא **יכולת עלייה**:
   *  הוא דורך את התקתוק ומרשם את מאזין ה-`online`. ⛔ מה שאינו נאכף כאן
   *  הוא קידום החותמת ממסלולי הכתיבה — הוא נאכף ב-`test_round51_pull.mjs`,
   *  שיודע גם מהם המשפכים בכל אפליקציה.                                */
  pull: {
    name: 'מנגנון המשיכה',
    block: { sha: 'a5733e59b1f5e02b', lines: 108,
             start: '/* ═══ מנגנון המשיכה — מודול משותף (סבב 51)',
             end:   '/* ═══════════════ סוף מנגנון המשיכה' },
    hooks: [{ fn: 'plBoot', at: 'boot' }],
  },
  /*  ⭐ סבב 52 — נעילת חוסר-פעילות. יש לו `hooks` מפני שהוא **יכולת
   *  עלייה**: הוא מרשם את מאזיני הפעילות ודורך את המונה בעלייה. ⛔ הוא
   *  נעדר ב-yoman-avoda, שאין בה מסך כניסה כלל ולכן אין מה לנעול —
   *  החריגה מוצהרת ב-`APP.skipCaps` **ומנומקת שם**, ורשומה במטריצה
   *  (שורה 34) כ«לא רלוונטי». ⛔ «קיים רק באחת, בשקט» אינו מצב חוקי
   *  (כלל ברזל 14), ⛔ וגם «נעדר באחת, בשקט» אינו.                    */
  lock: {
    name: 'נעילת חוסר-פעילות',
    block: { sha: 'faf3168aa73eeb97', lines: 133,
             start: '/* ═══ נעילת חוסר-פעילות — מודול משותף (סבב 52)',
             end:   '/* ═══════════════ סוף מודול נעילת חוסר-הפעילות' },
    hooks: [{ fn: 'lkBoot', at: 'boot' }],
  },
  /*  ⭐ סבב 53 — מודל הסשן. יש לו `hooks` מפני שהוא **יכולת עלייה**: הוא
   *  מנקה בעלייה את שרידי הסשן שנשמרו על הדיסק בגרסאות קודמות. ⛔ הוא
   *  נעדר ב-yoman-avoda, שאין בה מסך כניסה כלל ולכן אין משתמש מחובר
   *  להחזיק — החריגה מוצהרת ב-`APP.skipCaps` **ומנומקת שם**, ורשומה
   *  במטריצה (שורה 35) כ«לא רלוונטי», בדיוק כמו `lock`.               */
  sess: {
    name: 'מודל הסשן',
    block: { sha: '1977a56060bd1796', lines: 76,
             start: '/* ═══ מודל הסשן — מודול משותף (סבב 53)',
             end:   '/* ═══════════════ סוף מודול הסשן' },
    hooks: [{ fn: 'sessBoot', at: 'boot' }],
  },
  swcore: {
    name: 'מודול ה-service worker',
    block: { file: 'sw.js', sha: '568ecbd986b69a14', lines: 294,
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
  if (!got) { present[key] = false; fail(`${cap.name}: הבלוק לא נמצא (סמן פתיחה/סגירה חסר)`); continue; }
  present[key] = true;
  if (!got.external) ranges.push([got.at, got.at + got.text.length]);
  const sha = crypto.createHash('sha256').update(got.text).digest('hex').slice(0, 16);
  if (sha !== cap.block.sha) {
    fail(`${cap.name}: הליבה אינה זהה לחתימה הקנונית — ${sha} במקום ${cap.block.sha} ` +
         `(${got.text.split('\n').length} שורות במקום ${cap.block.lines}). ` +
         `יכולת משותפת חייבת ליבה זהה בית-לבית בארבעת הריפו.`);
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

const anchors = { boot: APP.bootFn, settings: APP.settingsFn };
const anchorRange = {};
for (const at of Object.keys(anchors)) {
  const r = fnRange(anchors[at]);
  if (!r) fail(`פונקציית ה${at === 'boot' ? 'עלייה' : 'הגדרות'} "${anchors[at]}" לא נמצאה בקוד`);
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
      fail(`${cap.name}: ${h.fn}() אינה נקראת בשום מקום — היכולת קיימת אך אינה מחווטת`);
      continue;
    }
    const stray = sites.filter((p) => p < r[0] || p >= r[1]);
    if (stray.length) {
      fail(`${cap.name}: ${h.fn}() נקראת גם מחוץ ל-${anchors[h.at]}() ` +
           `(שורות ${stray.map(lineOf).join(', ')}) — נקודת ההפעלה חייבת להיות אחת. ` +
           `זה בדיוק הפער שהשבית את הגיבוי ל-25 יום.`);
    } else {
      pass(`${cap.name}: ${h.fn}() נקראת אך ורק מ-${anchors[h.at]}()`);
    }
  }
  for (const f of (cap.forbidden || [])) {
    const sites = callSites(f);
    if (sites.length) {
      fail(`${cap.name}: ${f}() נקראת מקוד האפליקציה (שורות ${sites.map(lineOf).join(', ')}) — ` +
           `⛔ הקריאה היחידה אליה היא מתוך הבלוק המשותף`);
    } else {
      pass(`${cap.name}: אין קריאה ישירה ל-${f}() מקוד האפליקציה`);
    }
  }
}

function matrixCell(row) {
  if (!fs.existsSync(APP.docs)) return null;
  const doc = fs.readFileSync(APP.docs, 'utf8');
  const line = doc.split('\n').find((l) => new RegExp('^\\|\\s*' + row + '\\s*\\|').test(l));
  if (!line) return null;
  const cells = line.split('|');
  return cells.length > 2 + APP.matrixCol ? cells[2 + APP.matrixCol].trim() : null;
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
   אכן קרה: שורה 20 הכריזה «מטמון-CDN מראש עם ריפוי עצמי ✅» בארבעתן,
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

/*  שורות המטריצה. `probe` מחזירה true כשהיכולת **קיימת בפועל**.
 *  `desc` — שורה תיאורית (לא ✅/❌): מחזירה את הטקסט שהתא חייב לשאת.
 *  `exempt` — שורה שאינה ניתנת לאימות מהריפו, עם נימוק בן שורה.
 *  `app: true` — ה-probe יושב ב-`APP.matrixProbe[row]` מפני שהוא נמדד
 *  מקוד האפליקציה הזו ואינו ניתן לניסוח גנרי.                            */
const MATRIX = [
  { row: 1,  name: 'כניסה אופליין',
    probe: () => !!(APP.offlineLoginFn && fnRange(APP.offlineLoginFn)) },
  { row: 2,  name: 'עריכת נתונים אופליין',
    probe: () => hasCode(/\bpendMark\s*\(/) },
  { row: 3,  name: 'מודל משתמשים',
    desc: () => (APP.offlineLoginFn ? 'רב-משתמשים' : 'אין') },
  { row: 4,  name: 'נתיב עדכון חלקי למראת המשתמשים', app: true },
  { row: 5,  name: 'סוד במכשיר',
    desc: () => (hasCode(/\bpass_fp\b/) ? 'טביעה' : 'אין') },
  { row: 6,  name: 'פינוי אוטומטי',
    probe: () => /tier2\s*[:=]\s*\[\s*\{/.test(policyBlock()) },
  { row: 7,  name: 'אימות פינוי מול הענן',
    probe: () => /\bverify\s*:/.test(policyBlock()) },
  { row: 8,  name: 'שיתוף קבצים',
    probe: () => hasCode(/_androidShareImage|navigator\s*\.\s*share\b/) },
  { row: 9,  name: 'מעטפת APK (WebView)',
    probe: () => hasPath('android/app/src/main/AndroidManifest.xml') },
  { row: 10, name: 'מפתח חתימה קבוע בריפו',
    probe: () => hasPath('signing') &&
                 fs.readdirSync('signing').some((f) => f.endsWith('.keystore')) },
  { row: 11, name: 'מקור אמת יחיד לסכימה', probe: () => hasPath(APP.schemaFile) },
  { row: 12, name: 'קובץ התקנה מלא',       probe: () => hasPath(APP.schemaFile) },
  { row: 13, name: 'גיבוי יומי אוטומטי',   probe: () => present.backup === true },
  { row: 14, name: 'יומן פעולות',          probe: () => present.log === true },
  { row: 15, name: 'נתונים בטבלאות מובנות', app: true },
  { row: 16, name: 'שער תקינות JS',        probe: () => hasPath('tools/check-js.mjs') },
  { row: 17, name: 'חלון חם במכשיר',
    probe: () => /\benabled\s*:\s*true\b/.test(cfgBlock('HW_CFG')) },
  { row: 18, name: 'שחזור מקומי מהענן',
    probe: () => callSites('hwRestoreMount').length > 0 },
  { row: 19, name: 'מסך שינוי סיסמה עצמי', app: true },
  { row: 20, name: 'מטמון-CDN מראש עם ריפוי עצמי',
    probe: () => fileHas('sw.js', /CDN_ASSETS/) && fileHas('sw.js', /ensureCdnCached/) },
  { row: 21, name: 'גיבוי יומי מטבלאות מובנות',
    exempt: 'התא מצהיר שהגיבוי **קורא** מטבלאות מובנות, וזו עובדת מסד ולא ' +
            'עובדת ריפו: מקור `kind:\'table\'` רשום ב-BK_CFG של הנהלה מסבב 36, ' +
            'אך הטבלאות עצמן טרם נוצרו וגיבוי ממקור שאינו קיים מדלג בשקט. ' +
            'הצד שכן נבדק — קיום המקורות — נאכף ב-test_round35c_cron.mjs.' },
  { row: 22, name: 'פינוי גיבויים אוטומטי במסד',
    exempt: 'התא מצהיר שמשימת `pg_cron` **רשומה ופעילה במסד**, ואין דרך ' +
            'לראות זאת מהריפו. הצד שכן נבדק — `_bkRetention` וקובץ המיגרציה — ' +
            'נאכף ב-test_round35c_cron.mjs, שנועל גם את התזמון.' },
  /*  ⭐ סבב 38 — ה-probe הפך גנרי. עד אז הוא היה `app: true`, מפני שכל
   *  אפליקציה מימשה את כלל ה-⏳ בפונקציה משלה; מרגע שהכלל יושב ב-`_mergePick`
   *  המשותפת, אותה בדיקה בדיוק תקפה בארבעתן — וזו בעצמה עדות שהאיחוד
   *  אמיתי ולא שמו של קובץ. */
  { row: 23, name: 'מנוע מיזוג עם הגנת ⏳',
    probe: () => /isPend \|\| tsOf\(loc\) > tsOf\(rem\)/.test(fnBody('_mergePick')) },
  { row: 24, name: 'חסימת משתמש מושבת בכניסה אופליין',
    probe: () => !!APP.offlineLoginFn &&
                 /\bactive\s*!==\s*true\b/.test(fnBody(APP.offlineLoginFn)) },
  /*  ⚠️ ה-probe בודק **קריאה מקוד האפליקציה** ולא את עצם קיום המודול:
   *  `callSites` מדלגת על מה שבתוך הבלוקים המשותפים, ולכן מודול שיושב
   *  בקובץ ואיש אינו קורא לו נספר כ-❌ — וזה בדיוק המצב ביומן, שמזהי
   *  הרשומות שלו עדיין חותמות זמן. ר' הנימוק בשורה 25 שבמטריצה. */
  { row: 25, name: 'מודול מזהי רשומות',
    probe: () => callSites('newClientId').length > 0 },
  /*  ⛔ מזהה מכשיר אינו מזהה רשומה (סבב 37א), ולכן זו שורה נפרדת ולא
   *  הרחבה של 25 — המושג אחר (זהות של מכשיר, לא של נתון), הפורמט אחר
   *  (שמונה תווים ולא uuid), והצרכן אחר (יומן הפעולות והגיבוי).
   *  ⚠️ ה-probe דורש את **שתי** הפונקציות: `getDeviceId` בלי `_randDeviceId`
   *  היא מעטפת בלי מחולל, וזה בדיוק המצב ההפוך שנמדד ב-gius — שם
   *  `BK_CFG.device` קראה לפונקציה שאינה מוגדרת, וה-`try/catch` שסביבה
   *  החזיר `null` בשקט. */
  { row: 26, name: 'מזהה מכשיר',
    probe: () => hasCode(/function\s+getDeviceId\s*\(/) &&
                 hasCode(/function\s+_randDeviceId\s*\(/) },
  /*  ⚠️ ה-probe בודק **שהמעטפת קוראת לליבה** ולא רק שהליבה קיימת — בלוק
   *  שיושב בקובץ ואיש אינו קורא לו הוא בדיוק המצב שממנו נולד כלל ברזל 14.
   *  זהות הליבה בית-לבית נאכפת בנפרד, בחתימת `mergecore` שלמעלה. */
  { row: 27, name: 'ליבת מיזוג משותפת',
    probe: () => callSites('mergeCore').length > 0 },
  /*  ⭐ סבב 40 — מעטפת ה-WebView חתומה. ה-probe דורש את **שני** השערים:
   *  קובץ הבדיקה שקיים, ו-`shellSha` שמוצהר בתוכו. ⛔ שער שקיים בלי
   *  חתימה מוצהרת הוא שער שאינו נועל דבר — בדיוק המצב שהיה עד הסבב הזה,
   *  שבו ל-`MainActivity.java` לא נגעה שום בדיקה.                     */
  { row: 28, name: 'מעטפת WebView חתומה',
    probe: () => hasPath('tools/test_round40_shell.mjs') &&
                 fileHas('tools/test_round40_shell.mjs', /shellSha:\s*'[0-9a-f]{16}'/) },
  /*  ⭐ סבב 40 — אימות מול טביעה בענן. ה-probe **קורא את הצהרת השער**
   *  (`verifyFn`) ואז מוודא שהפונקציה הזו באמת נקראת ב-`index.html` —
   *  כלומר הוא נשען על הקוד ולא על קיום הקובץ בלבד. ⛔ הצהרה בלי קריאה
   *  היא בדיוק המצב שהמטריצה אמורה לתפוס.                            */
  { row: 29, name: 'אימות מול טביעה בענן',
    probe: () => {
      const p = 'tools/test_round40_passwords.mjs';
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
  { row: 30, name: 'בניית APK אחידה עם שער חתימה',
    probe: () => {
      if (!hasPath('tools/test_round41_build.mjs')) return false;
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
  { row: 31, name: 'מודול ה-service worker',
    probe: () => present.swcore === true && fileHas('sw.js', /var\s+SW_CFG\s*=/) },
  /*  ⭐ סבב 44 — ניסיון חוזר בתור הסנכרון. ה-probe דורש את **שני**
   *  התנאים: הליבה שנמצאה וחתימתה תואמת (`present.retry`), ו-`RTY_CFG`
   *  שמוגדר מעליה. ⛔ ליבה בלי פרמטרים אינה מודול אלא קוד שהועתק —
   *  אותו כלל בדיוק כמו בשורה 31.                                    */
  { row: 32, name: 'ניסיון חוזר בתור הסנכרון',
    probe: () => present.retry === true && hasCode(/var\s+RTY_CFG\s*=/) },
  /*  ⭐ סבב 51 — מנגנון משיכה אחיד. ה-probe דורש את **שני** התנאים:
   *  הליבה שנמצאה וחתימתה תואמת (`present.pull`), ו-`PL_CFG` שמוגדר
   *  מעליה. ⛔ ליבה בלי פרמטרים אינה מודול אלא קוד שהועתק — אותו כלל
   *  בדיוק כמו בשורות 31 ו-32.                                        */
  { row: 33, name: 'מנגנון משיכה אחיד',
    probe: () => present.pull === true && hasCode(/var\s+PL_CFG\s*=/) },

/*  ⭐ סבב 52 — נעילת חוסר-פעילות. ה-probe דורש את **שני** התנאים:
   *  הליבה שנמצאה וחתימתה תואמת (`present.lock`), ו-`LK_CFG` שמוגדר
   *  מעליה. ⛔ ליבה בלי פרמטרים אינה מודול אלא קוד שהועתק — אותו כלל
   *  בדיוק כמו בשורות 31–33.                                          */
  { row: 34, name: 'נעילת חוסר-פעילות',
    probe: () => present.lock === true && hasCode(/var\s+LK_CFG\s*=/) },
  /*  ⭐ סבב 53 — מודל הסשן, ⚠️ **וזו השורה של סבב 52 בכיוון ההפוך**. שם
   *  היא נקראה «סשן נשמר במכשיר» ומדדה את ההבדל שהמנהל חש בו; כאן היא
   *  מודדת את ההכרעה שלו: ⛔ המשתמש המחובר חי בזיכרון בלבד ואינו יורד
   *  לדיסק באף אחת מהשלוש.
   *  ⚠️ ה-probe דורש את **שלושת** התנאים — הליבה שנמצאה וחתימתה תואמת,
   *  `SESS_CFG` שמוגדר מעליה (ליבה בלי פרמטרים אינה מודול), ⛔ ושאין
   *  בקוד שום קבוע ששמו `SESSION_KEY`. ⛔ השלישי הוא העיקר: מודול
   *  שקיים לצד מסלול שמירה ישן שנשאר הוא בדיוק הכשל שהסבב הזה סגר.  */
  { row: 35, name: 'מודל הסשן — בזיכרון בלבד',
    probe: () => present.sess === true && hasCode(/var\s+SESS_CFG\s*=/) &&
                 !hasCode(/SESSION_KEY/) },
  /*  ⭐ סבב 53 — בדיקת עדכון תקופתית ל-service worker. ⚠️ **נמדד: היא
   *  נעדרה ב-gius בלבד**, ולכן לשונית שנשארה פתוחה שם לא למדה לעולם
   *  שיצאה גרסה חדשה — הדפדפן בודק את `sw.js` בניווט בלבד, והבאנר
   *  שקיים שם פשוט לא הוצג. ⛔ אין בכך שינוי להכרעה של gius שאין
   *  `skipWaiting` (סבב 42ג): הבדיקה **מגלה** גרסה, והמשתמש מחליט.
   *  ⚠️ ה-probe דורש את שני חלקי המנגנון — `reg.update()` והמרווח —
   *  מפני שקריאה בלי מרווח היא בדיקה חד-פעמית בעלייה, וזה מה שהיה. */
  { row: 36, name: 'בדיקת עדכון תקופתית ל-service worker',
    probe: () => hasCode(/\breg\s*\.\s*update\s*\(/) &&
                 hasCode(/setInterval\(\s*\w+\s*,\s*30\s*\*\s*60\s*\*\s*1000\s*\)/) },
  /*  ⭐ סבב 53 — שלוש שורות תשתית שהיו קיימות בארבעתן **ולא נמדדו כאן
   *  מעולם** (38–40). ⚠️ כל אחת מהן נאכפת על **הערך** ולא על עצם
   *  הקיום: קבוע שקיים בערך אחר בכל אפליקציה הוא בדיוק «אחיד ולא
   *  זהה» שכלל ברזל 14 אוסר, והוא נראה תקין בסריקת-קיום.            */
  { row: 38, name: 'רענון תקופתי של מונה הממתינים',
    probe: () => hasCode(/setInterval\(\s*pendRender\s*,\s*60000\s*\)/) },
  { row: 39, name: 'פסק זמן אחיד לקריאות רשת',
    probe: () => hasCode(/var\s+NET_TIMEOUT_MS\s*=\s*8000\s*;/) },
  /*  ⚠️ **ה-probe הזה קורא את המקור הגולמי ולא את הקוד המטוקן** — שם
   *  האירוע הוא **מחרוזת**, והטוקניזציה מרוקנת מחרוזות; probe על
   *  `code` לא היה יכול להבחין בין `'online'` ל-`'offline'`. ⛔ אין
   *  להשתמש ב-`hasSrc` לשם פונקציה או לקבוע (סבב 53) — שם שמופיע
   *  בהערה בלבד היה נספר כמימוש, וזה בדיוק מה ש-`code` בא למנוע.   */
  { row: 40, name: 'מאזיני מצב רשת',
    probe: () => hasSrc(/window\.addEventListener\('online'/) &&
                 hasSrc(/window\.addEventListener\('offline'/) },
  /*  ⭐ סבב 53 — שתי שורות שקיימות **ביומן בלבד**, ⛔ ואין ליישר אותן.
   *  גריעת ה-tombstones לפי גיל (`TOMBSTONE_TTL_MS`) ומנגנון
   *  האוטו-אפדייט מ-raw (`UPDATE_INTERVAL_MS`) נולדו שם ומנומקים שם;
   *  ⚠️ עד הסבב הזה הן פשוט לא הופיעו במטריצה, כלומר «קיים רק באחת,
   *  בשקט». הנימוקים יושבים ב-`tools/_capability-notes.md`.        */
  { row: 41, name: 'גריעת tombstones לפי גיל',
    probe: () => hasCode(/TOMBSTONE_TTL_MS/) },
  { row: 42, name: 'אוטו-אפדייט מ-raw.githubusercontent',
    probe: () => hasCode(/UPDATE_INTERVAL_MS/) && hasCode(/\bRAW_URL\b/) },
  /*  ⭐ סבב 56 — מקור הקריאה. ⚠️ **שורה תיאורית ולא ✅/❌**: היא מודדת
   *  מאיפה נקראים הנתונים, ולא אם יכולת קיימת. `APP.kvFallbackFn` מצהיר
   *  את שם משפך ה-`kv`, ⛔ וה-probe דורש שהוא יימצא בפועל בקוד — הצהרה
   *  שאינה נמדדת היא בדיוק מה שכלל ברזל 12 אוסר. ⛔ ובאפליקציה שהצהירה
   *  «אין» הוא נכשל גם על קריאת `kv` שאיש לא הצהיר עליה.            */
  { row: 43, name: 'מקור הקריאה',
    desc: () => {
      const fn = APP.kvFallbackFn;
      if (fn) return fnRange(fn) ? 'טבלאות ← kv' : `⚠️ ${fn} מוצהר ואינו קיים בקוד`;
      return (hasCode(/\bKV_TABLE\b/) || hasCode(/function\s+\w*[kK]vGet\s*\(/))
        ? '⚠️ נמצאה קריאת kv שאינה מוצהרת' : 'טבלאות בלבד';
    } },
  /*  ⭐ סבב 57 — גשר השיתוף המקורי. ⚠️ **וזו אינה שורה 8 בשם אחר:** שם
   *  נמדד הצד ה**דפדפני** (`_androidShareImage`/`navigator.share`) — האם
   *  הדף יודע לבקש שיתוף; ⛔ וכאן נמדד הצד ה**מקורי** — מה המעטפת עושה
   *  כשביקשו ממנה. ⚠️ ה-probe דורש `Intent.createChooser` בקוד ה-Java,
   *  מפני שזה בדיוק מה שהכלל המשותף מחייב (ר' «הכלל של גשר השיתוף»);
   *  ⛔ גשר שקיים ומפעיל `startActivity` ישיר אינו עומד בכלל, והשורה
   *  הזו היא מה שיתפוס אותו כשאפליקציה חמישית תעתיק את התבנית.       */
  { row: 44, name: 'גשר שיתוף',
    probe: () => javaSrc().indexOf('Intent.createChooser') >= 0 },
];

const NA = 'לא רלוונטי';
for (const m of MATRIX) {
  const cell = matrixCell(m.row);
  if (cell === null) { fail(`שורה ${m.row} («${m.name}») לא נמצאה במטריצת היכולות שב-${APP.docs}`); continue; }
  if (m.exempt) { pass(`שורה ${m.row} («${m.name}»): חריגה מנומקת — ${m.exempt}`); continue; }
  if (m.desc) {
    const want = m.desc();
    if (cell.indexOf(want) >= 0) pass(`שורה ${m.row} («${m.name}»): התא «${cell}» תואם לנמדד («${want}»)`);
    else fail(`שורה ${m.row} («${m.name}»): התא אומר «${cell}» והקוד אומר «${want}»`);
    continue;
  }
  // ⚠️ «לא רלוונטי» אינו «❌ מנומס» — הוא נאכף כערך משלו, ורק בשורות
  //    שהאפליקציה הזו הכריזה עליהן כחסרות-מושג.
  if ((APP.naRows || []).indexOf(m.row) >= 0) {
    if (cell.indexOf(NA) >= 0) pass(`שורה ${m.row} («${m.name}»): «${NA}» כמוצהר`);
    else fail(`שורה ${m.row} («${m.name}»): מוצהרת «${NA}» בבלוק APP אך התא אומר «${cell}»`);
    continue;
  }
  if (cell.indexOf(NA) >= 0) {
    fail(`שורה ${m.row} («${m.name}»): התא אומר «${NA}» אך השורה אינה ברשימת ה-naRows של APP — ` +
         `«לא רלוונטי» חייב להיות החלטה רשומה, לא ברירת מחדל`);
    continue;
  }
  let exists;
  try {
    exists = m.app ? !!(APP.matrixProbe[m.row] && APP.matrixProbe[m.row]({ code, src, hasCode, cfgBlock, fnBody, hasPath, fileHas }))
                   : !!m.probe();
  } catch (e) { fail(`שורה ${m.row} («${m.name}»): ה-probe זרק — ${e.message}`); continue; }
  const declared = cell.indexOf('✅') >= 0;
  const denied = cell.indexOf('❌') >= 0;
  if (!declared && !denied) {
    fail(`שורה ${m.row} («${m.name}»): התא «${cell}» אינו ✅, אינו ❌ ואינו «${NA}»`);
  } else if (declared && !exists) {
    fail(`שורה ${m.row} («${m.name}»): מסומנת ✅ אך ה-probe אינו מוצא אותה בקוד`);
  } else if (denied && exists) {
    fail(`שורה ${m.row} («${m.name}»): מסומנת ❌ אך ה-probe **כן** מוצא אותה — ` +
         `טענת-חסר שגויה שולחת סבב עתידי לבנות מחדש משהו שכבר קיים`);
  } else {
    pass(`שורה ${m.row} («${m.name}»): «${cell}» תואם לקוד`);
  }
}

console.log(failures ? `\n❌ בדיקת היכולות המשותפות נכשלה (${failures})`
                     : '\n✅ בדיקת היכולות המשותפות עברה');
process.exit(failures ? 1 : 0);

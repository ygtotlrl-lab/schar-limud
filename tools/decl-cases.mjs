/* ───────────────────────────────────────────────────────────────────────────
   הצהרה מול מקריה — מודול משותף לשערים

   ⛔ מה נאכף: כל רשימת פטור בבלוק `APP` נמדדת מול המקרים שהופעלו בריצה —
      ⚠️ השער רושם כאן כל ערך שפטר אותו מממצא, ⭐ והמריץ מצליב את הרשומות
      מול ההצהרות: ⛔ ערך שלא פטר דבר הוא הצהרה בלי מקרה.
   ⚠️ הנימוק המדוד: הסרת כל ערך בכל רשימה ומדידת השער מצאה ערכים שהסרתם
      אינה מפילה דבר — ⛔ ורשימה שאיש אינו שואל מתי הופעלה נשארת לנצח.
   ⛔ מה יישבר בלעדיו: ערך שמקרהו נסגר ממשיך לפטור את המקרה הבא בשקט —
      ⚠️ רשימה מלאה נקראת כמדידה, ⭐ והיא הצהרה.
   ⭐ מה אינו נאכף כאן: המודול אינו מכריע — ⚠️ המריץ מכריע, ⛔ ושער
      ההצהרות נושא את המוטציות · ⚠️ ורשימה שמדידתה דורשת מסד שאינו בהישג
      יד מדווחת «לא נמדד» ⛔ ואינה נשפטת.
   ──────────────────────────────────────────────────────────────────────── */

/*  ⛔ שם רשימת פטור נגזר מסיומתו ⛔ ואינו רשימה — ⚠️ רשימה חדשה שנושאת את
 *  הסיומת נכנסת למדידה מעצמה, ⭐ ורשימה שנכתבת בלי מי שרושם את מקריה
 *  מפילה. ⚠️ **ומה נכנס**: פטור · החרגה · שמירה · יתום · פריט עודף ·
 *  היעדר · דילוג · תת-קבוצה; ⛔ **ומה אינו**: רשימה שמצהירה יכולת —
 *  ⭐ היא המדידה ⛔ ואינה פטור ממנה. */
export const EXEMPT_NAME = /^(?:[a-z][A-Za-z]*(?:Allow|Exempt|Keep|Orphans|NoReader|NoRule|NoRecord|NoFile|Extra|Absent|Skip)|skip[A-Z][A-Za-z]*|only|kvOnly|notGates|subsetTools|noteExtra)$/;

/*  ⛔ הרשומות לפי הקובץ שמצהיר ⛔ ולא לפי התהליך — ⚠️ בודק שמיובא בשער
 *  אחר רושם את מקריו מתוך התהליך הזר, ⭐ והמריץ מאחד. */
const REC = new Map();
let DUMPED = false;

/*  ⛔ ערך ונימוקו — ⚠️ אובייקט: המפתח והמחרוזת שמולו; ⭐ מערך: פריט שהוא
 *  מחרוזת הוא שם בלי נימוק, ⛔ ופריט שהוא מערך או אובייקט נושא את נימוקו
 *  במחרוזת הארוכה שבו. */
export function listValues(v) {
  const out = {};
  const why = (x) => (typeof x === 'string' ? x : '');
  const longest = (xs) => xs.map(why).sort((a, b) => b.length - a.length)[0] || '';
  if (Array.isArray(v)) {
    for (const it of v) {
      if (typeof it === 'string') out[it] = '';
      else if (Array.isArray(it)) out[String(it[0])] = longest(it.slice(1));
      else if (it && typeof it === 'object') {
        const ks = Object.keys(it);
        out[String(it[ks[0]])] = longest(ks.slice(1).map((k) => it[k]));
      }
    }
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) out[k] = why(x);
  }
  return out;
}

/*  ⛔ הנימוק אומר מה המקרה ⛔ ולא שהוא קיים — ⚠️ «חריגה מוצהרת» ו«זה
 *  בסדר» אינם נימוק, ⭐ ונימוק קצר מדי אינו אומר דבר. */
const BARE_WHY = /^(?:חריגה(?: מוצהרת| מוכרזת)?|זה בסדר|מוצהר|ok|todo)$/i;
export const whyOk = (w) => {
  const t = String(w || '').replace(/[⛔⚠️⭐*`]/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length >= 12 && !BARE_WHY.test(t);
};

/*  ⭐ נקודת הכניסה — ⚠️ מחזירה את הרושם של הקובץ: `CASE(list, name)`
 *  רושם שהערך פטר ממצא, ⛔ ומחזיר `true` כדי שיישב בתוך התנאי עצמו.
 *  ⚠️ **`on`** — מה שמכריע אם הריצה הזו נרשמת: ⛔ ריצה על מקור שעבר
 *  מוטציה אינה ראיה לעץ, ⭐ והבודק שרץ בתוך שער אחר מסמן אותה בעצמו. */
export function declCases(ownerUrl, APP, on = () => true) {
  const owner = String(ownerUrl).split('/').pop();
  if (!REC.has(owner)) {
    const lists = {};
    for (const [k, v] of Object.entries(APP || {}))
      if (EXEMPT_NAME.test(k)) {
        const vals = listValues(v);
        lists[k] = { vals: Object.keys(vals), bare: Object.keys(vals).filter((n) => !whyOk(vals[n])),
                     hits: new Set(), unmeasured: '' };
      }
    REC.set(owner, lists);
  }
  const lists = REC.get(owner);
  const CASE = (list, name) => {
    const x = lists[list];
    if (x && on()) x.hits.add(String(name));
    return true;
  };
  /*  ⛔ רשימה שמדידתה אינה בריצה הזו מוצהרת בנימוקה — ⚠️ מסד שאינו בהישג
   *  יד, או מדידה שרצה ברמה המלאה בלבד: ⭐ «לא נמדד» ⛔ ולא «מת». */
  CASE.unmeasured = (list, why) => { const x = lists[list]; if (x) x.unmeasured = String(why); };
  return CASE;
}

/*  ⭐ הדיווח — ⚠️ השער קורא לו ממאזין היציאה שלו, ⛔ ולא המודול מעצמו:
 *  ⚠️ מודול שנרשם ליציאה מריץ את עצמו, ⭐ והשער הוא מי שמריץ. ⛔ ופעם אחת
 *  לתהליך — ⚠️ שער שמייבא בודק רושם גם את רשומותיו. */
export function dumpCases() {
  if (DUMPED) return;
  DUMPED = true;
  for (const [o, lists] of REC) {
    const out = {};
    for (const [k, x] of Object.entries(lists)) out[k] = { ...x, hits: [...x.hits] };
    console.log('[decl-cases] ' + JSON.stringify({ owner: o, root: process.cwd(), lists: out }));
  }
}

/*  ⭐ ההצלבה עצמה — ⚠️ **מה נכנס**: שורות `[decl-cases]` מהריצה, שורש
 *  העץ, ⛔ ומפת הקבצים ⟵ מקורם; ⛔ **ומה מפיל**: ערך בלי מקרה · ערך בלי
 *  נימוק · רשימה בלי אתר רישום · ורשימה בקובץ שלא דיווח כלל.
 *  ⚠️ **ורשומה משורש אחר אינה נספרת** — ⛔ עותק שעבר מוטציה אינו העץ. */
export function caseGaps(lines, files, root) {
  const agg = {};
  for (const l of lines) {
    let r; try { r = JSON.parse(l.replace(/^.*?\[decl-cases\] /, '')); } catch (e) { continue; }
    if (root && r.root !== root) continue;
    const o = (agg[r.owner] ??= {});
    for (const [k, x] of Object.entries(r.lists)) {
      const a = (o[k] ??= { vals: x.vals, bare: x.bare, hits: new Set(), unmeasured: '' });
      for (const h of x.hits) a.hits.add(h);
      if (x.unmeasured) a.unmeasured = x.unmeasured;
    }
  }
  const dead = [], bare = [], unprobed = [], unwired = [], unmeasured = [];
  let lists = 0, vals = 0;
  for (const [f, src] of Object.entries(files)) {
    const names = appListNames(src);
    if (!names.length) continue;
    if (!agg[f]) { unwired.push(`${f} (${names.join(', ')})`); continue; }
    for (const k of names) {
      const a = agg[f][k];
      if (!a) { unwired.push(`${f}::${k}`); continue; }
      lists++; vals += a.vals.length;
      for (const v of a.bare) bare.push(`${f}::${k}::${v}`);
      if (a.unmeasured) { if (a.vals.length) unmeasured.push(`${f}::${k} — ${a.unmeasured}`); continue; }
      if (a.vals.length && !new RegExp(`\\bCASE\\(\\s*['"]${k}['"]`).test(src)) unprobed.push(`${f}::${k}`);
      for (const v of a.vals) if (!a.hits.has(v)) dead.push(`${f}::${k}::${v}`);
    }
  }
  return { dead, bare, unprobed, unwired, unmeasured, lists, vals };
}

/*  ⛔ שמות הרשימות נקראים מבלוק ה-`APP` שבטקסט — ⚠️ מפתח ברמה העליונה של
 *  הבלוק, ⭐ שהזחתו שני רווחים: ⛔ והשם עובר בסיומת. */
export function appListNames(src) {
  const i = src.indexOf('/* ── APP —');
  if (i < 0) return [];
  const j = src.indexOf('/* ── סוף APP', i);
  const b = src.slice(i, j < 0 ? src.length : j);
  return [...new Set([...b.matchAll(/^ {2}([A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1]))]
    .filter((k) => EXEMPT_NAME.test(k));
}

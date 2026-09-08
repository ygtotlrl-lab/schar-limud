#!/usr/bin/env node
/*  roles-harness.mjs — רתמת מודל ההרשאות, משותפת לשלוש האפליקציות.
 *
 *  **מה נאכף:** ארבע האינווריאנטות של מודל ההרשאות, כפונקציות טהורות:
 *  (1) ⛔ ההשוואה היא ל-`admin` **בדיוק**, בעשרה מצבים; (2) שתי הודעות החסימה נבדלות; (3) ⛔ סוד שער שיצא משימוש אינו
 *  יושב באף מפתח אחסון; (4) ⛔ אף מסלול אינו משווה סיסמה מול שם תפקיד.
 *
 *  **הנימוק המדוד:** אותן ארבע טענות נכתבו כשער בן 550 שורות באפליקציה
 *  אחת — ⛔ ושכפולן לשתי האחיות היה שלוש רתמות שנסחפות זו מזו.
 *
 *  **מה יישבר בלעדיו:** ⛔ שער שנכתב מחדש בכל אפליקציה מודד ארבע טענות
 *  בארבע צורות, ⚠️ ותיקון באחת משאיר את השתיים סותרות אותה.
 *
 *  **מה אינו נאכף כאן:** ⛔ שמות הפונקציות והמסכים — ⚠️ הם נבדלים בין
 *  האפליקציות, ⭐ והשער שקורא לרתמה מוסר אותם.
 *
 *  ⛔ **אין בקובץ הזה בלוק `APP`** — ⚠️ הוא תשתית טהורה, ⭐ וגופו מושווה
 *  בית-לבית בין הריפו.
 */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית — ⚠️ הצהרה ריקה ולא היעדר:
 *  ⛔ מודול בלי הצהרה אינו נבדל ממודול שההצהרה שלו נשמטה. */
export const ROWS = [];

/* ── דיווח ─────────────────────────────────────────────────────────────── */
export function reporter() {
  const st = { pass: 0, fail: 0 };
  const ok = (name, cond, extra) => {
    if (cond) { st.pass++; console.log('  ✅ ' + name); }
    else { st.fail++; console.error('  ❌ ' + name + (extra ? '  →  ' + extra : '')); }
    return !!cond;
  };
  const eq = (name, got, want) =>
    ok(name, got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  const sect = (t) => console.log('\n▶ ' + t);
  const summary = (title) => {
    console.log('\n' + (st.fail ? '❌' : '✅') + `  ${title}: ${st.pass} עברו, ${st.fail} נכשלו\n`);
    return st.fail;
  };
  return { st, ok, eq, sect, summary };
}

/* ── חילוץ מהמקור האמיתי ───────────────────────────────────────────────── */
/*  ⛔ נכשל **ברעש** אם השם נעלם — ⚠️ שינוי שם בקוד אינו עובר כאן בשקט
 *  כ«אפס בדיקות». */
export function extract(SRC) {
  const fn = (name) => {
    let at = SRC.indexOf('\nfunction ' + name + '(');
    if (at < 0) at = SRC.indexOf('\nasync function ' + name + '(');
    if (at < 0) throw new Error('לא נמצאה הפונקציה ' + name);
    let depth = 0, j = SRC.indexOf('{', at);
    for (; j < SRC.length; j++) {
      if (SRC[j] === '{') depth++;
      else if (SRC[j] === '}') { depth--; if (!depth) break; }
    }
    return SRC.slice(at + 1, j + 1);
  };
  const decl = (name) => {
    const m = new RegExp('^var ' + name + '\\s*=', 'm').exec(SRC);
    if (!m) throw new Error('לא נמצאה ההצהרה ' + name);
    let depth = 0;
    for (let j = m.index; j < SRC.length; j++) {
      const c = SRC[j];
      if ('{(['.includes(c)) depth++;
      else if ('})]'.includes(c)) depth--;
      else if (c === ';' && depth === 0) return SRC.slice(m.index, j + 1);
    }
    throw new Error('הצהרה לא נסגרה: ' + name);
  };
  const hasFn = (name) =>
    SRC.indexOf('\nfunction ' + name + '(') >= 0 || SRC.indexOf('\nasync function ' + name + '(') >= 0;
  return { fn, decl, body: fn, hasFn };
}

/* ── האינווריאנטות ─────────────────────────────────────────────────────── */
/*  1. ⛔ **ההשוואה היא ל-`admin` בדיוק** — ⚠️ תפקיד שהוקלד בטעות, עמודה
 *  ריקה או משתמש חסר **שוללים** הרשאה ⛔ ולעולם אינם מעניקים אותה:
 *  ⭐ נפילה-חזרה לשם התפקיד הייתה שער שנפתח לכל מקליד. */
export function adminGaps(isAdminOf) {
  const out = [];
  const say = (u) => { try { return isAdminOf(u); } catch (e) { return 'threw:' + e.message; } };
  const cases = [
    ['admin', { role: 'admin' }, true],
    ['manager', { role: 'manager' }, false],
    ['junior', { role: 'junior' }, false],
    ['אות גדולה', { role: 'Admin' }, false],
    ['רווח מוביל', { role: ' admin' }, false],
    ['תפקיד ריק', { role: '' }, false],
    ['בלי תפקיד', { username: 'x' }, false],
    ['תפקיד null', { role: null }, false],
    ['בלי משתמש', null, false],
    ['undefined', undefined, false],
  ];
  for (const [label, user, want] of cases) {
    const got = say(user);
    if (got !== want) out.push(label + ': נמדד «' + got + '» והצפוי «' + want + '»');
  }
  return out;
}

/*  2. שתי הודעות החסימה — ⛔ ואיחודן שולח מנהל שחסרה לו עמודה לחפש באג
 *  במקום מיגרציה. ⚠️ אפליקציה שאין בה מצב «עמודה חסרה» מוסרת מערך ריק. */
export function messageGaps(msgs) {
  const out = [];
  if (!msgs.length) return out;
  msgs.forEach((m, i) => { if (!String(m || '').trim()) out.push('הודעה ריקה במקום ' + i); });
  if (new Set(msgs).size !== msgs.length) out.push('שתי הודעות החסימה זהות');
  return out;
}

/*  3. ⛔ סוד שער שיצא משימוש — ⚠️ לא במפתח אחסון ולא בערך שבתוכו. */
export function residueGaps(store, names) {
  const out = [];
  for (const n of names || []) {
    for (const k of Object.keys(store)) {
      if (k.indexOf(n) >= 0) out.push('מפתח שריד באחסון: ' + k);
      else if (String(store[k]).indexOf(n) >= 0) out.push('ערך שריד ב-' + k + ': ' + n);
    }
  }
  return out;
}

/*  4. ⛔ אף מסלול אינו משווה **סיסמה** מול שם תפקיד — ⚠️ נפילה-חזרה
 *  לשם התפקיד הייתה שער שנפתח לכל מקליד בהתקנה טרייה. */
export function rolePasswordGaps(code, roles) {
  const out = [];
  const names = (roles || []).map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (!names) return out;
  const re = new RegExp('(?:pass\\w*|secret)\\s*(?:===|!==|==|!=)\\s*[\'"](?:' + names + ')[\'"]', 'gi');
  let m;
  while ((m = re.exec(code)) !== null)
    out.push('השוואת סיסמה מול שם תפקיד, תו ' + m.index + ': ' + m[0]);
  return out;
}

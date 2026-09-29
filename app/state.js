// app/state.js — המצב המשותף בין המודולים

// מצב שמודולים שונים כותבים — אובייקט אחד, כי קישור מיובא אינו ניתן להשמה.
const S = {
  // הלקוח נבנה ב-main בעלייה — כל מודול מגיע אליו מכאן.
  SB: null,
  STUDENTS: [],
  TRANSACTIONS: [],
  SETTINGS: {},
  LISTS: {},
  // המשתמש המחובר אינו משתנה כאן — הוא בזיכרון בלבד, והגישה אליו ב-sessGet/sessSet
  DASH_YEAR: null,
  SC_STUDENT_ID: null,
  SC_YEAR: null,
  // _slLastSeenOk היא חותמת תצוגה בלבד — ושתיהן מתקדמות גם במשיכה, ולכן אינן עֵד פינוי
  _slSeenTs: 0,
  _slLastSeenOk: 0,
  // ההקשר נלכד לפני ההמתנה — mark רץ אחרי await, וקריאת הגלובלי הייתה זוקפת את ההצלחה למשתמש אחר.
  _slPushEp: 0,
  _slLastPullOk: 0,
  // שומר חפיפה — ברשת איטית קריאה חדשה נוחתת לפני שהקודמת חזרה
  // משוחרר ב-finally ולא בסוף ה-try — דגל שנשאר דלוק אחרי כשל מקפיא את הסנכרון לתמיד
  _syncBusy: false,
  _syncWarned: false,
  _lastSyncOk: false,
  _slPullLogged: false,
  // הזריעה מהאפליקציה ולא מקובץ הסכימה — כדי שהסעיף יופיע בלי הרצת SQL ידנית.
  // _lastSyncOk מונע הסקת «הפריט חסר» מסנכרון שנכשל.
  _creditSeedDone: false
};

// ── מה שמסך צריך מ-main ──
// main רושם כאן בעלייה — מודול שמייבא מ-main סוגר מעגל, והרישום הוא הכיוון האחד.
const shell = { refreshUI: null };

export { S, shell };

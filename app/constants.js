// app/constants.js — הנתונים: שמות הטבלאות, המחרוזות והקבועים
import { appConfigure } from '../core/util.js';

// ── מסירת התצורה ──
// כאן הנתונים שהליבה קוראת, והחיווט — ב-main.js; הקובץ הזה נטען ראשון, לפני כל קריאה לליבה.
// העידן עולה בשינוי צורת רשומה או מפתחה, ושינוי שם טבלה הוא שינוי כזה — המראה ממופתחת בשם.
// עותק בעידן ישן אינו נדחף — הממתין בו נרשם ביומן, והוא נזרק ונמשך מלא.
var DATA_ERA = 9;

appConfigure({ DATA_ERA: DATA_ERA });

// ── הודעות פר-אפליקציה ──
var MSG_LOAD_FAIL_POST = ') — המוצג הוא העותק שבמכשיר';

var MSG_PICK_STUDENT_PLAIN = 'נא לבחור תלמיד';
var TXN_FILTER_ALL = 'כולם';

var MSG_PICK_DATE = 'נא לבחור תאריך';

var MSG_NEED_AMOUNT = 'נא להזין סכום תקין';

var MSG_PAY_SAVE_FAIL = 'השמירה במכשיר נכשלה — התשלום לא נשמר';

var MSG_PAY_MISSING = 'התשלום לא נמצא';

var MSG_DEL_NOT_SAVED = 'המחיקה לא נשמרה במכשיר';

var MSG_PAY_DELETED = 'תשלום נמחק';
var MSG_PAY_EDITED = 'התשלום עודכן';

var MSG_CHANGE_NOT_SAVED = 'השינוי לא נשמר במכשיר';





var MSG_END_BEFORE_START = 'חודש העזיבה מוקדם מחודש ההצטרפות';

var MSG_PERIOD_OVERLAP = 'התקופה חופפת לתקופה אחרת של התלמיד';

var MSG_PERIOD_NONE = 'לתלמיד נדרשת תקופת פעילות אחת לפחות';

var MSG_PERIOD_OPEN_LAST = 'תקופה פתוחה — רק האחרונה; לתקופה שלפני אחרת נדרש חודש עזיבה';

var MSG_NAME_REQUIRED = 'שם חובה';

var MSG_STUDENT_MISSING2 = 'התלמיד לא נמצא';

var MSG_TUITION_POSITIVE = 'שכר לימוד חייב להיות מספר חיובי';

// שכר לתקופה — הודעות העורך שבהגדרות התלמיד
var MSG_TP_END_BEFORE = 'בשכר לתקופה — חודש הסוף מוקדם מחודש ההתחלה';
var MSG_TP_AMOUNT = 'בשכר לתקופה — הסכום חייב להיות מספר חיובי';

// הסבר הטבעות — כרטיס לכל בסיס: קודם הכלל, ובסוף ההבדל בין שלוש הטבעות; הנוסח זהה בשני הכרטיסים מילה במילה, חוץ מהבסיס שבשורת «החובה» — והוא מודגש.
// ההסבר של כל כרטיס — חזותי: למעלה הכלל (החובה · התשלומים), זהה בשני הכרטיסים חוץ מהבסיס — המודגש; ומתחת שלוש עמודות, אחת לכל טבעת.
var KPI_INFO = {
  students: { t: 'לפי התלמידים', basis: 'שכר ברירת המחדל של השיעור', ico: 'settings' },
  due: { t: 'לפי החובה', basis: 'השכר שבכרטיס', ico: 'student' }
};
var KPI_GEN = {
  due: ['החובה', ' של כל תלמיד פעיל', 'יתרת חובה שעברה משנה קודמת', 'יתרת חובה שעברה לשנה הבאה'],
  pay: ['התשלומים', 'כלל התנועות שנרשמו', 'יתרת זכות שעברה משנה קודמת', 'יתרת זכות שעברה לשנה הבאה'],
  ahead: 'נרשם מראש',
  note: 'עודף של תלמיד אחד מכסה על חוב של אחר, ולכן האחוז יכול לעבור את 100 · באוגוסט שלוש הטבעות שוות.'
};
// לכל טבעת — עד היכן החובה ועד היכן התשלומים, על ציר השנה (now — עד היום, all — כל השנה), ושורה קצרה מתחת.
var KPI_COLS = [
  { t: 'חודש נוכחי', due: 'now', pay: 'now', dueL: 'עד סוף החודש', payL: 'עד היום, עד גובה החובה', note: 'עודף מעבר לשנה כולה — בחלקי החודשים שחלפו' },
  { t: 'סליקה בפועל', due: 'now', pay: 'all', dueL: 'עד סוף החודש', payL: 'כל מה שנרשם לשנה', note: 'גם תשלום מראש וצ׳קים לחודשים הבאים' },
  { t: 'תחזית שנתית', due: 'all', pay: 'all', dueL: 'כל השנה', payL: 'כל מה שנרשם לשנה', note: 'כמה מהשנה כולה כבר מכוסה' }
];
var KPI_TODAY = 'היום';
// יעד ההנחה בכרטיסים — 10% משכר ברירת המחדל: מתחתיו אדום, ומ-10% ומעלה ירוק.
var DISCOUNT_GOAL = 10;
// רשימת ההנחות — בלחיצה על הקובייה: תלמיד, ההנחה השנתית ואחוזה, ופירוט לכל תקופה בשכר אחר.
var DISC_TITLE = 'הנחות השנה';
var DISC_NONE = 'אין הנחות השנה';
var DISC_INSTEAD = 'במקום';
var DISC_TOTAL = 'סה״כ הנחות';
// שיתוף כתמונה — כמו בגיוס (app/snap.js): כרטיס התלמיד ורשימת ההנחות.
var MSG_IMG_PREP = 'מכין תמונה...';
var MSG_IMG_OFFLINE = 'יצירת התמונה לא זמינה — נדרש חיבור לאינטרנט פעם אחת';
var MSG_IMG_FAIL = 'יצירת התמונה נכשלה — נסה שוב';
var SNAP_SHARE = 'שיתוף';
var SNAP_APP = 'שכר לימוד';
var SNAP_CARD = 'כרטיס';
// פיצול התמונות — כרטיס: מצב השנה, ואחריו התשלומים עד 15 בתמונה; רשימת ההנחות — עד 30 תלמידים בתמונה.
var SNAP_YEAR = 'מצב השנה';
var SNAP_TXNS = 'תשלומים';
var SNAP_TXN_MAX = 15;
var SNAP_DISC_MAX = 30;
var SNAP_PARTS = 'שיתוף בחלקים';
var SNAP_PART = 'חלק';
var SNAP_OF = 'מתוך';
var SNAP_DONE = 'שותף';


var MSG_SETTINGS_NOT_SAVED = 'ההגדרות לא נשמרו במכשיר';

var MSG_VALUE_BAD = 'ערך לא תקין';

var MSG_VALUE_SAVE_FAIL = 'השמירה במכשיר נכשלה — הערך לא נשמר';

var MSG_VALUE_EXISTS = 'הערך כבר קיים ברשימה';

var MSG_ITEM_SAVE_FAIL = 'השמירה במכשיר נכשלה — הפריט לא נוסף';

var MSG_CREDIT_ITEM_LOCKED = '» הוא סעיף מערכת ואינו נמחק — בלעדיו אי אפשר לרשום יתרת זכות שעברה משנה קודמת';
var MSG_DEBT_ITEM_LOCKED = '» הוא סעיף מערכת ואינו נמחק — בלעדיו אי אפשר לרשום יתרת חובה שעברה משנה קודמת';

var MSG_ITEM_MISSING = 'הפריט לא נמצא';

var MSG_DELETED_OK = 'נמחק';

var MSG_ADD_STUDENT = 'הוספת תלמיד';
var MSG_ADD_METHOD = 'הוספת אמצעי תשלום';
var MSG_METHOD_LABEL = 'שם האמצעי';
var MSG_VALUE_REQUIRED = 'יש להזין ערך';
var MSG_STUDENTS_MANAGE = 'ניהול תלמידים';
var MSG_YEAR_ROLL_TITLE = 'מעבר שנתי';
var MSG_STUDENTS_UPDATED = ' תלמידים עודכנו';

var MSG_STUDENT_SAVE_FAIL = 'השמירה במכשיר נכשלה — התלמיד לא נשמר';

var MSG_STUDENT_DELETED = 'תלמיד נמחק';

var MSG_CONFIRM = 'אישור';

var MSG_DEL_TXN_TITLE = 'מחיקת תשלום';

var MSG_DEL_TXN_BODY = 'למחוק תשלום זה?';

var MSG_DEL_ITEM_TITLE = 'מחיקת פריט';

var MSG_DEL_ITEM_BODY = 'למחוק פריט זה?';

var MSG_DEL_STUDENT_TITLE = 'מחיקת תלמיד';

var MSG_DEL_STUDENT_PRE = 'למחוק את ';

var MSG_DEL_STUDENT_ANON = 'תלמיד';

var MSG_DEL_STUDENT_POST = '? התלמיד יוסר מהרשימות; רשומות התשלומים שלו יישמרו במערכת.';

// ── עמידות אחסון מקומי ──
var KV_TABLE = 'sl_settings';

// ── PUSH_CFG ──
// סדר הטבלאות שומר על המפתח הזר — תלמידים לפני תנועות
var PUSH_TABLES = ['sl_students', 'sl_transactions', KV_TABLE, 'sl_lookups'];

// סוג הרשימה ב-sl_lookups — אמצעי תשלום.
var LK_METHOD = 'method';

// השיעור — קבוע, כמו בהנהלה: הסדר א׳ ⟵ ב׳ ⟵ ג׳ ⟵ השלוחים ⟵ השלמת חוב בוגרים, והמחזור — שנת הסיום: ג׳ שנת הלימודים, ב׳ הבאה, א׳ שלאחריה.
var CLS_LIST = ['a', 'b', 'g', 's', 'd'];
var CLS_NAME = { a: 'שיעור א׳', b: 'שיעור ב׳', g: 'שיעור ג׳', s: 'התלמידים השלוחים', d: 'השלמת חוב בוגרים' };
// השיעורים שנבחרים בהוספה ובכרטיס — «השלמת חוב בוגרים» הוא כרטיס אחד, ואינו שיעור של תלמיד.
var CLS_PICK = ['a', 'b', 'g', 's'];
// השלוחים והבוגרים — בלי מחזור ובלי מעבר שנתי.
var CLS_NO_CYCLE = { s: true, d: true };
// שכר ברירת המחדל לפי שיעור — מפתח ב-sl_settings; שיעור שאינו כאן — default_tuition.
var CLS_TUITION_KEY = { s: 'default_tuition_s' };
// בלי שכר חודשי — התשלומים נכנסים לנגבה ולא ליעד, ואינם תלמיד ב«פעילים».
var CLS_NO_TUITION = { d: true };
var CLS_CYCLE_ADD = { g: 0, b: 1, a: 2 };
var MSG_YEAR_UNSET = 'שנת הלימודים לא נקבעה — המעבר השנתי אינו זמין';
var MSG_YEAR_ROLL_DONE = 'מעבר שנתי הושלם — ';
var MSG_CLS_REQUIRED = 'יש לבחור שיעור';

var YEAR_MONTHS=[8,9,10,11,0,1,2,3,4,5,6,7];

// יתרת זכות אינה חוב שלילי ואינה מקוזזת; זיכוי מיתרה מקטין חוב אך אינו כסף שהתקבל
// הסיווג לפי המחרוזת שעל התנועה ולא לפי קיום הפריט ברשימה — מחיקת הפריט אינה משנה סיווג היסטורי
var CREDIT_METHOD='יתרת זכות שעברה משנה קודמת';
// המראה של הזיכוי — חוב שעבר משנה קודמת: תנועה שמוסיפה לחובה ואינה כסף שהתקבל; סעיף מערכת באדום, ונרשם כמו הזיכוי (בדרך כלל ב-1.9).
var DEBT_METHOD='יתרת חובה שעברה משנה קודמת';
// השמות הקודמים של שני הסעיפים — נקראים כמותם, לתנועה שנרשמה במכשיר שטרם התעדכן.
var CREDIT_METHOD_OLD='זוכה על חשבון יתרת זכות';
var DEBT_METHOD_OLD='חוב שעבר משנה קודמת';
// ארבע השורות של היתרות שעברו — בכרטיס, באותו נוסח כמו בהסבר שבלוח הבקרה; ובסוף שנה שנגמרה — היתרה שנשארה.
var BAL_CREDIT_IN=CREDIT_METHOD;
var BAL_DEBT_IN=DEBT_METHOD;
var BAL_DEBT_OUT='יתרת חובה שעברה לשנה הבאה';
var BAL_CREDIT_OUT='יתרת זכות שעברה לשנה הבאה';
var BAL_CREDIT='יתרת זכות';
var BAL_DEBT='יתרת חובה';
var BAL_SPREAD='נפרס על החודשים';
var BAL_MOVED='עבר לשנה הבאה';
// ההערה שמתחת לרשת — מראה זו של זו, מילה במילה, חוץ מהפועל.
var HINT_CREDIT='התנועה תקטין את חוב התלמיד בשנה זו';
var HINT_DEBT='התנועה תוסיף לחוב התלמיד בשנה זו';
var HINT_NOT_INCOME='ו<b>לא תיספר כגבייה או כהכנסה</b> בלוח הבקרה.';

// מפתחות שאסור להם להגיע לאחסון המקומי; נאכפת במשיכה, בכתיבה המקומית ובשער הדיסק
// סוד חדש נכנס לרשימה הזו ולא למנגנון חדש
var SL_NEVER_MIRROR_SETTINGS = [];


// כותרות החלונות והודעות השמירה — מחרוזת למשתמש היא קבוע.
var TTL_TXN_EDIT = 'עריכת תשלום — ';
var MSG_STUDENT_ADDED = 'תלמיד נוסף';
var MSG_TXN_SAVED = 'תשלום נשמר';

export { MSG_ADD_METHOD, MSG_METHOD_LABEL, MSG_STUDENTS_MANAGE, MSG_STUDENTS_UPDATED, MSG_VALUE_REQUIRED, MSG_YEAR_ROLL_TITLE, CLS_CYCLE_ADD, CLS_LIST, CLS_NO_CYCLE, CLS_NO_TUITION, CLS_NAME, CLS_PICK, CLS_TUITION_KEY, CREDIT_METHOD, DEBT_METHOD, CREDIT_METHOD_OLD, DEBT_METHOD_OLD, BAL_CREDIT_IN, BAL_DEBT_IN, BAL_DEBT_OUT, BAL_CREDIT_OUT, BAL_CREDIT, BAL_DEBT, BAL_SPREAD, BAL_MOVED, HINT_CREDIT, HINT_DEBT, HINT_NOT_INCOME, MSG_DEBT_ITEM_LOCKED, KV_TABLE, LK_METHOD, MSG_CLS_REQUIRED, MSG_YEAR_ROLL_DONE, MSG_YEAR_UNSET, MSG_ADD_STUDENT, MSG_CHANGE_NOT_SAVED,
         MSG_CONFIRM, MSG_CREDIT_ITEM_LOCKED, MSG_DELETED_OK,
         MSG_DEL_ITEM_BODY, MSG_DEL_ITEM_TITLE, MSG_DEL_NOT_SAVED, MSG_DEL_STUDENT_ANON,
         MSG_DEL_STUDENT_POST, MSG_DEL_STUDENT_PRE, MSG_DEL_STUDENT_TITLE,
         MSG_DEL_TXN_BODY, MSG_DEL_TXN_TITLE, MSG_END_BEFORE_START, 
         MSG_ITEM_MISSING, MSG_ITEM_SAVE_FAIL, MSG_LOAD_FAIL_POST, MSG_NAME_REQUIRED,
         MSG_NEED_AMOUNT, MSG_PAY_DELETED, MSG_PAY_EDITED, MSG_PAY_MISSING,
         MSG_PAY_SAVE_FAIL, MSG_PERIOD_NONE, MSG_PERIOD_OPEN_LAST, MSG_PERIOD_OVERLAP, MSG_PICK_DATE, MSG_PICK_STUDENT_PLAIN, MSG_SETTINGS_NOT_SAVED,
         MSG_STUDENT_DELETED, MSG_STUDENT_MISSING2,
         MSG_STUDENT_SAVE_FAIL, MSG_TUITION_POSITIVE, MSG_TP_END_BEFORE, MSG_TP_AMOUNT, KPI_INFO, KPI_GEN, KPI_COLS, KPI_TODAY, DISCOUNT_GOAL, DISC_TITLE, DISC_NONE, DISC_INSTEAD, DISC_TOTAL, MSG_IMG_PREP, MSG_IMG_OFFLINE, MSG_IMG_FAIL, SNAP_SHARE, SNAP_APP, SNAP_CARD, SNAP_YEAR, SNAP_TXNS, SNAP_TXN_MAX, SNAP_DISC_MAX, SNAP_PARTS, SNAP_PART, SNAP_OF, SNAP_DONE,
         MSG_VALUE_BAD, MSG_VALUE_EXISTS, MSG_VALUE_SAVE_FAIL, PUSH_TABLES,
         SL_NEVER_MIRROR_SETTINGS, TXN_FILTER_ALL, YEAR_MONTHS,
         TTL_TXN_EDIT, MSG_STUDENT_ADDED, MSG_TXN_SAVED };

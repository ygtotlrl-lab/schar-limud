#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
מסנכרן את עותק-הגיבוי המוטבע של סכימת ה-SQL ב-index.html מול מקור האמת
migrations/000_initial_schema.sql.

למה זה קיים: הסכימה ישבה בשלושה עותקים לא מסונכרנים (index.html,
supabase-setup.sql, migrations/), ושניים מהם הפכו מיושנים בשקט — התקנה
טרייה לפי מסך האפליקציה לא יכלה לשמור או למחוק תשלום. עכשיו יש מקור אמת
אחד; האפליקציה מושכת אותו ב-fetch, והעותק המוטבע הוא גיבוי בלבד לשעה
שה-fetch נכשל. הסקריפט הזה מוודא שהגיבוי לא נפרד מהמקור.

שימוש:
    python3 tools/sync-setup-sql.py            # מייצר/מעדכן את העותק המוטבע
    python3 tools/sync-setup-sql.py --check    # אימות בלבד; יוצא 1 אם נפרדו
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL_PATH = os.path.join(ROOT, 'migrations', '000_initial_schema.sql')
HTML_PATH = os.path.join(ROOT, 'index.html')

BEGIN = '// >>> BEGIN GENERATED SQL FALLBACK — נוצר מ-migrations/000_initial_schema.sql, לא לערוך ביד'
END = '// <<< END GENERATED SQL FALLBACK'


def js_template_literal(text):
    """עוטף טקסט כ-template literal בטוח (backslash / backtick / ${)."""
    out = text.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    return '`' + out + '`'


def build_block(sql_text):
    return (BEGIN + '\n'
            + 'var SETUP_SQL_FALLBACK = ' + js_template_literal(sql_text) + ';\n'
            + END)


def main():
    check = '--check' in sys.argv

    with io.open(SQL_PATH, encoding='utf-8') as f:
        sql_text = f.read()
    with io.open(HTML_PATH, encoding='utf-8') as f:
        html = f.read()

    pattern = re.compile(re.escape(BEGIN) + r'.*?' + re.escape(END), re.DOTALL)
    if not pattern.search(html):
        sys.stderr.write('שגיאה: סמני הבלוק המיוצר לא נמצאו ב-index.html\n')
        return 2

    wanted = build_block(sql_text)
    updated = pattern.sub(lambda m: wanted, html, count=1)

    if updated == html:
        print('✅ העותק המוטבע ב-index.html זהה ל-migrations/000_initial_schema.sql')
        return 0

    if check:
        sys.stderr.write(
            '❌ העותק המוטבע ב-index.html נפרד מ-migrations/000_initial_schema.sql.\n'
            '   הרץ: python3 tools/sync-setup-sql.py\n')
        return 1

    with io.open(HTML_PATH, 'w', encoding='utf-8') as f:
        f.write(updated)
    print('✏️  העותק המוטבע ב-index.html עודכן ממקור האמת')
    return 0


if __name__ == '__main__':
    sys.exit(main())

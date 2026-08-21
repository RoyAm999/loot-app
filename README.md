# TreasureRadar IL

אפליקציית Web פרטית ומותאמת לנייד למציאות, אוסף ופליפים: Pokémon, Hot Wheels, LEGO, משחקי קופסה, גיימינג, מצלמות, שעונים, וינטג׳ ועוד.

## Production

**https://treasure-radar-il.vercel.app**

## מה עובד

- התחברות והרשמה דרך Supabase Auth.
- מצב אורח לניתוח מהיר ללא שמירה בענן.
- Radar Feed להתראות על restock, ירידות חריגות ומועמדות לטעות מחיר.
- מנתח עסקה עם עלות מלאה, רווח צפוי, ROI, פער מהשוק ומחיר הצעה מקסימלי.
- החלטות `PASS / RESEARCH / WATCH / BUY / JACKPOT`.
- כספת `KEEP / SELL / SOLD` ורווח ממומש.
- ניהול מקורות וסריקה ידנית מהטלפון.
- ייבוא נתוני מוצר מקישור דרך Supabase Edge Function.
- Realtime בין המכשירים.

## Backend

המערכת משתמשת בפרויקט Supabase עם RLS לכל משתמש, Storage פרטי לתמונות, Edge Functions לסריקה ולקריאת עמוד מוצר, ו־Cron שמפעיל את מנוע הסריקה כל 30 שניות.

אתרים שמבוססים על JavaScript כבד או דורשים התחברות, כגון Facebook Marketplace, מסומנים כידניים. אין טענה לסריקה אוטומטית שלהם בלי browser session מורשה.

## Hosting

גרסת production נפרסת ב־Vercel תחת הפרויקט `treasure-radar-il`.
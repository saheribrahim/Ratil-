Ratil · رتّل  —  project files
================================
index.html        الصفحة (HTML) — افتحها في Chrome أو ارفع المجلد كله على Netlify
css/style.css     التصميم
js/data.js        السور الأربع المضمّنة + أسماء السور + قائمة الروايات
js/core.js        الدوال الأساسية: عرض النص، الميكروفون، البدء والإيقاف
js/library.js     قوائم الرواية والسورة، الاستيراد، تحميل الروايات من Quranpedia
js/tajweed.js     ألوان التجويد
js/recognition.js مقارنة تلاوتك بالنص (التعرف)
js/memorization.js وضع الحفظ
js/audio.js       صوت الكلمة والآية
js/auth.js        تسجيل الدخول + رسالة الترحيب (عدّل CFG في أول الملف)
js/main.js        تشغيل التطبيق

الترتيب في index.html مهم: لا تغيّر ترتيب ملفات <script>.
Keep the folder structure as is (css/ and js/ next to index.html).
For hosting: upload this whole folder (Netlify Drop / GitHub Pages).

# ☕ القهوجي — Al-Gahwagy

تطبيق ويب مجاني بالكامل (PWA) لبيع البن مباشرة من المصنع للعملاء والتجار، بواجهة عربية (RTL) وهوية بصرية بألوان البن.

## المحتويات
- `index.html` — المتجر (تصفح، بحث، فلترة، سلة، طلب، مفضلة، تقييم)
- `login.html` — تسجيل الدخول وإنشاء حساب (عميل / تاجر)
- `orders.html` — سجل الطلبات وكشف الحساب المبسط
- `admin.html` + `js/admin.js` — لوحة المدير الكاملة
- `merchant.html` + `js/merchant.js` — لوحة التاجر
- `about.html`, `contact.html` — صفحات ثابتة
- `manifest.json`, `service-worker.js`, `offline.html`, `icons/` — إعدادات PWA
- `firestore.rules` — قواعد أمان قاعدة البيانات

## 1) إعداد Firebase (مجاني بالكامل — خطة Spark)
1. اذهب إلى https://console.firebase.google.com وأنشئ مشروعاً جديداً.
2. من القائمة الجانبية: **Build → Authentication → Get Started**، وفعّل مزود **Email/Password**.
3. من القائمة الجانبية: **Build → Firestore Database → Create database**، اختر وضع **Production**، ثم اختر أقرب موقع خادم لك.
4. من إعدادات المشروع (⚙️ → Project settings) في تبويب **General**، انزل إلى "Your apps"، اضغط أيقونة `</>` لإضافة تطبيق ويب، وانسخ كائن `firebaseConfig`.
5. الصق القيم داخل `js/firebase-config.js` مكان `ضع_..._هنا`.
6. من تبويب **Firestore Database → Rules**، الصق محتوى ملف `firestore.rules` المرفق واضغط **Publish**.

## 2) إنشاء أول حساب مدير (Admin)
لا توجد شاشة تسجيل خاصة بالمدير لأسباب أمنية. الطريقة:
1. سجّل حساباً عادياً كـ"عميل" من `login.html`.
2. افتح **Firestore Database → Data** في لوحة Firebase، وابحث عن مستند المستخدم في مجموعة `users` (معرّفه هو نفس الـ UID الظاهر في Authentication).
3. غيّر الحقل `role` من `client` إلى `admin` يدوياً، واحفظ.
4. سجّل الخروج والدخول من جديد، وستُفتح لك تلقائياً لوحة `admin.html`.

## 3) إضافة أول منتجات
من لوحة المدير → تبويب "المنتجات" → "+ منتج جديد"، أدخل الاسم والوصف وأسعار كل وزن (100 جم، 250 جم، 500 جم، 1 كجم) لكل من القطاعي والجملة، ثم احفظ.

## 4) النشر المجاني

### GitHub Pages
```bash
git init
git add .
git commit -m "القهوجي - النسخة الأولى"
git branch -M main
git remote add origin https://github.com/USERNAME/algahwagy.git
git push -u origin main
```
ثم من إعدادات المستودع (Settings → Pages) اختر الفرع `main` والمجلد `/ (root)`.

### أو Netlify / Vercel
اسحب المجلد كاملاً وأفلته في netlify.com/drop، أو اربط المستودع في vercel.com — كلاهما مجاني بالكامل للمواقع الثابتة.

⚠️ **مهم:** بعد نشر الموقع، عد إلى Firebase Authentication → Settings → **Authorized domains** وأضف نطاق موقعك المنشور (مثل `username.github.io`)، وإلا سيرفض Firebase تسجيل الدخول من الرابط الجديد.

## 5) تحويل الموقع إلى تطبيق أندرويد (APK) مجاناً
1. انشر الموقع أولاً (خطوة 4) للحصول على رابط HTTPS.
2. اذهب إلى https://www.pwabuilder.com وألصق رابط موقعك.
3. اضغط **Start**، ثم من تبويب **Android** اضغط **Generate Package**.
4. حمّل ملف الـ APK الناتج مباشرة — الأداة مجانية بالكامل.

## ملاحظات تقنية
- **العمل بدون إنترنت (Offline):** الملفات الثابتة (HTML/CSS/JS) تُخزَّن عبر `service-worker.js`، وبيانات Firestore تُخزَّن محلياً عبر `enablePersistence` في `js/firebase-config.js`، فتظل المنتجات والطلبات السابقة معروضة حتى بدون اتصال، مع مزامنة تلقائية عند عودة الاتصال.
- **الإشعارات الجماعية للتجار:** حالياً تظهر كعروض داخل تبويب "العروض" في لوحة التاجر (لا تحتاج أي خدمة مدفوعة). لإشعارات Push حقيقية على الجهاز، يلزم إضافة Firebase Cloud Messaging (مجاني أيضاً) — إن رغبت أستطيع إضافته في خطوة تالية.
- **تصدير PDF:** يدعم النصوص الإنجليزية والأرقام بشكل كامل عبر `jsPDF`. لدعم الحروف العربية داخل ملف PDF نفسه يلزم تحميل خط عربي (مثل Amiri) داخل المكتبة — يمكن إضافته لاحقاً إذا احتجت تقارير PDF بالعربية الكاملة؛ حالياً التصدير الأدق للعربية هو **Excel** (يدعم العربية بشكل كامل فوراً).
- كل الأكواد بدون أي مكتبة أو خدمة مدفوعة: Firebase (Spark المجانية)، Google Fonts، SheetJS، jsPDF — جميعها مجانية ومفتوحة المصدر.

## هيكل قاعدة البيانات (Firestore)
- `users/{uid}`: name, phone, email, role(client|merchant|admin), approved, favorites[], storeName
- `products/{id}`: name, description, category, image, stock, retailPrices{100,250,500,1000}, wholesalePrices{...}, active, ratingSum, ratingCount
- `orders/{id}`: userId, userName, userRole, items[], subtotal, discountPercent, couponCode, total, paymentMethod, address, status, createdAt
- `coupons/{id}`: code, discountPercent, active
- `offers/{id}`: title, description, active

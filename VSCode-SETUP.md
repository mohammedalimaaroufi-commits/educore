# EduCore Manager — نسخة التطوير

هذه النسخة هي أحدث مصدر للمشروع، وتتضمن تعديل الخادم لخدمة الواجهة الأمامية من نفس نطاق Render.

## فتح المشروع

افتح المجلد الرئيسي في VS Code، وليس مجلد `backend` أو `frontend` وحده.

## تشغيل الخادم محليًا

من الطرفية داخل المجلد الرئيسي:

```bash
cd backend
npm install
npm start
```

## تشغيل الواجهة أثناء التطوير

في طرفية ثانية:

```bash
cd frontend
npm install
npm run dev
```

## متغيرات البيئة

ملف `backend/.env.example` يوضح المتغيرات المطلوبة. أنشئ نسخة باسم `backend/.env` محليًا، ولا ترفعها إلى GitHub.

ملف `frontend/.env.production` يوجّه نسخة الإنتاج إلى:

```text
https://educore-qvxl.onrender.com
```

## النشر على Render

إعدادات الخدمة الحالية هي:

- Root Directory: `backend`
- Build Command: `npm install && cd ../frontend && npm install && npm run build`
- Start Command: `npm start`

الخادم يخدم ملفات `frontend/dist` من النطاق نفسه، كما يحافظ على مسارات API وSocket.IO.

## تنبيه أمني

تم استبعاد كلمات المرور وملفات الأسرار من هذا الأرشيف. اضبط `JWT_SECRET` و`ADMIN_PASSWORD` من متغيرات البيئة في Render، ولا تضع قيمها داخل ملفات المشروع أو GitHub.

## ملاحظة قاعدة البيانات

يستخدم المشروع SQLite. على الخطة المجانية في Render قد لا يكون القرص المحلي مناسبًا لتخزين إنتاجي دائم؛ يُفضّل استخدام قاعدة بيانات دائمة عند الانتقال إلى تشغيل فعلي مستمر.

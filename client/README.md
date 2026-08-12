# Client — Online Marketplace (React + TypeScript)

واجهة المستخدم (Frontend) لمشروع المتجر الإلكتروني، مبنية بـ **Vite + React + TypeScript**.

## التقنيات المستخدمة

| الأداة            | الغرض                                      |
| ----------------- | ------------------------------------------ |
| **Vite**          | أداة البناء والتشغيل السريع                 |
| **React 18 + TS** | بناء الواجهة بأنواع آمنة                    |
| **React Router**  | التنقل بين الصفحات                          |
| **Axios**         | الاتصال بالـ backend API                    |
| **Zustand**       | إدارة الحالة (تسجيل الدخول + السلة)         |
| **Tailwind CSS**  | التنسيق                                     |

## التشغيل

```bash
# 1) ثبّت الاعتماديات (مرة واحدة)
npm install

# 2) انسخ ملف البيئة وعدّل رابط الـ API
cp .env.example .env

# 3) شغّل خادم التطوير
npm run dev
```

يفتح على: http://localhost:5173

> ملاحظة: عدّل `target` في `vite.config.ts` ليطابق منفذ الـ backend عندك (ASP.NET Core).

## هيكلة المجلدات

```
src/
├── api/          # اتصال axios + دوال الـ API لكل مورد
│   ├── axios.ts        # نسخة axios موحّدة + interceptors (توكن/401)
│   ├── auth.api.ts     # login / register
│   └── products.api.ts # جلب المنتجات
├── components/
│   ├── common/   # مكونات UI عامة (Button...)
│   └── layout/   # Navbar + Layout
├── hooks/        # custom hooks (useProducts...)
├── pages/        # صفحات الراوتر (Home, Products, Cart, Login...)
├── routes/       # AppRoutes + ProtectedRoute (حماية الصفحات)
├── store/        # Zustand stores (authStore, cartStore)
├── types/        # تعريفات TypeScript المشتركة
├── utils/        # دوال مساعدة
├── App.tsx       # المكوّن الجذر
├── main.tsx      # نقطة الدخول + BrowserRouter
└── index.css     # توجيهات Tailwind
```

## أوامر مفيدة

```bash
npm run dev      # تشغيل خادم التطوير
npm run build    # بناء نسخة الإنتاج (فحص أنواع + build)
npm run preview  # معاينة نسخة الإنتاج محليًا
```

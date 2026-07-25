// =============================================================
// إعدادات Firebase — استبدل القيم التالية ببيانات مشروعك المجاني
// أنشئ مشروعاً على: https://console.firebase.google.com
// فعّل: Authentication (Email/Password) + Firestore Database
// انسخ بيانات "Web App Config" من إعدادات المشروع والصقها هنا
// =============================================================
const firebaseConfig = {
  apiKey: "ضع_API_KEY_هنا",
  authDomain: "ضع_PROJECT_ID.firebaseapp.com",
  projectId: "ضع_PROJECT_ID_هنا",
  storageBucket: "ضع_PROJECT_ID.appspot.com",
  messagingSenderId: "ضع_SENDER_ID_هنا",
  appId: "ضع_APP_ID_هنا"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// تفعيل التخزين المحلي (Offline Persistence) - يسمح بالعمل بدون إنترنت
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  console.warn("تعذّر تفعيل وضع Offline:", err.code);
});

// أسماء المجموعات (Collections) في Firestore
const COL = {
  USERS: "users",
  PRODUCTS: "products",
  ORDERS: "orders",
  COUPONS: "coupons",
  OFFERS: "offers",
  FAVORITES: "favorites",
  RATINGS: "ratings",
};

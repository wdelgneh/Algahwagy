// =============================================================
// Service Worker — تخزين مؤقت للملفات الثابتة لتعمل بدون إنترنت
// =============================================================
const CACHE_NAME = "algahwagy-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./login.html",
  "./orders.html",
  "./admin.html",
  "./merchant.html",
  "./about.html",
  "./contact.html",
  "./offline.html",
  "./css/style.css",
  "./js/firebase-config.js",
  "./js/helpers.js",
  "./js/auth.js",
  "./js/cart.js",
  "./js/app.js",
  "./js/admin.js",
  "./js/merchant.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// استراتيجية: الشبكة أولاً للملفات الديناميكية (Firestore عبر مكتبة Firebase نفسها تدير التخزين المؤقت)،
// والتخزين المؤقت أولاً للملفات الثابتة (HTML/CSS/JS/الصور)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // لا نتدخل في طلبات Firebase/Firestore أو أي طلبات خارجية أخرى غير نفس الأصل
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => cached || caches.match("./offline.html"));
      return cached || network;
    })
  );
});

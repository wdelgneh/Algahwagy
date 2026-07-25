// =============================================================
// دوال مساعدة مشتركة بين كل الصفحات
// =============================================================

function toast(message, type = "info") {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function formatPrice(value) {
  const n = Number(value || 0);
  return n.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " ج.م";
}

function formatDate(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function statusLabel(status) {
  const map = {
    new: "جديد",
    processing: "جاري التجهيز",
    shipped: "تم الشحن",
    delivered: "تم التسليم",
    rejected: "مرفوض",
  };
  return map[status] || status;
}

function statusClass(status) {
  const map = {
    new: "status-new",
    processing: "status-processing",
    shipped: "status-shipped",
    delivered: "status-delivered",
    rejected: "status-rejected",
  };
  return map[status] || "status-new";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// توليد رقم طلب مختصر وسهل القراءة من معرّف Firestore
function shortId(id) {
  return "#" + String(id).slice(-6).toUpperCase();
}

function weightLabel(g) {
  if (g >= 1000) return (g / 1000) + " كجم";
  return g + " جم";
}

// حماية الصفحات: يعيد التوجيه لتسجيل الدخول إذا لم يكن هناك مستخدم،
// أو للصفحة المسموح بها فقط حسب الدور
function requireAuth(allowedRoles, onReady) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    try {
      const doc = await db.collection(COL.USERS).doc(user.uid).get();
      if (!doc.exists) {
        await auth.signOut();
        window.location.href = "login.html";
        return;
      }
      const profile = { uid: user.uid, ...doc.data() };
      if (allowedRoles && !allowedRoles.includes(profile.role)) {
        toast("ليست لديك صلاحية الوصول لهذه الصفحة", "error");
        window.location.href = "index.html";
        return;
      }
      onReady(profile);
    } catch (e) {
      console.error(e);
      toast("حدث خطأ في التحقق من الحساب", "error");
    }
  });
}

function shareOnWhatsapp(text, url) {
  const full = encodeURIComponent(text + "\n" + url);
  window.open("https://wa.me/?text=" + full, "_blank");
}

function shareOnFacebook(url) {
  window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url), "_blank");
}

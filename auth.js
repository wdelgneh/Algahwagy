// =============================================================
// تسجيل الدخول / إنشاء حساب — يُستخدم في login.html
// =============================================================

let selectedRole = "client"; // client | merchant

function initAuthPage() {
  const roleButtons = document.querySelectorAll(".role-toggle button");
  roleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      roleButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedRole = btn.dataset.role;
    });
  });

  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document.getElementById("registerForm")?.addEventListener("submit", handleRegister);

  // إذا كان المستخدم مسجلاً دخوله بالفعل، حوّله مباشرة
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const doc = await db.collection(COL.USERS).doc(user.uid).get();
      if (doc.exists) redirectByRole(doc.data().role);
    }
  });
}

function redirectByRole(role) {
  if (role === "admin") window.location.href = "admin.html";
  else if (role === "merchant") window.location.href = "merchant.html";
  else window.location.href = "index.html";
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const storeName = document.getElementById("regStore")?.value.trim() || "";
  const msg = document.getElementById("registerMsg");

  if (!name || !phone || !email || password.length < 6) {
    showMsg(msg, "من فضلك أكمل جميع الحقول (كلمة المرور 6 أحرف على الأقل)", "error");
    return;
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const profile = {
      name,
      phone,
      email,
      role: selectedRole,
      storeName: selectedRole === "merchant" ? storeName : "",
      approved: selectedRole === "merchant" ? false : true, // التاجر يحتاج موافقة المدير على أسعار الجملة
      favorites: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection(COL.USERS).doc(cred.user.uid).set(profile);

    if (selectedRole === "merchant") {
      showMsg(msg, "تم إنشاء الحساب، بانتظار موافقة الإدارة على تفعيل أسعار الجملة", "success");
      setTimeout(() => (window.location.href = "merchant.html"), 1500);
    } else {
      showMsg(msg, "تم إنشاء الحساب بنجاح", "success");
      setTimeout(() => (window.location.href = "index.html"), 1000);
    }
  } catch (err) {
    showMsg(msg, translateAuthError(err.code), "error");
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const msg = document.getElementById("loginMsg");

  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const doc = await db.collection(COL.USERS).doc(cred.user.uid).get();
    if (!doc.exists) {
      showMsg(msg, "لم يتم العثور على بيانات الحساب", "error");
      return;
    }
    redirectByRole(doc.data().role);
  } catch (err) {
    showMsg(msg, translateAuthError(err.code), "error");
  }
}

function showMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = "form-msg " + type;
  el.style.display = "block";
}

function translateAuthError(code) {
  const map = {
    "auth/email-already-in-use": "هذا البريد الإلكتروني مستخدم بالفعل",
    "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة",
    "auth/weak-password": "كلمة المرور ضعيفة جداً",
    "auth/user-not-found": "لا يوجد حساب بهذا البريد الإلكتروني",
    "auth/wrong-password": "كلمة المرور غير صحيحة",
    "auth/invalid-credential": "بيانات الدخول غير صحيحة",
    "auth/too-many-requests": "تم حظر المحاولات مؤقتاً، حاول لاحقاً",
  };
  return map[code] || "حدث خطأ، حاول مرة أخرى";
}

async function logout() {
  await auth.signOut();
  window.location.href = "login.html";
}

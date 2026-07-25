// =============================================================
// لوحة تحكم التاجر
// =============================================================

let merchantOrders = [];

requireAuth(["merchant"], (profile) => {
  if (!profile.approved) {
    document.getElementById("approvalNotice").innerHTML =
      `<div class="form-msg info">حسابك قيد المراجعة من قبل الإدارة. سيتم تفعيل أسعار الجملة وميزات التاجر بعد الموافقة.</div>`;
  }

  db.collection(COL.ORDERS).where("userId", "==", profile.uid).orderBy("createdAt", "desc").onSnapshot((snap) => {
    merchantOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderMerchantOverview();
    renderMerchantOrders();
    renderStatement();
  });

  db.collection(COL.OFFERS).where("active", "==", true).onSnapshot((snap) => {
    const offers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    document.getElementById("mOffersGrid").innerHTML =
      offers.map((o) => `
        <div class="card"><div class="body">
          <h3>${escapeHtml(o.title)}</h3>
          <p class="desc">${escapeHtml(o.description || "")}</p>
        </div></div>`).join("") || `<div class="empty-state">لا توجد عروض حالياً</div>`;
  });
});

function switchMTab(tab) {
  document.querySelectorAll(".dash-tab").forEach((s) => s.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  document.querySelectorAll(".sidebar a").forEach((a) => a.classList.remove("active"));
  event.target.classList.add("active");
}

function renderMerchantOverview() {
  const total = merchantOrders.filter((o) => o.status !== "rejected").reduce((s, o) => s + o.total, 0);
  document.getElementById("mStatGrid").innerHTML = `
    <div class="stat-card"><div class="label">إجمالي طلباتي</div><div class="value">${merchantOrders.length}</div></div>
    <div class="stat-card"><div class="label">إجمالي المشتريات</div><div class="value">${formatPrice(total)}</div></div>
    <div class="stat-card"><div class="label">طلبات قيد التجهيز</div><div class="value">${merchantOrders.filter((o) => o.status === "processing").length}</div></div>`;
}

function renderMerchantOrders() {
  document.getElementById("mOrdersBody").innerHTML = merchantOrders
    .map((o) => `<tr><td>${shortId(o.id)}</td><td>${formatDate(o.createdAt)}</td><td>${formatPrice(o.total)}</td><td><span class="status-badge ${statusClass(o.status)}">${statusLabel(o.status)}</span></td></tr>`)
    .join("") || `<tr><td colspan="4">لا توجد طلبات بعد</td></tr>`;
}

function renderStatement() {
  const valid = merchantOrders.filter((o) => o.status !== "rejected");
  const total = valid.reduce((s, o) => s + o.total, 0);
  document.getElementById("statementStatGrid").innerHTML = `
    <div class="stat-card"><div class="label">إجمالي المشتريات</div><div class="value">${formatPrice(total)}</div></div>
    <div class="stat-card"><div class="label">عدد الطلبات</div><div class="value">${valid.length}</div></div>`;
  document.getElementById("statementBody").innerHTML = valid
    .map((o) => `<tr><td>${shortId(o.id)}</td><td>${formatDate(o.createdAt)}</td><td>${formatPrice(o.total)}</td><td>${o.paymentMethod === "cash" ? "نقداً" : "تحويل بنكي"}</td><td><span class="status-badge ${statusClass(o.status)}">${statusLabel(o.status)}</span></td></tr>`)
    .join("") || `<tr><td colspan="5">لا توجد بيانات بعد</td></tr>`;
}

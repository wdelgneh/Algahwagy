// =============================================================
// لوحة تحكم المدير — إدارة المنتجات/الطلبات/العملاء/التجار/الكوبونات/التقارير
// =============================================================

let adminProducts = [];
let adminOrders = [];
let adminCustomers = [];
let adminMerchants = [];
let orderStatusFilter = "all";

requireAuth(["admin"], (profile) => {
  loadOverview();
  loadProducts();
  loadOrders();
  loadCustomers();
  loadMerchants();
  loadCoupons();
  loadOffers();
});

function switchTab(tab) {
  document.querySelectorAll(".dash-tab").forEach((s) => s.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  document.querySelectorAll(".sidebar a").forEach((a) => a.classList.remove("active"));
  event.target.classList.add("active");
  if (tab === "reports") renderReports();
}

// ===== نظرة عامة =====
function loadOverview() {
  db.collection(COL.ORDERS).orderBy("createdAt", "desc").limit(8).onSnapshot((snap) => {
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    document.getElementById("recentOrdersBody").innerHTML = orders
      .map((o) => `<tr><td>${escapeHtml(o.userName)}</td><td>${formatDate(o.createdAt)}</td><td>${formatPrice(o.total)}</td><td><span class="status-badge ${statusClass(o.status)}">${statusLabel(o.status)}</span></td></tr>`)
      .join("");
  });

  db.collection(COL.ORDERS).onSnapshot((snap) => {
    const orders = snap.docs.map((d) => d.data());
    const totalSales = orders.filter((o) => o.status !== "rejected").reduce((s, o) => s + o.total, 0);
    const newOrders = orders.filter((o) => o.status === "new").length;
    document.getElementById("statGrid").innerHTML = `
      <div class="stat-card"><div class="label">إجمالي المبيعات</div><div class="value">${formatPrice(totalSales)}</div></div>
      <div class="stat-card"><div class="label">إجمالي الطلبات</div><div class="value">${orders.length}</div></div>
      <div class="stat-card"><div class="label">طلبات جديدة</div><div class="value">${newOrders}</div></div>
      <div class="stat-card"><div class="label">عدد المنتجات</div><div class="value">${adminProducts.length}</div></div>`;
  });
}

// ===== المنتجات =====
function loadProducts() {
  db.collection(COL.PRODUCTS).onSnapshot((snap) => {
    adminProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    document.getElementById("productsBody").innerHTML = adminProducts
      .map(
        (p) => `<tr>
        <td><div class="thumb-sm" style="width:44px;height:44px;border-radius:8px;background:linear-gradient(135deg,var(--coffee-600),var(--espresso-800));display:flex;align-items:center;justify-content:center;color:var(--gold-400)">${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">` : "☕"}</div></td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category || "-")}</td>
        <td>${p.stock}</td>
        <td>${formatPrice((p.retailPrices || {})[100] || 0)}</td>
        <td>${formatPrice((p.wholesalePrices || {})[100] || 0)}</td>
        <td><span class="status-badge ${p.active === false ? "status-rejected" : "status-delivered"}">${p.active === false ? "موقوف" : "نشط"}</span></td>
        <td><button class="btn btn-ghost btn-sm" onclick="openProductForm('${p.id}')">تعديل</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">حذف</button></td>
      </tr>`
      )
      .join("");
  });
}

function openProductForm(productId) {
  const p = adminProducts.find((x) => x.id === productId) || {
    name: "", description: "", category: "", image: "", stock: 0, active: true,
    retailPrices: { 100: 0, 250: 0, 500: 0, 1000: 0 },
    wholesalePrices: { 100: 0, 250: 0, 500: 0, 1000: 0 },
  };
  const weights = [100, 250, 500, 1000];
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) this.remove()">
      <div class="modal-form">
        <h2 style="font-family:var(--font-display)">${productId ? "تعديل منتج" : "منتج جديد"}</h2>
        <div class="field"><label>اسم المنتج</label><input id="pfName" value="${escapeHtml(p.name)}"></div>
        <div class="field"><label>الوصف</label><textarea id="pfDesc">${escapeHtml(p.description || "")}</textarea></div>
        <div class="two-col">
          <div class="field"><label>الفئة</label><input id="pfCategory" value="${escapeHtml(p.category || "")}" placeholder="مثال: عربي، تركي، اسبريسو"></div>
          <div class="field"><label>المخزون (كجم)</label><input type="number" id="pfStock" value="${p.stock || 0}"></div>
        </div>
        <div class="field"><label>رابط صورة المنتج (اختياري)</label><input id="pfImage" value="${escapeHtml(p.image || "")}" placeholder="https://..."></div>
        <label style="font-size:13px;font-weight:700;display:block;margin:10px 0 6px">الأسعار حسب الوزن</label>
        <div class="table-wrap"><table>
          <thead><tr><th>الوزن</th><th>سعر قطاعي</th><th>سعر جملة</th></tr></thead>
          <tbody>
            ${weights.map((w) => `<tr><td>${weightLabel(w)}</td>
              <td><input type="number" id="retail-${w}" value="${(p.retailPrices || {})[w] || 0}" style="width:100px;padding:6px 8px;border:1px solid var(--line);border-radius:6px"></td>
              <td><input type="number" id="wholesale-${w}" value="${(p.wholesalePrices || {})[w] || 0}" style="width:100px;padding:6px 8px;border:1px solid var(--line);border-radius:6px"></td></tr>`).join("")}
          </tbody>
        </table></div>
        <div class="field" style="margin-top:12px">
          <label><input type="checkbox" id="pfActive" ${p.active !== false ? "checked" : ""}> منتج نشط ومعروض في المتجر</label>
        </div>
        <button class="btn btn-gold btn-block" onclick="saveProduct('${productId || ""}')">حفظ المنتج</button>
      </div>
    </div>`;
}

async function saveProduct(productId) {
  const weights = [100, 250, 500, 1000];
  const retailPrices = {}, wholesalePrices = {};
  weights.forEach((w) => {
    retailPrices[w] = Number(document.getElementById("retail-" + w).value) || 0;
    wholesalePrices[w] = Number(document.getElementById("wholesale-" + w).value) || 0;
  });
  const data = {
    name: document.getElementById("pfName").value.trim(),
    description: document.getElementById("pfDesc").value.trim(),
    category: document.getElementById("pfCategory").value.trim(),
    image: document.getElementById("pfImage").value.trim(),
    stock: Number(document.getElementById("pfStock").value) || 0,
    active: document.getElementById("pfActive").checked,
    retailPrices, wholesalePrices,
  };
  if (!data.name) { toast("اسم المنتج مطلوب", "error"); return; }

  if (productId) {
    await db.collection(COL.PRODUCTS).doc(productId).update(data);
    toast("تم تحديث المنتج");
  } else {
    data.ratingSum = 0; data.ratingCount = 0;
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection(COL.PRODUCTS).add(data);
    toast("تم إضافة المنتج");
  }
  document.getElementById("modalRoot").innerHTML = "";
}

async function deleteProduct(productId) {
  if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
  await db.collection(COL.PRODUCTS).doc(productId).delete();
  toast("تم حذف المنتج");
}

// ===== الطلبات =====
function loadOrders() {
  db.collection(COL.ORDERS).orderBy("createdAt", "desc").onSnapshot((snap) => {
    adminOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderOrdersTable();
  });
}

function filterOrders(status, btn) {
  orderStatusFilter = status;
  document.querySelectorAll("#tab-orders .chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  renderOrdersTable();
}

function renderOrdersTable() {
  let list = adminOrders;
  if (orderStatusFilter !== "all") list = list.filter((o) => o.status === orderStatusFilter);
  document.getElementById("ordersBody").innerHTML = list
    .map(
      (o) => `<tr>
      <td>${shortId(o.id)}</td>
      <td>${escapeHtml(o.userName)}</td>
      <td>${o.userRole === "merchant" ? "تاجر" : "عميل"}</td>
      <td>${formatDate(o.createdAt)}</td>
      <td>${formatPrice(o.total)}</td>
      <td><span class="status-badge ${statusClass(o.status)}">${statusLabel(o.status)}</span></td>
      <td>
        <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:6px;border-radius:6px;border:1px solid var(--line)">
          <option value="">تغيير الحالة</option>
          <option value="new">جديد</option>
          <option value="processing">جاري التجهيز</option>
          <option value="shipped">تم الشحن</option>
          <option value="delivered">تم التسليم</option>
          <option value="rejected">رفض</option>
        </select>
      </td>
    </tr>`
    )
    .join("");
}

async function updateOrderStatus(orderId, status) {
  if (!status) return;
  await db.collection(COL.ORDERS).doc(orderId).update({ status });
  toast("تم تحديث حالة الطلب");
}

// ===== العملاء =====
function loadCustomers() {
  db.collection(COL.USERS).where("role", "==", "client").onSnapshot((snap) => {
    adminCustomers = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    document.getElementById("customersBody").innerHTML = adminCustomers
      .map((c) => {
        const count = adminOrders.filter((o) => o.userId === c.uid).length;
        return `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.email)}</td><td>${count}</td><td>${formatDate(c.createdAt)}</td></tr>`;
      })
      .join("");
  });
}

// ===== التجار =====
function loadMerchants() {
  db.collection(COL.USERS).where("role", "==", "merchant").onSnapshot((snap) => {
    adminMerchants = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    document.getElementById("merchantsBody").innerHTML = adminMerchants
      .map(
        (m) => `<tr>
        <td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.storeName || "-")}</td><td>${escapeHtml(m.phone)}</td>
        <td><span class="status-badge ${m.approved ? "status-delivered" : "status-processing"}">${m.approved ? "مفعّل" : "بانتظار الموافقة"}</span></td>
        <td>${m.approved
          ? `<button class="btn btn-ghost btn-sm" onclick="toggleMerchantApproval('${m.uid}', false)">إيقاف</button>`
          : `<button class="btn btn-gold btn-sm" onclick="toggleMerchantApproval('${m.uid}', true)">موافقة</button>`}</td>
      </tr>`
      )
      .join("");
  });
}

async function toggleMerchantApproval(uid, approved) {
  await db.collection(COL.USERS).doc(uid).update({ approved });
  toast(approved ? "تم تفعيل حساب التاجر" : "تم إيقاف حساب التاجر");
}

// ===== الكوبونات =====
function loadCoupons() {
  db.collection(COL.COUPONS).onSnapshot((snap) => {
    const coupons = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    document.getElementById("couponsBody").innerHTML = coupons
      .map(
        (c) => `<tr><td>${escapeHtml(c.code)}</td><td>${c.discountPercent}%</td>
        <td><span class="status-badge ${c.active ? "status-delivered" : "status-rejected"}">${c.active ? "فعّال" : "موقوف"}</span></td>
        <td><button class="btn btn-ghost btn-sm" onclick="toggleCoupon('${c.id}', ${!c.active})">${c.active ? "إيقاف" : "تفعيل"}</button>
            <button class="btn btn-danger btn-sm" onclick="db.collection(COL.COUPONS).doc('${c.id}').delete()">حذف</button></td></tr>`
      )
      .join("");
  });
}

function openCouponForm() {
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) this.remove()">
      <div class="modal-form">
        <h2 style="font-family:var(--font-display)">كوبون خصم جديد</h2>
        <div class="field"><label>كود الكوبون</label><input id="cfCode" placeholder="مثال: WELCOME10"></div>
        <div class="field"><label>نسبة الخصم (%)</label><input type="number" id="cfPercent" value="10"></div>
        <button class="btn btn-gold btn-block" onclick="saveCoupon()">حفظ</button>
      </div>
    </div>`;
}

async function saveCoupon() {
  const code = document.getElementById("cfCode").value.trim().toUpperCase();
  const discountPercent = Number(document.getElementById("cfPercent").value) || 0;
  if (!code) { toast("الكود مطلوب", "error"); return; }
  await db.collection(COL.COUPONS).add({ code, discountPercent, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  toast("تم إضافة الكوبون");
  document.getElementById("modalRoot").innerHTML = "";
}

async function toggleCoupon(id, active) {
  await db.collection(COL.COUPONS).doc(id).update({ active });
}

// ===== العروض =====
function loadOffers() {
  db.collection(COL.OFFERS).onSnapshot((snap) => {
    const offers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    document.getElementById("offersBody").innerHTML = offers
      .map(
        (o) => `<tr><td>${escapeHtml(o.title)}</td><td>${escapeHtml(o.description || "-")}</td>
        <td><span class="status-badge ${o.active ? "status-delivered" : "status-rejected"}">${o.active ? "نشط" : "موقوف"}</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="db.collection(COL.OFFERS).doc('${o.id}').delete()">حذف</button></td></tr>`
      )
      .join("");
  });
}

function openOfferForm() {
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) this.remove()">
      <div class="modal-form">
        <h2 style="font-family:var(--font-display)">عرض جديد + إشعار جماعي للتجار</h2>
        <div class="field"><label>عنوان العرض</label><input id="ofTitle"></div>
        <div class="field"><label>الوصف</label><textarea id="ofDesc"></textarea></div>
        <button class="btn btn-gold btn-block" onclick="saveOffer()">نشر العرض وإرسال إشعار</button>
        <p style="font-size:12px;color:#8a7a6a;margin-top:8px">سيظهر هذا العرض لجميع التجار المسجّلين عند فتح حساباتهم.</p>
      </div>
    </div>`;
}

async function saveOffer() {
  const title = document.getElementById("ofTitle").value.trim();
  const description = document.getElementById("ofDesc").value.trim();
  if (!title) { toast("العنوان مطلوب", "error"); return; }
  await db.collection(COL.OFFERS).add({ title, description, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  toast("تم نشر العرض");
  document.getElementById("modalRoot").innerHTML = "";
}

// ===== التقارير =====
function renderReports() {
  const validOrders = adminOrders.filter((o) => o.status !== "rejected");
  const totalSales = validOrders.reduce((s, o) => s + o.total, 0);
  const avgOrder = validOrders.length ? totalSales / validOrders.length : 0;

  document.getElementById("reportStatGrid").innerHTML = `
    <div class="stat-card"><div class="label">إجمالي المبيعات</div><div class="value">${formatPrice(totalSales)}</div></div>
    <div class="stat-card"><div class="label">عدد الطلبات المكتملة</div><div class="value">${validOrders.length}</div></div>
    <div class="stat-card"><div class="label">متوسط قيمة الطلب</div><div class="value">${formatPrice(avgOrder)}</div></div>`;

  const productMap = {};
  validOrders.forEach((o) => {
    o.items.forEach((i) => {
      if (!productMap[i.name]) productMap[i.name] = { qty: 0, total: 0 };
      productMap[i.name].qty += i.qty;
      productMap[i.name].total += i.price * i.qty;
    });
  });
  const topList = Object.entries(productMap).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  document.getElementById("topProductsBody").innerHTML = topList
    .map(([name, d]) => `<tr><td>${escapeHtml(name)}</td><td>${d.qty}</td><td>${formatPrice(d.total)}</td></tr>`)
    .join("") || `<tr><td colspan="3">لا توجد بيانات مبيعات بعد</td></tr>`;
}

// ===== التصدير (Excel / PDF) — مكتبات مجانية مفتوحة المصدر =====
function exportOrdersExcel() {
  const rows = adminOrders.map((o) => ({
    "رقم الطلب": shortId(o.id),
    "العميل": o.userName,
    "النوع": o.userRole === "merchant" ? "تاجر" : "عميل",
    "التاريخ": formatDate(o.createdAt),
    "الإجمالي": o.total,
    "الحالة": statusLabel(o.status),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الطلبات");
  XLSX.writeFile(wb, "تقرير_مبيعات_القهوجي.xlsx");
}

function exportOrdersPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Al-Gahwagy Sales Report", 14, 16);
  const rows = adminOrders.map((o) => [shortId(o.id), o.userName, o.userRole, formatDate(o.createdAt), String(o.total), statusLabel(o.status)]);
  doc.autoTable({
    head: [["Order", "Customer", "Type", "Date", "Total", "Status"]],
    body: rows,
    startY: 22,
  });
  doc.save("algahwagy-sales-report.pdf");
}

// =============================================================
// منطق صفحة المتجر الرئيسية (index.html)
// يعمل لكل من العميل (أسعار قطاعي) والتاجر (أسعار جملة بعد الموافقة)
// =============================================================

let currentUser = null;    // بيانات المستخدم من Firestore (null = زائر)
let allProducts = [];
let activeCategory = "الكل";
let searchTerm = "";
let modalProduct = null;
let modalWeight = null;
let modalQty = 1;

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  bindStaticEvents();

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const doc = await db.collection(COL.USERS).doc(user.uid).get();
      if (doc.exists) currentUser = { uid: user.uid, ...doc.data() };
    } else {
      currentUser = null;
    }
    renderAuthArea();
    loadProducts();
  });

  // في حال تأخر الاتصال، اعرض المنتجات مباشرة كزائر
  setTimeout(() => { if (allProducts.length === 0) loadProducts(); }, 1200);
});

function bindStaticEvents() {
  document.getElementById("openCartBtn")?.addEventListener("click", openCartDrawer);
  document.getElementById("closeCartBtn")?.addEventListener("click", closeCartDrawer);
  document.getElementById("cartDrawerOverlay")?.addEventListener("click", closeCartDrawer);
  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    renderProducts();
  });
  document.getElementById("checkoutBtn")?.addEventListener("click", openCheckout);
}

function renderAuthArea() {
  const el = document.getElementById("authArea");
  if (!el) return;
  if (currentUser) {
    const roleLabel = currentUser.role === "merchant" ? "تاجر" : "عميل";
    el.innerHTML = `
      <a href="orders.html">طلباتي</a>
      ${currentUser.role === "merchant" ? `<span class="badge-role">${roleLabel}${currentUser.approved ? "" : " (بانتظار الموافقة)"}</span>` : ""}
      <span style="opacity:.8;font-size:13px">مرحباً، ${escapeHtml(currentUser.name)}</span>
      <button onclick="logout()">خروج</button>`;
  } else {
    el.innerHTML = `<a href="login.html">تسجيل الدخول</a>`;
  }
}

// ===== تحميل المنتجات =====
function loadProducts() {
  db.collection(COL.PRODUCTS).onSnapshot(
    (snap) => {
      allProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderCategories();
      renderProducts();
    },
    (err) => {
      console.error(err);
      document.getElementById("productsGrid").innerHTML =
        `<div class="empty-state">تعذّر تحميل المنتجات. تحقّق من إعدادات Firebase في js/firebase-config.js</div>`;
    }
  );
}

function renderCategories() {
  const wrap = document.getElementById("categoryChips");
  if (!wrap) return;
  const cats = ["الكل", ...new Set(allProducts.map((p) => p.category).filter(Boolean))];
  wrap.innerHTML = cats
    .map((c) => `<button class="chip ${c === activeCategory ? "active" : ""}" onclick="setCategory('${escapeHtml(c)}')">${escapeHtml(c)}</button>`)
    .join("");
}

function setCategory(cat) {
  activeCategory = cat;
  renderCategories();
  renderProducts();
}

function isWholesale() {
  return currentUser && currentUser.role === "merchant" && currentUser.approved;
}

function getDisplayPrice(product, weight) {
  const priceMap = isWholesale() ? product.wholesalePrices : product.retailPrices;
  return (priceMap && priceMap[weight]) || 0;
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  let list = allProducts.filter((p) => p.active !== false);
  if (activeCategory !== "الكل") list = list.filter((p) => p.category === activeCategory);
  if (searchTerm) list = list.filter((p) => (p.name || "").toLowerCase().includes(searchTerm) || (p.description || "").toLowerCase().includes(searchTerm));

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="roast-stamp">☕</div>لا توجد منتجات مطابقة الآن</div>`;
    return;
  }

  grid.innerHTML = list.map((p) => productCardHtml(p)).join("");
}

function productCardHtml(p) {
  const favs = currentUser?.favorites || [];
  const isFav = favs.includes(p.id);
  const weights = Object.keys(p.retailPrices || {}).map(Number).sort((a, b) => a - b);
  const minPrice = weights.length ? getDisplayPrice(p, weights[0]) : 0;
  const stockClass = p.stock <= 0 ? "out" : p.stock <= 5 ? "low" : "";
  const stockText = p.stock <= 0 ? "غير متوفر" : p.stock <= 5 ? `كمية محدودة (${p.stock})` : "متوفر";
  const rating = p.ratingCount ? (p.ratingSum / p.ratingCount).toFixed(1) : null;

  return `
  <div class="card">
    <div class="thumb">
      ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}">` : "☕"}
      <button class="fav-btn ${isFav ? "active" : ""}" onclick="toggleFavorite('${p.id}')">${isFav ? "♥" : "♡"}</button>
    </div>
    <div class="body">
      <h3>${escapeHtml(p.name)}</h3>
      <div class="desc">${escapeHtml((p.description || "").slice(0, 60))}</div>
      ${rating ? `<div class="rating">★ ${rating} (${p.ratingCount})</div>` : ""}
      <div class="price-row">
        <div class="price">${formatPrice(minPrice)}<br><small>ابتداءً من</small></div>
        <span class="stock-tag ${stockClass}">${stockText}</span>
      </div>
      <button class="btn btn-dark btn-block btn-sm" onclick="openProductModal('${p.id}')" ${p.stock <= 0 ? "disabled" : ""}>عرض التفاصيل</button>
    </div>
  </div>`;
}

// ===== المفضلة =====
async function toggleFavorite(productId) {
  if (!currentUser) {
    toast("سجّل الدخول لإضافة المنتجات للمفضلة", "info");
    return;
  }
  const favs = currentUser.favorites || [];
  const updated = favs.includes(productId) ? favs.filter((f) => f !== productId) : [...favs, productId];
  currentUser.favorites = updated;
  await db.collection(COL.USERS).doc(currentUser.uid).update({ favorites: updated });
  renderProducts();
}

// ===== نافذة تفاصيل المنتج =====
function openProductModal(productId) {
  modalProduct = allProducts.find((p) => p.id === productId);
  if (!modalProduct) return;
  const weights = Object.keys(modalProduct.retailPrices || {}).map(Number).sort((a, b) => a - b);
  modalWeight = weights[0];
  modalQty = 1;

  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) closeProductModal()">
      <div class="modal">
        <button class="close-x" onclick="closeProductModal()">✕</button>
        <div class="modal-hero">${modalProduct.image ? `<img src="${modalProduct.image}" style="width:100%;height:100%;object-fit:cover">` : "☕"}</div>
        <div class="modal-body">
          <h2 style="font-family:var(--font-display)">${escapeHtml(modalProduct.name)}</h2>
          <p style="color:#6b5c4e;font-size:14px">${escapeHtml(modalProduct.description || "")}</p>
          <div>
            <label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px">اختر الوزن</label>
            <div class="weight-options" id="weightOptions">
              ${weights.map((w) => `<button class="weight-btn ${w === modalWeight ? "active" : ""}" onclick="selectWeight(${w})">${weightLabel(w)}</button>`).join("")}
            </div>
          </div>
          <div class="qty-row">
            <button onclick="changeModalQty(-1)">−</button>
            <span id="modalQtyVal">${modalQty}</span>
            <button onclick="changeModalQty(1)">+</button>
            <div style="margin-right:auto;font-family:var(--font-display);font-weight:900;font-size:20px;color:var(--coffee-700)" id="modalPriceVal">
              ${formatPrice(getDisplayPrice(modalProduct, modalWeight))}
            </div>
          </div>
          <button class="btn btn-gold btn-block" onclick="confirmAddToCart()">أضف إلى السلة</button>
          <div style="display:flex;gap:10px">
            <button class="btn btn-ghost" style="flex:1" onclick="shareOnWhatsapp('${escapeHtml(modalProduct.name)}', location.href)">مشاركة واتساب</button>
            <button class="btn btn-ghost" style="flex:1" onclick="shareOnFacebook(location.href)">مشاركة فيسبوك</button>
          </div>
          ${currentUser ? renderRatingWidget(modalProduct) : ""}
        </div>
      </div>
    </div>`;
}

function renderRatingWidget(p) {
  return `
    <div>
      <label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px">قيّم هذا المنتج</label>
      <div style="display:flex;gap:4px">
        ${[1, 2, 3, 4, 5].map((n) => `<span style="cursor:pointer;font-size:22px;color:var(--gold-500)" onclick="rateProduct('${p.id}', ${n})">★</span>`).join("")}
      </div>
    </div>`;
}

async function rateProduct(productId, stars) {
  const ref = db.collection(COL.PRODUCTS).doc(productId);
  await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const data = doc.data();
    t.update(ref, {
      ratingSum: (data.ratingSum || 0) + stars,
      ratingCount: (data.ratingCount || 0) + 1,
    });
  });
  toast("شكراً لتقييمك!");
  closeProductModal();
}

function selectWeight(w) {
  modalWeight = w;
  document.querySelectorAll("#weightOptions .weight-btn").forEach((b) => b.classList.remove("active"));
  event.target.classList.add("active");
  document.getElementById("modalPriceVal").textContent = formatPrice(getDisplayPrice(modalProduct, modalWeight));
}

function changeModalQty(delta) {
  modalQty = Math.max(1, modalQty + delta);
  document.getElementById("modalQtyVal").textContent = modalQty;
}

function confirmAddToCart() {
  addToCart({
    productId: modalProduct.id,
    name: modalProduct.name,
    image: modalProduct.image || "",
    weight: modalWeight,
    qty: modalQty,
    price: getDisplayPrice(modalProduct, modalWeight),
  });
  closeProductModal();
}

function closeProductModal() {
  document.getElementById("modalRoot").innerHTML = "";
}

// ===== إتمام الطلب =====
function openCheckout() {
  const cart = getCart();
  if (cart.length === 0) {
    toast("السلة فارغة", "error");
    return;
  }
  if (!currentUser) {
    toast("سجّل الدخول لإتمام الطلب", "info");
    window.location.href = "login.html";
    return;
  }
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) closeProductModal()">
      <div class="modal-form">
        <h2 style="font-family:var(--font-display);margin-bottom:14px">إتمام الطلب</h2>
        <div id="checkoutMsg"></div>
        <div class="field">
          <label>كود الخصم (اختياري)</label>
          <input id="couponInput" placeholder="مثال: WELCOME10">
        </div>
        <div class="field">
          <label>طريقة الدفع</label>
          <select id="paymentMethod">
            <option value="cash">الدفع نقداً عند الاستلام</option>
            <option value="bank">تحويل بنكي</option>
          </select>
        </div>
        <div class="field">
          <label>عنوان التسليم</label>
          <textarea id="addressInput" placeholder="أدخل عنوانك بالتفصيل">${escapeHtml(currentUser.address || "")}</textarea>
        </div>
        <div style="display:flex;justify-content:space-between;font-weight:800;font-size:17px;margin:14px 0">
          <span>الإجمالي</span><span id="checkoutTotal">${formatPrice(cartTotal(cart))}</span>
        </div>
        <button class="btn btn-gold btn-block" onclick="submitOrder()">تأكيد الطلب</button>
      </div>
    </div>`;
}

async function submitOrder() {
  const cart = getCart();
  const couponCode = document.getElementById("couponInput").value.trim();
  const paymentMethod = document.getElementById("paymentMethod").value;
  const address = document.getElementById("addressInput").value.trim();
  const msg = document.getElementById("checkoutMsg");

  let discountPercent = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const snap = await db.collection(COL.COUPONS).where("code", "==", couponCode.toUpperCase()).limit(1).get();
    if (!snap.empty && snap.docs[0].data().active) {
      discountPercent = snap.docs[0].data().discountPercent || 0;
      appliedCoupon = couponCode.toUpperCase();
    } else {
      showMsg(msg, "كود الخصم غير صالح", "error");
      return;
    }
  }

  const subtotal = cartTotal(cart);
  const total = subtotal - (subtotal * discountPercent) / 100;

  try {
    await db.collection(COL.ORDERS).add({
      userId: currentUser.uid,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      userRole: currentUser.role,
      items: cart,
      subtotal,
      discountPercent,
      couponCode: appliedCoupon,
      total,
      paymentMethod,
      address,
      status: "new",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    clearCart();
    closeProductModal();
    toast("تم إرسال طلبك بنجاح!");
    setTimeout(() => (window.location.href = "orders.html"), 800);
  } catch (e) {
    showMsg(msg, "تعذّر إرسال الطلب، حاول مرة أخرى", "error");
  }
}

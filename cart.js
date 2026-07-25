// =============================================================
// سلة المشتريات — تُحفظ في localStorage لتعمل بدون إنترنت
// كل عنصر: { productId, name, image, weight, qty, price }
// =============================================================

const CART_KEY = "algahwagy_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((i) => i.productId === item.productId && i.weight === item.weight);
  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  saveCart(cart);
  toast("تمت إضافة المنتج إلى السلة");
}

function removeFromCart(productId, weight) {
  let cart = getCart();
  cart = cart.filter((i) => !(i.productId === productId && i.weight === weight));
  saveCart(cart);
}

function updateCartQty(productId, weight, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.productId === productId && i.weight === weight);
  if (item) {
    item.qty = Math.max(1, qty);
    saveCart(cart);
  }
}

function clearCart() {
  saveCart([]);
}

function cartTotal(cart = getCart()) {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function cartCount(cart = getCart()) {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (badge) badge.textContent = cartCount();
}

// ===== واجهة الدرج الجانبي للسلة =====
function renderCartDrawer() {
  const body = document.getElementById("cartDrawerBody");
  const footTotal = document.getElementById("cartDrawerTotal");
  if (!body) return;
  const cart = getCart();

  if (cart.length === 0) {
    body.innerHTML = `<div class="empty-state"><div class="roast-stamp">☕</div>السلة فارغة حالياً</div>`;
  } else {
    body.innerHTML = cart
      .map(
        (i) => `
      <div class="cart-item">
        <div class="thumb-sm">${i.image ? `<img src="${i.image}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">` : "☕"}</div>
        <div class="info">
          <div class="name">${escapeHtml(i.name)}</div>
          <div class="meta">${weightLabel(i.weight)} • ${formatPrice(i.price)}</div>
          <div class="qty-row" style="margin-top:6px">
            <button onclick="updateCartQty('${i.productId}',${i.weight}, ${i.qty - 1}); renderCartDrawer();">−</button>
            <span>${i.qty}</span>
            <button onclick="updateCartQty('${i.productId}',${i.weight}, ${i.qty + 1}); renderCartDrawer();">+</button>
            <a class="remove" style="margin-right:auto" onclick="removeFromCart('${i.productId}',${i.weight}); renderCartDrawer();">حذف</a>
          </div>
        </div>
      </div>`
      )
      .join("");
  }
  if (footTotal) footTotal.textContent = formatPrice(cartTotal(cart));
}

function openCartDrawer() {
  renderCartDrawer();
  document.getElementById("cartDrawerOverlay").style.display = "block";
  document.getElementById("cartDrawer").style.display = "flex";
}

function closeCartDrawer() {
  document.getElementById("cartDrawerOverlay").style.display = "none";
  document.getElementById("cartDrawer").style.display = "none";
}

document.addEventListener("DOMContentLoaded", updateCartBadge);

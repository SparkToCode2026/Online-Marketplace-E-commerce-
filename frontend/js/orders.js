/* orders.js — Ali's part: Order + OrderItem pages
 * Covers: checkout.html, my-orders.html, order-detail.html, admin-orders.html
 *
 * Expected from api.js (Mutaz's part, not built yet):
 *   const API                                    base API URL, e.g. "http://localhost:5190/api"
 *   async function apiFetch(path, method, body)   attaches "Authorization: Bearer <token>",
 *                                                  parses the JSON body, throws Error(message)
 *                                                  on a non-2xx response
 *
 * Expected from layout.js (Mutaz's part, not built yet):
 *   function renderNav()   fills #app-nav with the shared navbar, if present.
 *   Every page here works fine without it — #app-nav is just left empty.
 *
 * localStorage keys read/written here (matching auth.js / cart.js's expected output):
 *   token    - JWT, set by auth.js on login
 *   userId   - logged-in user's id, set by auth.js on login
 *   role     - "Admin" | "Vendor" | "Customer", set by auth.js on login
 *   cartId   - current user's cart id, set by cart.js the first time a cart is created
 *
 * Until api.js/auth.js/cart.js exist, pages using this file will throw a ReferenceError on
 * apiFetch/API — that's expected for now. Swap in the real files and this should just work
 * as long as their interface matches what's documented above.
 */

// ---------- local helpers (self-contained, so this file isn't blocked on anyone else) ----------

function getToken() { return localStorage.getItem('token'); }
function getUserId() { return localStorage.getItem('userId'); }
function getRole() { return localStorage.getItem('role'); }
function isAdmin() { return getRole() === 'Admin'; }

function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// NOTE: the backend only enforces [Authorize] (any logged-in user) on the Order endpoints,
// not [Authorize(Roles = "Admin")] — so this is a UI-only guard, not a real security boundary.
function requireAdmin() {
  if (!requireAuth()) return false;
  if (!isAdmin()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function formatMoney(amount) {
  return Number(amount).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function showSpinner(container) {
  container.innerHTML = `
    <div class="d-flex justify-content-center my-4">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>`;
}

function showAlert(container, message, type = 'danger') {
  container.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
}

// ---------------------------- checkout.html ----------------------------

async function initCheckoutPage() {
  if (!requireAuth()) return;

  const summaryEl = document.getElementById('order-summary');
  const feedbackEl = document.getElementById('checkout-feedback');
  const confirmBtn = document.getElementById('confirm-purchase-btn');
  const applyCouponBtn = document.getElementById('apply-coupon-btn');
  const couponInput = document.getElementById('coupon-code');

  let appliedCoupon = '';
  let cart = null;

  async function loadCart() {
    const cartId = localStorage.getItem('cartId');
    if (!cartId) {
      showAlert(summaryEl, 'Your cart is empty. <a href="shop.html">Go shopping</a>.', 'info');
      confirmBtn.disabled = true;
      return;
    }

    showSpinner(summaryEl);
    try {
      cart = await apiFetch(`/Cart/getById?id=${cartId}`);
      renderSummary();
    } catch (err) {
      showAlert(summaryEl, err.message);
    }
  }

  function renderSummary() {
    const items = cart.cartItems || [];
    if (items.length === 0) {
      showAlert(summaryEl, 'Your cart is empty. <a href="shop.html">Go shopping</a>.', 'info');
      confirmBtn.disabled = true;
      return;
    }

    const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

    const rows = items.map(i => `
      <tr>
        <td>${i.product.name}</td>
        <td>${i.quantity}</td>
        <td class="text-end">${formatMoney(i.product.price)}</td>
        <td class="text-end">${formatMoney(i.product.price * i.quantity)}</td>
      </tr>`).join('');

    summaryEl.innerHTML = `
      <table class="table">
        <thead>
          <tr><th>Product</th><th>Qty</th><th class="text-end">Price</th><th class="text-end">Line total</th></tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><th colspan="3">Subtotal</th><th class="text-end">${formatMoney(subtotal)}</th></tr>
        </tfoot>
      </table>`;
  }

  applyCouponBtn.addEventListener('click', () => {
    appliedCoupon = couponInput.value.trim();
    showAlert(
      feedbackEl,
      appliedCoupon
        ? `Coupon "${appliedCoupon}" will be applied at checkout.`
        : 'Enter a coupon code first.',
      appliedCoupon ? 'info' : 'warning'
    );
  });

  confirmBtn.addEventListener('click', async () => {
    confirmBtn.disabled = true;
    showSpinner(feedbackEl);
    try {
      const qs = new URLSearchParams({ userId: getUserId() });
      if (appliedCoupon) qs.set('couponCode', appliedCoupon);

      const orderId = await apiFetch(`/Order/checkout?${qs.toString()}`, 'POST');

      localStorage.removeItem('cartId');
      showAlert(feedbackEl, `Order #${orderId} placed! Redirecting...`, 'success');
      setTimeout(() => {
        window.location.href = `order-detail.html?id=${orderId}`;
      }, 1500);
    } catch (err) {
      showAlert(feedbackEl, err.message);
      confirmBtn.disabled = false;
    }
  });

  loadCart();
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderNav === 'function') renderNav();
  if (document.getElementById('checkout-page')) initCheckoutPage();
});

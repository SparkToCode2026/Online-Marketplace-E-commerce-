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

// Use when interpolating user-typed text into an innerHTML template (e.g. the coupon
// code echoed back on the checkout page) so it can't be read as markup/script.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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
        ? `Coupon "${escapeHtml(appliedCoupon)}" will be applied at checkout.`
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

// ---------------------------- my-orders.html ----------------------------

async function initMyOrdersPage() {
  if (!requireAuth()) return;

  const listEl = document.getElementById('orders-list');
  const fromInput = document.getElementById('filter-from');
  const toInput = document.getElementById('filter-to');
  const filterBtn = document.getElementById('filter-btn');
  const clearBtn = document.getElementById('clear-filter-btn');

  // There's no "orders by user" endpoint on the backend, so both paths below
  // fetch everything and filter to the current user client-side.
  async function loadAllMine() {
    showSpinner(listEl);
    try {
      const all = await apiFetch('/Order/all');
      renderOrders(all.filter(o => String(o.userId) === String(getUserId())));
    } catch (err) {
      showAlert(listEl, err.message);
    }
  }

  async function loadByDateRange() {
    if (!fromInput.value || !toInput.value) {
      showAlert(listEl, 'Pick both a from and to date.', 'warning');
      return;
    }
    showSpinner(listEl);
    try {
      // The date input gives "YYYY-MM-DD" (midnight). Without a time, "to" would exclude
      // every order placed later that same day, since the backend does orderDate <= to.
      const qs = new URLSearchParams({ from: fromInput.value, to: `${toInput.value}T23:59:59` });
      const inRange = await apiFetch(`/Order/byDateRange?${qs.toString()}`);
      renderOrders(inRange.filter(o => String(o.userId) === String(getUserId())));
    } catch (err) {
      showAlert(listEl, err.message);
    }
  }

  function renderOrders(orders) {
    if (orders.length === 0) {
      showAlert(listEl, 'No orders found.', 'info');
      return;
    }

    const rows = orders
      .slice()
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      .map(o => `
        <tr>
          <td>#${o.orderId}</td>
          <td>${formatDate(o.orderDate)}</td>
          <td><span class="badge bg-secondary">${o.status}</span></td>
          <td class="text-end">${formatMoney(o.totalAmount)}</td>
          <td><a class="btn btn-sm btn-outline-primary" href="order-detail.html?id=${o.orderId}">View</a></td>
        </tr>`).join('');

    listEl.innerHTML = `
      <table class="table table-hover align-middle">
        <thead><tr><th>Order #</th><th>Date</th><th>Status</th><th class="text-end">Total</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  filterBtn.addEventListener('click', loadByDateRange);
  clearBtn.addEventListener('click', () => {
    fromInput.value = '';
    toInput.value = '';
    loadAllMine();
  });

  loadAllMine();
}

// ---------------------------- order-detail.html ----------------------------

async function initOrderDetailPage() {
  if (!requireAuth()) return;

  const containerEl = document.getElementById('order-detail');
  const orderId = new URLSearchParams(window.location.search).get('id');

  if (!orderId) {
    showAlert(containerEl, 'No order id given.');
    return;
  }

  showSpinner(containerEl);
  try {
    const order = await apiFetch(`/Order/getById?id=${orderId}`);
    renderOrder(order);
  } catch (err) {
    showAlert(containerEl, err.message);
  }

  function renderOrder(order) {
    const items = order.orderItems || [];
    const rows = items.map(i => `
      <tr>
        <td>${i.product ? i.product.name : 'Product #' + i.productId}</td>
        <td>${i.quantity}</td>
        <td class="text-end">${formatMoney(i.unitPrice)}</td>
        <td class="text-end">${formatMoney(i.unitPrice * i.quantity)}</td>
      </tr>`).join('');

    containerEl.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="mb-0">Order #${order.orderId}</h4>
        <span class="badge bg-secondary fs-6">${order.status}</span>
      </div>
      <p class="text-muted">Placed ${formatDate(order.orderDate)}</p>
      <table class="table">
        <thead><tr><th>Product</th><th>Qty</th><th class="text-end">Unit price</th><th class="text-end">Line total</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><th colspan="3">Total</th><th class="text-end">${formatMoney(order.totalAmount)}</th></tr></tfoot>
      </table>
      ${order.shipping ? `<p><strong>Shipping status:</strong> ${order.shipping.status || 'Not shipped yet'}</p>` : ''}
      ${order.payment ? `<p><strong>Payment status:</strong> ${order.payment.status}</p>` : ''}
    `;
  }
}

// ---------------------------- admin-orders.html ----------------------------

// The Checkout endpoint is the only place that sets a status today ("Pending"), and there's
// no enum/lookup endpoint for the rest — these are a reasonable guess at what updateStatus
// expects. Confirm the exact strings in Swagger before relying on this list.
const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

async function initAdminOrdersPage() {
  if (!requireAdmin()) return;

  const tableEl = document.getElementById('admin-orders-table');
  const statsEl = document.getElementById('order-stats');
  const revenueEl = document.getElementById('revenue-by-product');
  const feedbackEl = document.getElementById('admin-orders-feedback');

  let revenueRows = [];
  let revenueSort = { key: 'revenue', dir: 'desc' };

  async function loadOrders() {
    showSpinner(tableEl);
    try {
      const orders = await apiFetch('/Order/all');
      renderOrders(orders);
    } catch (err) {
      showAlert(tableEl, err.message);
    }
  }

  function renderOrders(orders) {
    const rows = orders
      .slice()
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      .map(o => `
        <tr data-order-id="${o.orderId}">
          <td>#${o.orderId}</td>
          <td>${o.userId}</td>
          <td>${formatDate(o.orderDate)}</td>
          <td class="text-end">${formatMoney(o.totalAmount)}</td>
          <td>
            <select class="form-select form-select-sm status-select">
              ${ORDER_STATUSES.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
          <td><a class="btn btn-sm btn-outline-primary" href="order-detail.html?id=${o.orderId}">View</a></td>
        </tr>`).join('');

    tableEl.innerHTML = `
      <table class="table table-hover align-middle">
        <thead><tr><th>Order #</th><th>User</th><th>Date</th><th class="text-end">Total</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    tableEl.querySelectorAll('.status-select').forEach(select => {
      // Tracks the last *confirmed* status, not just the value at render time — otherwise
      // a failed update after an earlier successful one would revert past it to the original.
      let lastConfirmed = select.value;
      select.addEventListener('change', async (e) => {
        const id = e.target.closest('tr').dataset.orderId;
        const newStatus = e.target.value;
        select.disabled = true;
        try {
          const qs = new URLSearchParams({ id, status: newStatus });
          await apiFetch(`/Order/updateStatus?${qs.toString()}`, 'PUT');
          lastConfirmed = newStatus;
          loadStats();
        } catch (err) {
          showAlert(feedbackEl, err.message);
          select.value = lastConfirmed;
        } finally {
          select.disabled = false;
        }
      });
    });
  }

  async function loadStats() {
    showSpinner(statsEl);
    try {
      const stats = await apiFetch('/Order/statsByStatus');
      renderStats(stats);
    } catch (err) {
      showAlert(statsEl, err.message);
    }
  }

  function renderStats(stats) {
    const maxRevenue = Math.max(1, ...stats.map(s => s.totalRevenue));
    statsEl.innerHTML = stats.map(s => `
      <div class="col-md-3 mb-3">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">${s.status}</h6>
            <p class="mb-1">${s.orderCount} order(s)</p>
            <p class="mb-2">${formatMoney(s.totalRevenue)}</p>
            <div class="progress" role="progressbar" aria-label="${s.status} revenue share">
              <div class="progress-bar" style="width: ${(s.totalRevenue / maxRevenue) * 100}%"></div>
            </div>
          </div>
        </div>
      </div>`).join('');
  }

  // No single endpoint returns product name + units sold + revenue together, so this
  // aggregates client-side from /OrderItem/all (each item already includes its product).
  async function loadRevenueByProduct() {
    showSpinner(revenueEl);
    try {
      const items = await apiFetch('/OrderItem/all');
      const grouped = new Map();
      for (const i of items) {
        const name = i.product ? i.product.name : `Product #${i.productId}`;
        const entry = grouped.get(i.productId) || { name, unitsSold: 0, revenue: 0 };
        entry.unitsSold += i.quantity;
        entry.revenue += i.unitPrice * i.quantity;
        grouped.set(i.productId, entry);
      }
      revenueRows = [...grouped.values()];
      renderRevenue();
    } catch (err) {
      showAlert(revenueEl, err.message);
    }
  }

  function renderRevenue() {
    const dir = revenueSort.dir === 'asc' ? 1 : -1;
    const sorted = revenueRows.slice().sort((a, b) => (a[revenueSort.key] > b[revenueSort.key] ? dir : -dir));

    const rows = sorted.map(r => `
      <tr>
        <td>${r.name}</td>
        <td class="text-end">${r.unitsSold}</td>
        <td class="text-end">${formatMoney(r.revenue)}</td>
      </tr>`).join('');

    revenueEl.innerHTML = `
      <table class="table table-sm table-hover">
        <thead>
          <tr>
            <th data-sort="name" role="button">Product</th>
            <th data-sort="unitsSold" class="text-end" role="button">Units sold</th>
            <th data-sort="revenue" class="text-end" role="button">Revenue</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    revenueEl.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        revenueSort.dir = (revenueSort.key === key && revenueSort.dir === 'desc') ? 'asc' : 'desc';
        revenueSort.key = key;
        renderRevenue();
      });
    });
  }

  loadOrders();
  loadStats();
  loadRevenueByProduct();
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderNav === 'function') renderNav();
  if (document.getElementById('checkout-page')) initCheckoutPage();
  if (document.getElementById('my-orders-page')) initMyOrdersPage();
  if (document.getElementById('order-detail-page')) initOrderDetailPage();
  if (document.getElementById('admin-orders-page')) initAdminOrdersPage();
});

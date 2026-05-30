import { loadCategories, bindAdminForms, renderAdminAccess } from "./admin/admin.js?v=20260529-razorpay-errors";
import { checkBackendHealth } from "./core/api.js?v=20260529-razorpay-errors";
import { loadAdminOrders } from "./admin/orders.js?v=20260529-razorpay-errors";
import { renderAuth, setAuthChangeHandler } from "./auth/auth.js?v=20260529-razorpay-errors";
import { renderProfile } from "./core/profile.js?v=20260529-razorpay-errors";
import { setApiBaseUrl, state } from "./core/state.js?v=20260529-razorpay-errors";
import { compactItem, emptyState, escapeHtml, money, qsa, qs, renderSummary, setBusy, setView, showToast } from "./core/ui.js?v=20260529-razorpay-errors";
import { bindProductDetails, loadProducts, renderProducts, sortProducts } from "./user/products.js?v=20260529-razorpay-errors";

export async function refreshAdmin() {
  renderAuth({
    appRole: "ADMIN",
    title: "Admin Login",
    message: "Login or register as admin to manage catalog and orders.",
    registerRole: "admin",
  });
  renderAdminAccess();
  await Promise.allSettled([
    loadProducts(qs("#searchInput")?.value.trim() || ""),
    loadCategories(),
    loadAdminOrders(),
  ]);
  renderSummary(state);
  renderAdminOperations();
  renderAdminDashboard();
  renderAdminAnalytics();
  renderProfile("Admin");
}

function bindNavigation() {
  qsa(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      setView(state.activeView);
    });
  });

  qsa("[data-jump-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.jumpView;
      setView(state.activeView);
    });
  });
}

function bindSettings() {
  qs("#apiBaseUrl").value = state.apiBaseUrl;
  qs("#apiBaseUrl").addEventListener("change", (event) => {
    setApiBaseUrl(event.target.value);
    showToast(`Backend set to ${state.apiBaseUrl}`);
    refreshAdmin();
  });

  qs("#checkBackendBtn")?.addEventListener("click", (event) => renderBackendStatus(event.currentTarget));
  qs("#refreshAppBtn")?.addEventListener("click", async (event) => {
    setBusy(event.currentTarget, true, "Refreshing...");
    await refreshAdmin();
    await renderBackendStatus();
    setBusy(event.currentTarget, false);
    showToast("Admin data refreshed");
  });

  qs("#searchInput").addEventListener("input", async (event) => {
    if (event.target.value.trim()) {
      state.selectedCategoryId = "";
    }
    await loadProducts(event.target.value.trim());
    renderSummary(state);
    renderAdminOperations();
    renderAdminDashboard();
  });

  qs("#sortProducts").addEventListener("change", () => {
    sortProducts();
    renderProducts();
    renderAdminOperations();
    renderAdminDashboard();
    renderAdminAnalytics();
  });

  window.addEventListener("freshcart:admin-orders-loaded", () => {
    renderAdminOperations();
    renderAdminDashboard();
    renderAdminAnalytics();
  });
}

async function renderBackendStatus(button) {
  const status = qs("#backendStatus");
  if (!status) return;
  setBusy(button, true, "Checking...");
  status.textContent = "Checking";
  status.className = "chip neutral";
  const online = await checkBackendHealth();
  status.textContent = online ? "Online" : "Offline";
  status.className = online ? "chip online" : "chip danger";
  setBusy(button, false);
}

function renderAdminOperations() {
  const inventoryHealth = qs("#inventoryHealth");
  const fulfillmentQueue = qs("#fulfillmentQueue");
  if (!inventoryHealth || !fulfillmentQueue) return;

  const lowStock = state.products.filter((product) => Number(product.stockQuantity || 0) <= 5).length;
  inventoryHealth.textContent = state.products.length
    ? `${lowStock} low-stock items from ${state.products.length} products`
    : "No products loaded";

  if (state.user?.role !== "ADMIN") {
    fulfillmentQueue.textContent = "Login as admin to load orders";
    return;
  }

  const openOrders = state.orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status)).length;
  fulfillmentQueue.textContent = `${openOrders} active orders need attention`;
}

function renderAdminDashboard() {
  const lowStockList = qs("#lowStockList");
  const lowStockCount = qs("#lowStockCount");
  const activeOrderList = qs("#activeOrderList");
  const activeOrderCount = qs("#activeOrderCount");
  if (!lowStockList || !lowStockCount || !activeOrderList || !activeOrderCount) return;

  const lowStockProducts = state.products
    .filter((product) => Number(product.stockQuantity || 0) <= 5)
    .slice(0, 5);
  lowStockCount.textContent = `${lowStockProducts.length} items`;
  lowStockList.innerHTML = lowStockProducts.length
    ? lowStockProducts.map((product) => compactItem(
        product.name,
        `${product.categoryName || "Grocery"} - ${product.stockQuantity} left - ${money(product.price)}`
      )).join("")
    : emptyState("Inventory looks healthy.");

  if (state.user?.role !== "ADMIN") {
    activeOrderCount.textContent = "0 active";
    activeOrderList.innerHTML = emptyState("Login as admin to see fulfillment work.");
    return;
  }

  const activeOrders = state.orders
    .filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status))
    .slice(0, 5);
  activeOrderCount.textContent = `${activeOrders.length} active`;
  activeOrderList.innerHTML = activeOrders.length
    ? activeOrders.map((order) => compactItem(
        `Order #${order.id}`,
        `${escapeHtml(order.status)} - ${money(order.totalAmount)} - ${order.deliveryAddress || "No address"}`
      )).join("")
    : emptyState("No active orders right now.");
}

function renderAdminAnalytics() {
  const revenueNode = qs("#analyticsRevenue");
  const todayOrdersNode = qs("#analyticsTodayOrders");
  const averageOrderNode = qs("#analyticsAverageOrder");
  const topProductsList = qs("#topProductsList");
  if (!revenueNode || !todayOrdersNode || !averageOrderNode || !topProductsList) return;

  if (state.user?.role !== "ADMIN") {
    revenueNode.textContent = money(0);
    todayOrdersNode.textContent = "0";
    averageOrderNode.textContent = money(0);
    topProductsList.innerHTML = emptyState("Login as admin to see store analytics.");
    return;
  }

  const revenueOrders = state.orders.filter((order) => !["CANCELLED"].includes(order.status));
  const revenue = revenueOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const todayKey = new Date().toDateString();
  const todayOrders = state.orders.filter((order) => new Date(order.createdAt).toDateString() === todayKey);
  const averageOrder = revenueOrders.length ? revenue / revenueOrders.length : 0;

  revenueNode.textContent = money(revenue);
  todayOrdersNode.textContent = String(todayOrders.length);
  averageOrderNode.textContent = money(averageOrder);

  const productTotals = new Map();
  state.orders
    .filter((order) => order.status !== "CANCELLED")
    .flatMap((order) => order.items || [])
    .forEach((item) => {
      const current = productTotals.get(item.productName) || { quantity: 0, revenue: 0 };
      current.quantity += Number(item.quantity || 0);
      current.revenue += Number(item.lineTotal || 0);
      productTotals.set(item.productName, current);
    });

  const topProducts = [...productTotals.entries()]
    .map(([name, totals]) => ({ name, ...totals }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const maxQuantity = Math.max(...topProducts.map((item) => item.quantity), 1);

  topProductsList.innerHTML = topProducts.length
    ? topProducts.map((item) => `
        <div class="analytics-bar">
          <div class="row-between">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="muted">${item.quantity} sold - ${money(item.revenue)}</span>
          </div>
          <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width: ${Math.max(8, (item.quantity / maxQuantity) * 100)}%"></div></div>
        </div>
      `).join("")
    : emptyState("Top products will appear after orders are placed.");
}

document.addEventListener("DOMContentLoaded", async () => {
  setAuthChangeHandler(refreshAdmin);
  state.appRole = "ADMIN";
  state.activeView = "dashboard";
  bindNavigation();
  bindSettings();
  bindAdminForms();
  bindProductDetails();
  setView(state.activeView);
  await refreshAdmin();
  await renderBackendStatus();
  setView(state.activeView);
});

import { loadCategories } from "./admin/admin.js?v=20260529-razorpay-errors";
import { checkBackendHealth } from "./core/api.js?v=20260529-razorpay-errors";
import { renderAuth, setAuthChangeHandler } from "./auth/auth.js?v=20260529-razorpay-errors";
import { renderProfile } from "./core/profile.js?v=20260529-razorpay-errors";
import { bindCartActions, loadCart } from "./user/cart.js?v=20260529-razorpay-errors";
import { loadOrders } from "./user/orders.js?v=20260529-razorpay-errors";
import { bindProductDetails, loadProducts, renderProducts, sortProducts } from "./user/products.js?v=20260529-razorpay-errors";
import { setApiBaseUrl, state } from "./core/state.js?v=20260529-razorpay-errors";
import { compactItem, emptyState, money, qsa, qs, renderSummary, setBusy, setView, showToast } from "./core/ui.js?v=20260529-razorpay-errors";

export async function refreshAll() {
  renderAuth({
    appRole: "CUSTOMER",
    title: "Customer Login",
    message: "Login or register to shop groceries and track orders.",
    registerRole: "customer",
  });
  await Promise.allSettled([
    loadProducts(qs("#searchInput")?.value.trim() || ""),
    loadCategories(),
    loadCart(),
    loadOrders(),
  ]);
  renderSummary(state);
  renderShoppingAssist();
  renderProfile("Customer");
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
    refreshAll();
  });

  qs("#checkBackendBtn")?.addEventListener("click", (event) => renderBackendStatus(event.currentTarget));
  qs("#refreshAppBtn")?.addEventListener("click", async (event) => {
    setBusy(event.currentTarget, true, "Refreshing...");
    await refreshAll();
    await renderBackendStatus();
    setBusy(event.currentTarget, false);
    showToast("Store refreshed");
  });

  qs("#searchInput").addEventListener("input", async (event) => {
    if (event.target.value.trim()) {
      state.selectedCategoryId = "";
    }
    await loadProducts(event.target.value.trim());
    renderSummary(state);
    renderShoppingAssist();
  });

  qs("#sortProducts").addEventListener("change", () => {
    sortProducts();
    renderProducts();
    renderShoppingAssist();
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

function renderShoppingAssist() {
  const assist = qs("#shoppingAssist");
  const status = qs("#assistStatus");
  if (!assist || !status) return;

  if (!state.user) {
    status.textContent = "Login";
    assist.innerHTML = emptyState("Create a demo customer to use cart, checkout, and order tracking.");
    return;
  }

  if (state.cart.length) {
    const total = state.cart.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    status.textContent = `${state.cart.length} lines`;
    assist.innerHTML = compactItem(
      "Cart ready for checkout",
      `${state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} items - ${money(total)} subtotal`,
      `<div class="compact-actions"><button class="btn secondary" data-jump-view="cart">Review cart</button></div>`
    );
    bindJumpButtons();
    return;
  }

  if (state.orders.length) {
    const latest = [...state.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    status.textContent = "Tracking";
    assist.innerHTML = compactItem(
      `Latest order #${latest.id}`,
      `${latest.status} - ${money(latest.totalAmount)}`,
      `<div class="compact-actions"><button class="btn secondary" data-jump-view="orders">Track order</button></div>`
    );
    bindJumpButtons();
    return;
  }

  const firstProduct = state.products.find((product) => Number(product.stockQuantity || 0) > 0);
  status.textContent = "Ready";
  assist.innerHTML = firstProduct
    ? compactItem("Start with a fresh pick", `${firstProduct.name} - ${money(firstProduct.price)} - ${firstProduct.stockQuantity} in stock`)
    : emptyState("Products will appear here when the catalog is available.");
}

function bindJumpButtons() {
  qsa("[data-jump-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.jumpView;
      setView(state.activeView);
    }, { once: true });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setAuthChangeHandler(refreshAll);
  state.appRole = "CUSTOMER";
  state.activeView = "products";
  bindNavigation();
  bindSettings();
  bindCartActions();
  bindProductDetails();
  setView(state.activeView);
  await refreshAll();
  await renderBackendStatus();
  setView(state.activeView);
});

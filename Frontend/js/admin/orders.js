import { api } from "../core/api.js?v=20260529-razorpay-errors";
import { state } from "../core/state.js?v=20260529-razorpay-errors";
import { backendHelp, emptyState, escapeHtml, loadingRows, money, qs, renderSummary, setBusy, showToast, statusChip } from "../core/ui.js?v=20260529-razorpay-errors";
import { downloadInvoice, openOrderReceipt } from "../core/receipt.js?v=20260529-razorpay-errors";

const ORDER_STATUSES = ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const ACTIVE_STATUSES = ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY"];
let orderFilter = "ACTIVE";

export async function loadAdminOrders() {
  if (state.user?.role !== "ADMIN") {
    state.orders = [];
    renderAdminOrders();
    renderSummary(state);
    return;
  }

  try {
    qs("#ordersList").innerHTML = loadingRows(3);
    state.orders = await api("/api/orders");
  } catch (error) {
    state.orders = [];
    qs("#ordersList").innerHTML = emptyState(backendHelp(error));
    renderSummary(state);
    return;
  }

  renderAdminOrders();
  renderSummary(state);
  window.dispatchEvent(new CustomEvent("freshcart:admin-orders-loaded"));
}

export function renderAdminOrders() {
  const list = qs("#ordersList");
  if (!list) return;

  if (state.user?.role !== "ADMIN") {
    list.innerHTML = emptyState("Login as admin to view store orders.");
    return;
  }

  bindOrderFilters();
  const visibleOrders = filterOrders(state.orders);

  if (!visibleOrders.length) {
    list.innerHTML = emptyState(state.orders.length ? "No orders match this filter." : "No orders yet.");
    return;
  }

  list.innerHTML = visibleOrders.map((order) => `
    <article class="order-card">
      <div class="row-between">
        <strong>Order #${order.id}</strong>
        ${statusChip(order.status)}
      </div>
      <div class="muted">Customer #${order.userId} - ${escapeHtml(order.deliveryAddress)}</div>
      ${orderMeta(order)}
      <div class="row-between">
        <span>${new Date(order.createdAt).toLocaleString()}</span>
        <strong>${money(order.totalAmount)}</strong>
      </div>
      ${orderLines(order)}
      <div class="order-note">${escapeHtml(orderFulfillmentNote(order.status))}</div>
      <div class="order-controls">
        <select class="qty-input" data-order-status="${order.id}">
          ${ORDER_STATUSES.map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status.replaceAll("_", " ")}</option>`).join("")}
        </select>
        <button class="btn secondary" data-update-order="${order.id}">Update</button>
        ${nextStatus(order.status) ? `<button class="btn" data-advance-order="${order.id}">${nextStatusLabel(order.status)}</button>` : `<button class="btn secondary" disabled>Closed</button>`}
        <button class="btn secondary" data-fill-order="${order.id}">Desk</button>
      </div>
      <div class="compact-actions">
        <button class="btn secondary" data-view-receipt="${order.id}">Receipt</button>
        <button class="btn secondary" data-download-order-invoice="${order.id}">Invoice</button>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-update-order]").forEach((button) => {
    button.addEventListener("click", () => updateOrderStatus(Number(button.dataset.updateOrder)));
  });

  list.querySelectorAll("[data-advance-order]").forEach((button) => {
    button.addEventListener("click", () => advanceOrderStatus(Number(button.dataset.advanceOrder)));
  });

  list.querySelectorAll("[data-fill-order]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = qs("#orderStatusForm input[name='orderId']");
      if (input) input.value = button.dataset.fillOrder;
    });
  });
  list.querySelectorAll("[data-view-receipt]").forEach((button) => {
    button.addEventListener("click", () => openOrderReceipt(orderById(button.dataset.viewReceipt), "Admin receipt"));
  });
  list.querySelectorAll("[data-download-order-invoice]").forEach((button) => {
    button.addEventListener("click", () => downloadInvoice(orderById(button.dataset.downloadOrderInvoice)));
  });
}

function orderById(orderId) {
  return state.orders.find((order) => Number(order.id) === Number(orderId));
}

function orderMeta(order) {
  return `
    <div class="order-meta-grid">
      <div>
        <span>Delivery slot</span>
        <strong>${escapeHtml(order.deliverySlot || "Today, 30-45 min")}</strong>
      </div>
      <div>
        <span>Payment</span>
        <strong>${escapeHtml(order.paymentMethod || "Cash on delivery")}</strong>
      </div>
    </div>
  `;
}

function orderLines(order) {
  if (!order.items?.length) {
    return `<div class="order-note">Item details will appear after the backend is restarted with the latest order API.</div>`;
  }

  return `
    <div class="order-lines">
      ${order.items.map((item) => `
        <div class="order-line">
          <span><strong>${escapeHtml(item.productName)}</strong> x ${item.quantity} @ ${money(item.priceAtPurchase)}</span>
          <strong>${money(item.lineTotal)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

export function bindAdminOrderFilters() {
  bindOrderFilters();
}

function bindOrderFilters() {
  document.querySelectorAll("[data-admin-order-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminOrderFilter === orderFilter);
    button.onclick = () => {
      orderFilter = button.dataset.adminOrderFilter;
      renderAdminOrders();
    };
  });
}

function filterOrders(orders) {
  if (orderFilter === "ALL") return orders;
  if (orderFilter === "ACTIVE") return orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  if (orderFilter === "DONE") return orders.filter((order) => ["DELIVERED", "CANCELLED"].includes(order.status));
  return orders.filter((order) => order.status === orderFilter);
}

function nextStatus(status) {
  const index = ACTIVE_STATUSES.indexOf(status);
  if (index < 0 || index === ACTIVE_STATUSES.length - 1) {
    return status === "OUT_FOR_DELIVERY" ? "DELIVERED" : "";
  }
  return ACTIVE_STATUSES[index + 1];
}

function nextStatusLabel(status) {
  const next = nextStatus(status);
  if (next === "OUT_FOR_DELIVERY") return "Dispatch";
  if (next === "DELIVERED") return "Deliver";
  return "Advance";
}

function orderFulfillmentNote(status) {
  if (status === "PLACED") return "New order. Confirm availability before packing.";
  if (status === "CONFIRMED") return "Confirmed. Move this order to packing when items are ready.";
  if (status === "PACKED") return "Packed. Dispatch when the delivery partner picks it up.";
  if (status === "OUT_FOR_DELIVERY") return "Out for delivery. Mark delivered after handoff.";
  if (status === "DELIVERED") return "Completed order.";
  if (status === "CANCELLED") return "Cancelled order. No fulfillment action needed.";
  return "Review order status.";
}

async function advanceOrderStatus(orderId) {
  const order = state.orders.find((item) => Number(item.id) === Number(orderId));
  const status = nextStatus(order?.status);
  const button = qs(`[data-advance-order="${orderId}"]`);
  if (!status) return;

  try {
    setBusy(button, true, "Saving...");
    await api(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    showToast(`Order #${orderId} moved to ${status.replaceAll("_", " ")}`);
    await loadAdminOrders();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

async function updateOrderStatus(orderId) {
  const button = qs(`[data-update-order="${orderId}"]`);
  const status = qs(`[data-order-status="${orderId}"]`)?.value;
  if (!status) return;

  try {
    setBusy(button, true, "Updating...");
    await api(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    showToast(`Order #${orderId} moved to ${status.replaceAll("_", " ")}`);
    await loadAdminOrders();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

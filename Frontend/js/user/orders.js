import { api } from "../core/api.js?v=20260529-razorpay-errors";
import { state } from "../core/state.js?v=20260529-razorpay-errors";
import { backendHelp, emptyState, escapeHtml, loadingRows, money, qs, renderSummary, setBusy, showToast, statusChip } from "../core/ui.js?v=20260529-razorpay-errors";
import { downloadInvoice, openOrderReceipt } from "../core/receipt.js?v=20260529-razorpay-errors";
import { disconnectOrderUpdates, subscribeToOrderUpdates } from "../realtime/orderSocket.js?v=20260529-razorpay-errors";

const ORDER_STEPS = [
  "PLACED",
  "CONFIRMED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];
const ACTIVE_STATUSES = ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY"];
let orderFilter = "ALL";

export async function loadOrders() {
  if (!state.user) {
    state.orders = [];
    disconnectOrderUpdates();
    renderOrders();
    renderSummary(state);
    return;
  }
  qs("#ordersList").innerHTML = loadingRows(3);
  try {
    state.orders = await api(`/api/orders/user/${state.user.id}`);
  } catch (error) {
    state.orders = [];
    qs("#ordersList").innerHTML = emptyState(backendHelp(error));
    renderSummary(state);
    return;
  }
  renderOrders();
  renderSummary(state);
  subscribeToOrderUpdates(state.orders, renderOrders);
}

export function renderOrders() {
  const list = qs("#ordersList");
  if (!state.user) {
    list.innerHTML = emptyState("Login to view your orders.");
    return;
  }
  bindCustomerOrderFilters();
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
      <div class="muted">${escapeHtml(order.deliveryAddress)}</div>
      ${orderMeta(order)}
      <div class="row-between">
        <span>${new Date(order.createdAt).toLocaleString()}</span>
        <strong>${money(order.totalAmount)}</strong>
      </div>
      ${orderLines(order)}
      <div class="order-note">${escapeHtml(customerOrderNote(order.status))}</div>
      <div class="compact-actions">
        <button class="btn secondary" data-view-receipt="${order.id}">Receipt</button>
        <button class="btn secondary" data-download-order-invoice="${order.id}">Invoice</button>
        ${cancelOrderAction(order)}
      </div>
      ${orderTimeline(order.status)}
    </article>
  `).join("");

  list.querySelectorAll("[data-cancel-order]").forEach((button) => {
    button.addEventListener("click", () => cancelOrder(Number(button.dataset.cancelOrder)));
  });
  list.querySelectorAll("[data-view-receipt]").forEach((button) => {
    button.addEventListener("click", () => openOrderReceipt(orderById(button.dataset.viewReceipt), "Order receipt"));
  });
  list.querySelectorAll("[data-download-order-invoice]").forEach((button) => {
    button.addEventListener("click", () => downloadInvoice(orderById(button.dataset.downloadOrderInvoice)));
  });
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
          <span><strong>${escapeHtml(item.productName)}</strong> x ${item.quantity}</span>
          <strong>${money(item.lineTotal)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

export function bindCustomerOrderFilters() {
  document.querySelectorAll("[data-customer-order-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.customerOrderFilter === orderFilter);
    button.onclick = () => {
      orderFilter = button.dataset.customerOrderFilter;
      renderOrders();
    };
  });
}

function filterOrders(orders) {
  if (orderFilter === "ALL") return orders;
  if (orderFilter === "ACTIVE") return orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  return orders.filter((order) => order.status === orderFilter);
}

function customerOrderNote(status) {
  if (status === "PLACED") return "We received your order. Store confirmation is next.";
  if (status === "CONFIRMED") return "Your items are reserved and will move to packing soon.";
  if (status === "PACKED") return "Packed and waiting for delivery pickup.";
  if (status === "OUT_FOR_DELIVERY") return "Your order is on the way.";
  if (status === "DELIVERED") return "Delivered. Thanks for shopping with FreshCart.";
  if (status === "CANCELLED") return "This order was cancelled.";
  return "Order status is being updated.";
}

function cancelOrderAction(order) {
  if (!["PLACED", "CONFIRMED"].includes(order.status)) return "";
  return `<button class="btn danger" data-cancel-order="${order.id}">Cancel Order</button>`;
}

function orderById(orderId) {
  return state.orders.find((order) => Number(order.id) === Number(orderId));
}

async function cancelOrder(orderId) {
  const confirmed = window.confirm(`Cancel order #${orderId}?`);
  if (!confirmed) return;

  const button = qs(`[data-cancel-order="${orderId}"]`);
  try {
    setBusy(button, true, "Cancelling...");
    await api(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ userId: state.user.id }),
    });
    showToast(`Order #${orderId} cancelled`);
    await loadOrders();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

function orderTimeline(status) {
  if (status === "CANCELLED") {
    return `
      <div class="order-timeline cancelled">
        <div class="timeline-step active">
          <span></span>
          <small>Cancelled</small>
        </div>
      </div>
    `;
  }

  const currentIndex = ORDER_STEPS.indexOf(status);
  return `
    <div class="order-timeline">
      ${ORDER_STEPS.map((step, index) => `
        <div class="timeline-step ${timelineClass(index, currentIndex)}">
          <span></span>
          <small>${formatStatus(step)}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function timelineClass(index, currentIndex) {
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "active";
  return "";
}

function formatStatus(status) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

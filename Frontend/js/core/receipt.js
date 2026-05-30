import { escapeHtml, money, qs } from "./ui.js?v=20260529-razorpay-errors";

export function openOrderReceipt(order, title = "Order receipt") {
  const modal = qs("#productModal");
  const content = qs("#productModalContent");
  if (!modal || !content || !order) return;

  content.innerHTML = `
    <div class="receipt-view">
      <div class="row-between">
        <div>
          <p class="page-kicker">${escapeHtml(title)}</p>
          <h2 id="productModalTitle">Order #${escapeHtml(order.id)}</h2>
          <p class="muted">${new Date(order.createdAt || Date.now()).toLocaleString()}</p>
        </div>
        <span class="chip">${escapeHtml(order.status || "PLACED")}</span>
      </div>
      <div class="profile-grid">
        <div class="profile-field"><span>Delivery address</span><strong>${escapeHtml(order.deliveryAddress || "Not set")}</strong></div>
        <div class="profile-field"><span>Delivery slot</span><strong>${escapeHtml(order.deliverySlot || "Today, 30-45 min")}</strong></div>
        <div class="profile-field"><span>Payment</span><strong>${escapeHtml(order.paymentMethod || "Cash on delivery")}</strong></div>
        <div class="profile-field"><span>Total</span><strong>${money(order.totalAmount || 0)}</strong></div>
      </div>
      ${receiptLines(order)}
      <div class="receipt-total">
        <span>Amount payable</span>
        <strong>${money(order.totalAmount || 0)}</strong>
      </div>
      <div class="compact-actions">
        <button class="btn" type="button" data-download-invoice="${escapeHtml(order.id)}">Download Invoice</button>
        <button class="btn secondary" type="button" data-close-product-modal>Close</button>
      </div>
    </div>
  `;

  qs("[data-download-invoice]")?.addEventListener("click", () => downloadInvoice(order));
  qs("#productModalContent [data-close-product-modal]")?.addEventListener("click", () => {
    modal.hidden = true;
    content.innerHTML = "";
  });
  modal.hidden = false;
}

export function downloadInvoice(order) {
  if (!order) return;
  const blob = new Blob([invoiceText(order)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `freshcart-invoice-${order.id}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function receiptLines(order) {
  if (!order.items?.length) {
    return `<div class="order-note">Item details are unavailable for this order response.</div>`;
  }

  return `
    <div class="order-lines receipt-lines">
      ${order.items.map((item) => `
        <div class="order-line">
          <span><strong>${escapeHtml(item.productName)}</strong> x ${escapeHtml(item.quantity)}</span>
          <strong>${money(item.lineTotal)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function invoiceText(order) {
  const lines = [
    "FreshCart Invoice",
    `Order: #${order.id}`,
    `Date: ${new Date(order.createdAt || Date.now()).toLocaleString()}`,
    `Status: ${order.status || "PLACED"}`,
    `Delivery address: ${order.deliveryAddress || "Not set"}`,
    `Delivery slot: ${order.deliverySlot || "Today, 30-45 min"}`,
    `Payment: ${order.paymentMethod || "Cash on delivery"}`,
    "",
    "Items:",
  ];

  if (order.items?.length) {
    order.items.forEach((item) => {
      lines.push(`- ${item.productName} x ${item.quantity}: ${money(item.lineTotal)}`);
    });
  } else {
    lines.push("- Item details unavailable");
  }

  lines.push("", `Total: ${money(order.totalAmount || 0)}`);
  return lines.join("\n");
}

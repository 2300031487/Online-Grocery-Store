let toastTimer;

export function qs(selector) {
  return document.querySelector(selector);
}

export function qsa(selector) {
  return [...document.querySelectorAll(selector)];
}

export function money(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function showToast(message) {
  const toast = qs("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

export function stockChip(stock) {
  if (stock <= 0) return `<span class="chip danger">Out of stock</span>`;
  if (stock <= 5) return `<span class="chip warn">Low stock: ${stock}</span>`;
  return `<span class="chip">In stock: ${stock}</span>`;
}

export function statusChip(status) {
  if (status === "CANCELLED") return `<span class="chip danger">Cancelled</span>`;
  if (status === "DELIVERED") return `<span class="chip">Delivered</span>`;
  if (status === "OUT_FOR_DELIVERY") return `<span class="chip blue">Out for delivery</span>`;
  if (status === "PACKED") return `<span class="chip warn">Packed</span>`;
  return `<span class="chip neutral">${escapeHtml(formatStatus(status))}</span>`;
}

export function formatStatus(status) {
  return String(status || "")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function renderSummary(state) {
  qs("#productCount").textContent = state.products.length;
  qs("#cartCount").textContent = state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  qs("#orderCount").textContent = state.orders.length;
}

export function setView(viewName) {
  qsa(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === viewName));
  qsa(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
}

export function emptyState(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

export function backendHelp(error) {
  const message = error?.message || "The backend request failed.";
  return `${message}. Check that the Spring Boot backend is running and the API base URL is correct.`;
}

export function loadingCards(count = 4) {
  return `
    <div class="skeleton-grid" aria-label="Loading">
      ${Array.from({ length: count }, () => `<div class="skeleton-card"></div>`).join("")}
    </div>
  `;
}

export function loadingRows(count = 3) {
  return Array.from({ length: count }, () => `<div class="skeleton-row" aria-label="Loading"></div>`).join("");
}

export function setBusy(element, busy, label = "Working...") {
  if (!element) return;
  if (busy) {
    element.dataset.originalText = element.textContent;
    element.textContent = label;
    element.disabled = true;
    element.classList.add("is-loading");
    return;
  }
  element.textContent = element.dataset.originalText || element.textContent;
  element.disabled = false;
  element.classList.remove("is-loading");
}

export function compactItem(title, meta = "", actionHtml = "") {
  return `
    <div class="compact-item">
      <strong>${escapeHtml(title)}</strong>
      ${meta ? `<span>${escapeHtml(meta)}</span>` : ""}
      ${actionHtml}
    </div>
  `;
}

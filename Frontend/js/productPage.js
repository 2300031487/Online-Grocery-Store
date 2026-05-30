import { api } from "./core/api.js?v=20260529-razorpay-errors";
import { state } from "./core/state.js?v=20260529-razorpay-errors";
import { emptyState, escapeHtml, money, qs, setBusy, showToast, stockChip } from "./core/ui.js?v=20260529-razorpay-errors";

const productId = Number(new URLSearchParams(window.location.search).get("id") || 0);
let product = null;
let reviews = [];
let orders = [];

document.addEventListener("DOMContentLoaded", async () => {
  qs("#refreshProductBtn")?.addEventListener("click", (event) => loadProductPage(event.currentTarget));
  await loadProductPage();
});

async function loadProductPage(button) {
  const content = qs("#productPageContent");
  if (!productId) {
    content.innerHTML = emptyState("Product not found.");
    return;
  }

  try {
    setBusy(button, true, "Refreshing...");
    const [products, productReviews, customerOrders] = await Promise.all([
      api("/api/products", { auth: false }),
      api(`/api/reviews/product/${productId}`, { auth: false }),
      state.user?.role === "CUSTOMER" ? api(`/api/orders/user/${state.user.id}`) : Promise.resolve([]),
    ]);
    product = products.find((item) => Number(item.id) === productId);
    reviews = productReviews;
    orders = customerOrders;
    renderProductPage();
  } catch (error) {
    content.innerHTML = emptyState(error.message);
  } finally {
    setBusy(button, false);
  }
}

function renderProductPage() {
  if (!product) {
    qs("#productPageContent").innerHTML = emptyState("Product not found.");
    return;
  }

  qs("#productPageTitle").textContent = product.name;
  qs("#productPageContent").innerHTML = `
    <section class="panel product-page-panel">
      <div class="product-detail product-detail-page">
        <img src="${escapeHtml(productImageFor(product))}" alt="${escapeHtml(product.name)}" />
        <div class="product-detail-body">
          <div>
            <h2>${escapeHtml(product.name)}</h2>
            <div class="muted">${escapeHtml(product.categoryName || "Grocery")}</div>
          </div>
          <div class="detail-meta">
            ${stockChip(product.stockQuantity)}
            <span class="chip">${money(product.price)}</span>
            <span class="chip neutral">${escapeHtml(unitLabel(product))}</span>
          </div>
          <div class="checkout-breakdown">
            <div><span>Unit price</span><strong>${money(product.price)}</strong></div>
            <div><span>Delivery</span><strong>${Number(product.price || 0) >= 499 ? "Free" : "Rs 29.00 under Rs 499 cart"}</strong></div>
            <div class="grand-total"><span>Stock</span><strong>${escapeHtml(product.stockQuantity)} available</strong></div>
          </div>
          <p class="muted">${escapeHtml(product.description || "Fresh grocery item ready for your cart.")}</p>
          ${customerActions()}
          ${reviewGate()}
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="row-between">
        <h3>Ratings and Comments</h3>
        <span class="chip">${reviews.length} reviews</span>
      </div>
      <div class="review-list">${reviewList()}</div>
    </section>
  `;

  qs("#productPageContent img")?.addEventListener("error", (event) => {
    event.currentTarget.src = "assets/products/default.svg";
  }, { once: true });
  qs("#productPageAddBtn")?.addEventListener("click", addToCart);
  qs("#productPageReviewForm")?.addEventListener("submit", submitReview);
}

function customerActions() {
  if (state.user?.role !== "CUSTOMER") {
    return `<div class="order-note">Login as a customer in the customer app to add this item to cart.</div>`;
  }
  return `
    <div class="detail-actions">
      <input class="qty-input" id="productPageQty" type="number" min="1" max="${product.stockQuantity}" value="1" />
      <button class="btn" id="productPageAddBtn" ${product.stockQuantity <= 0 ? "disabled" : ""}>Add to Cart</button>
    </div>
  `;
}

function reviewGate() {
  if (state.user?.role !== "CUSTOMER") {
    return `<div class="order-note">Only customers who received this product can leave a rating.</div>`;
  }
  if (!canReviewProduct()) {
    return `<div class="order-note">You can rate this product after a delivered order contains it.</div>`;
  }
  return `
    <form id="productPageReviewForm" class="form-grid">
      <div class="two-col">
        <label class="field">
          <span>Rating</span>
          <select name="rating">
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - Okay</option>
            <option value="2">2 - Poor</option>
            <option value="1">1 - Bad</option>
          </select>
          <small class="field-error" data-field-error="rating"></small>
        </label>
      </div>
      <label class="field">
        <span>Comment</span>
        <textarea name="comment" maxlength="400" placeholder="Share your experience"></textarea>
        <small class="field-error" data-field-error="comment"></small>
      </label>
      <button class="btn secondary" type="submit">Submit Rating</button>
    </form>
  `;
}

function canReviewProduct() {
  return orders.some((order) =>
    order.status === "DELIVERED" &&
    (order.items || []).some((item) => Number(item.productId) === Number(product.id))
  );
}

function reviewList() {
  if (!reviews.length) return emptyState("No ratings yet.");
  return reviews.map((review) => `
    <div class="review-card">
      <div class="row-between">
        <strong>${escapeHtml(review.customerName)}</strong>
        <span class="rating-stars">${"*".repeat(review.rating)}${"-".repeat(5 - review.rating)}</span>
      </div>
      <span class="muted">${escapeHtml(review.comment)}</span>
    </div>
  `).join("");
}

async function addToCart(event) {
  const quantity = Number(qs("#productPageQty")?.value || 1);
  if (quantity < 1 || quantity > Number(product.stockQuantity || 0)) {
    showToast(`Choose between 1 and ${product.stockQuantity}.`);
    return;
  }
  try {
    setBusy(event.currentTarget, true, "Adding...");
    await api("/api/cart/items", {
      method: "POST",
      body: JSON.stringify({ userId: state.user.id, productId: product.id, quantity }),
    });
    showToast("Added to cart");
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(event.currentTarget, false);
  }
}

async function submitReview(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const button = formElement.querySelector("button[type='submit']");
  clearFieldErrors(formElement);
  try {
    setBusy(button, true, "Submitting...");
    await api("/api/reviews", {
      method: "POST",
      body: JSON.stringify({
        userId: state.user.id,
        productId: product.id,
        rating: Number(form.get("rating")),
        comment: form.get("comment"),
      }),
    });
    showToast("Review submitted");
    await loadProductPage();
  } catch (error) {
    showFieldErrors(formElement, error.validationErrors);
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

function clearFieldErrors(formElement) {
  formElement.querySelectorAll(".field.has-error").forEach((field) => field.classList.remove("has-error"));
  formElement.querySelectorAll("[data-field-error]").forEach((node) => {
    node.textContent = "";
    node.classList.remove("show");
  });
}

function showFieldErrors(formElement, validationErrors = {}) {
  Object.entries(validationErrors || {}).forEach(([field, message]) => {
    const node = formElement.querySelector(`[data-field-error="${field}"]`);
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    node.closest(".field")?.classList.add("has-error");
  });
}

function productImageFor(item) {
  if (item.imageUrl) return item.imageUrl;
  const text = `${item.name || ""} ${item.categoryName || ""}`.toLowerCase();
  if (text.includes("apple")) return "assets/products/apple.svg";
  if (text.includes("mango")) return "assets/products/mango.svg";
  if (text.includes("tomato")) return "assets/products/tomato.svg";
  if (text.includes("milk") || text.includes("dairy")) return "assets/products/dairy.svg";
  if (text.includes("bread") || text.includes("bakery")) return "assets/products/bakery.svg";
  if (text.includes("vegetable")) return "assets/products/vegetable.svg";
  return "assets/products/default.svg";
}

function unitLabel(item) {
  const text = `${item.name || ""} ${item.categoryName || ""}`.toLowerCase();
  if (text.includes("milk") || text.includes("curd")) return "Per pack";
  if (text.includes("bread") || text.includes("cake")) return "Bakery fresh";
  if (text.includes("apple") || text.includes("mango") || text.includes("tomato") || text.includes("vegetable")) return "Handpicked";
  return "Daily essential";
}

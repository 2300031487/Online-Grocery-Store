import { api } from "../core/api.js?v=20260529-razorpay-errors";
import { state } from "../core/state.js?v=20260529-razorpay-errors";
import { backendHelp, emptyState, escapeHtml, loadingCards, money, qs, renderSummary, setBusy, showToast, stockChip } from "../core/ui.js?v=20260529-razorpay-errors";
import { loadCart } from "./cart.js?v=20260529-razorpay-errors";

export async function loadProducts(search = "") {
  qs("#productGrid").innerHTML = loadingCards();
  try {
    if (state.selectedCategoryId && !search) {
      state.products = await api(`/api/products/category/${state.selectedCategoryId}`, { auth: false });
    } else {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      state.products = await api(`/api/products${query}`, { auth: false });
    }
    sortProducts();
  } catch (error) {
    state.products = [];
    qs("#productGrid").innerHTML = emptyState(backendHelp(error));
    renderSummary(state);
    return;
  }
  renderProducts();
  renderSummary(state);
}

export function renderCategoryStrip() {
  const strip = qs("#categoryStrip");
  if (!strip) return;

  const buttons = [
    `<button class="category-pill ${state.selectedCategoryId === "" ? "active" : ""}" data-category-id="">All</button>`,
    ...state.categories.map((category) => `
      <button class="category-pill ${String(category.id) === String(state.selectedCategoryId) ? "active" : ""}" data-category-id="${category.id}">
        ${escapeHtml(category.name)}
      </button>
    `),
  ];

  strip.innerHTML = buttons.join("");
  strip.querySelectorAll("[data-category-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedCategoryId = button.dataset.categoryId;
      qs("#searchInput").value = "";
      renderCategoryStrip();
      await loadProducts();
    });
  });
}

export function renderProducts() {
  const grid = qs("#productGrid");
  if (!state.products.length) {
    grid.innerHTML = emptyState("No products yet. Login as admin and create your first grocery item.");
    return;
  }

  grid.innerHTML = state.products.map((product) => `
    <article class="product-card">
      <div class="product-media">
        <img class="product-image" src="${escapeHtml(productImageFor(product))}" alt="${escapeHtml(product.name)}" loading="lazy" />
        <span class="product-badge">${escapeHtml(productBadge(product))}</span>
      </div>
      <div class="product-top">
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <span class="muted">${escapeHtml(product.categoryName || "Grocery")}</span>
        </div>
        <div class="product-icon" aria-hidden="true"></div>
      </div>
      <p>${escapeHtml(product.description || "Fresh grocery item ready for your cart.")}</p>
      <div class="price-row">
        <span class="price">${money(product.price)}</span>
        ${stockChip(product.stockQuantity)}
      </div>
      <div class="product-meta">
        <span class="chip neutral">Same-day slot</span>
        <span class="chip neutral">${escapeHtml(unitLabel(product))}</span>
      </div>
      <a class="btn text" href="product.html?id=${product.id}">View details</a>
      ${customerProductActions(product)}
      ${adminProductActions(product)}
    </article>
  `).join("");

  document.querySelectorAll("[data-add-product]").forEach((button) => {
    button.addEventListener("click", () => addToCart(Number(button.dataset.addProduct)));
  });

  document.querySelectorAll("[data-delete-product]").forEach((button) => {
    button.addEventListener("click", () => deleteProduct(Number(button.dataset.deleteProduct)));
  });

  document.querySelectorAll("[data-save-product]").forEach((button) => {
    button.addEventListener("click", () => updateProduct(Number(button.dataset.saveProduct)));
  });

  document.querySelectorAll(".product-image").forEach((image) => {
    image.addEventListener("error", () => {
      image.src = "assets/products/default.svg";
      image.closest(".product-card")?.classList.add("image-fallback");
    }, { once: true });
  });
}

export function sortProducts() {
  const sortValue = qs("#sortProducts")?.value || "featured";
  const sorted = [...state.products];

  if (sortValue === "price-asc") {
    sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }

  if (sortValue === "price-desc") {
    sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }

  if (sortValue === "stock-desc") {
    sorted.sort((a, b) => Number(b.stockQuantity || 0) - Number(a.stockQuantity || 0));
  }

  state.products = sorted;
}

export function bindProductDetails() {
  document.querySelectorAll("[data-close-product-modal]").forEach((node) => {
    node.addEventListener("click", closeProductDetails);
  });
}

async function openProductDetails(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  qs("#productModalContent").innerHTML = `
    <div class="product-detail">
      <img src="${escapeHtml(productImageFor(product))}" alt="${escapeHtml(product.name)}" />
      <div class="product-detail-body">
        <div>
          <h2 id="productModalTitle">${escapeHtml(product.name)}</h2>
          <div class="muted">${escapeHtml(product.categoryName || "Grocery")}</div>
        </div>
        <div class="detail-meta">
          ${stockChip(product.stockQuantity)}
          <span class="chip">${money(product.price)}</span>
        </div>
        <p class="muted">${escapeHtml(product.description || "Fresh grocery item ready for your cart.")}</p>
        ${state.appRole === "CUSTOMER" ? `
          <div class="detail-actions">
            <input class="qty-input" type="number" min="1" max="${product.stockQuantity}" value="1" id="detailQty-${product.id}" />
            <button class="btn" data-detail-add-product="${product.id}" ${product.stockQuantity <= 0 ? "disabled" : ""}>Add to Cart</button>
          </div>
          ${reviewForm(product)}
        ` : ""}
        <div class="review-list" id="productReviews">Loading reviews...</div>
      </div>
    </div>
  `;

  const modalImage = qs("#productModalContent .product-detail img");
  modalImage.addEventListener("error", () => {
    modalImage.src = "assets/products/default.svg";
  }, { once: true });

  qs("[data-detail-add-product]")?.addEventListener("click", async () => {
    const detailQty = qs(`#detailQty-${product.id}`);
    const cardQty = qs(`#qty-${product.id}`);
    if (cardQty && detailQty) cardQty.value = detailQty.value;
    await addToCart(product.id);
    closeProductDetails();
  });

  qs("#reviewForm")?.addEventListener("submit", (event) => submitReview(event, product.id));

  qs("#productModal").hidden = false;
  await loadProductReviews(product.id);
}

function closeProductDetails() {
  qs("#productModal").hidden = true;
  qs("#productModalContent").innerHTML = "";
}

function adminProductActions(product) {
  if (state.appRole !== "ADMIN" || state.user?.role !== "ADMIN") return "";
  return `
    <div class="admin-card-actions">
      <div class="inventory-edit">
        <label class="field">
          <span>Price</span>
          <input class="qty-input" type="number" min="0.01" step="0.01" value="${Number(product.price || 0).toFixed(2)}" id="editPrice-${product.id}" />
        </label>
        <label class="field">
          <span>Stock</span>
          <input class="qty-input" type="number" min="0" value="${product.stockQuantity}" id="editStock-${product.id}" />
        </label>
      </div>
      <button class="btn secondary full" data-save-product="${product.id}">Save Changes</button>
      <button class="btn danger full" data-delete-product="${product.id}">Delete Product</button>
    </div>
  `;
}

function customerProductActions(product) {
  if (state.appRole !== "CUSTOMER") return "";
  return `
    <div class="card-actions">
      <input class="qty-input" type="number" min="1" max="${product.stockQuantity}" value="1" id="qty-${product.id}" />
      <button class="btn" data-add-product="${product.id}" ${product.stockQuantity <= 0 ? "disabled" : ""}>Add</button>
    </div>
  `;
}

function reviewForm(product) {
  if (state.user?.role !== "CUSTOMER") {
    return `<div class="order-note">Login as a customer to rate and comment on this product.</div>`;
  }
  if (!canReviewProduct(product.id)) {
    return `<div class="order-note">You can rate this product after it appears in your delivered order history.</div>`;
  }
  return `
    <form id="reviewForm" class="form-grid">
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
        <label class="field">
          <span>Product</span>
          <input value="${escapeHtml(product.name)}" disabled />
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

function canReviewProduct(productId) {
  return state.orders.some((order) =>
    order.status === "DELIVERED" &&
    (order.items || []).some((item) => Number(item.productId) === Number(productId))
  );
}

async function loadProductReviews(productId) {
  const list = qs("#productReviews");
  if (!list) return;
  try {
    const reviews = await api(`/api/reviews/product/${productId}`, { auth: false });
    list.innerHTML = reviews.length
      ? reviews.map((review) => `
          <div class="review-card">
            <div class="row-between">
              <strong>${escapeHtml(review.customerName)}</strong>
              <span class="rating-stars">${"*".repeat(review.rating)}${"-".repeat(5 - review.rating)}</span>
            </div>
            <span class="muted">${escapeHtml(review.comment)}</span>
          </div>
        `).join("")
      : emptyState("No ratings yet. Be the first to comment.");
  } catch (error) {
    list.innerHTML = emptyState(backendHelp(error));
  }
}

async function submitReview(event, productId) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const button = formElement.querySelector("button[type='submit']");
  formElement.querySelectorAll(".field.has-error").forEach((field) => field.classList.remove("has-error"));
  formElement.querySelectorAll("[data-field-error]").forEach((node) => {
    node.textContent = "";
    node.classList.remove("show");
  });

  try {
    setBusy(button, true, "Submitting...");
    await api("/api/reviews", {
      method: "POST",
      body: JSON.stringify({
        userId: state.user.id,
        productId,
        rating: Number(form.get("rating")),
        comment: form.get("comment"),
      }),
    });
    formElement.reset();
    showToast("Review submitted");
    await loadProductReviews(productId);
  } catch (error) {
    Object.entries(error.validationErrors || {}).forEach(([field, message]) => {
      const node = formElement.querySelector(`[data-field-error="${field}"]`);
      if (!node) return;
      node.textContent = message;
      node.classList.add("show");
      node.closest(".field")?.classList.add("has-error");
    });
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

function productBadge(product) {
  const stock = Number(product.stockQuantity || 0);
  if (stock <= 0) return "Unavailable";
  if (stock <= 5) return "Selling fast";
  if (Number(product.price || 0) <= 50) return "Value pick";
  return "Fresh pick";
}

function unitLabel(product) {
  const text = `${product.name || ""} ${product.categoryName || ""}`.toLowerCase();
  if (text.includes("milk") || text.includes("curd")) return "Per pack";
  if (text.includes("bread") || text.includes("cake")) return "Bakery fresh";
  if (text.includes("apple") || text.includes("mango") || text.includes("tomato") || text.includes("vegetable")) return "Handpicked";
  return "Daily essential";
}

function productImageFor(product) {
  if (product.imageUrl) return product.imageUrl;

  const text = `${product.name || ""} ${product.categoryName || ""}`.toLowerCase();
  if (text.includes("apple")) return "assets/products/apple.svg";
  if (text.includes("mango")) return "assets/products/mango.svg";
  if (text.includes("tomato")) return "assets/products/tomato.svg";
  if (text.includes("milk") || text.includes("curd") || text.includes("cheese") || text.includes("dairy")) {
    return "assets/products/dairy.svg";
  }
  if (text.includes("bread") || text.includes("bun") || text.includes("cake") || text.includes("bakery")) {
    return "assets/products/bakery.svg";
  }
  if (text.includes("vegetable") || text.includes("carrot") || text.includes("potato") || text.includes("onion")) {
    return "assets/products/vegetable.svg";
  }
  return "assets/products/default.svg";
}

async function addToCart(productId) {
  if (!state.user) {
    showToast("Login as a customer before adding items.");
    return;
  }
  if (state.appRole === "CUSTOMER" && state.user.role !== "CUSTOMER") {
    showToast("Please use a customer account to add items.");
    return;
  }

  const product = state.products.find((item) => item.id === productId);
  const quantityInput = qs(`#qty-${productId}`);
  const button = qs(`[data-add-product="${productId}"], [data-detail-add-product="${productId}"]`);
  const quantity = Number(quantityInput?.value || 1);
  if (quantity < 1) {
    showToast("Quantity must be at least 1.");
    return;
  }
  if (product && quantity > Number(product.stockQuantity || 0)) {
    showToast(`Only ${product.stockQuantity} in stock.`);
    return;
  }
  try {
    setBusy(button, true, "Adding...");
    await api("/api/cart/items", {
      method: "POST",
      body: JSON.stringify({
        userId: state.user.id,
        productId,
        quantity,
      }),
    });
    showToast("Added to cart");
    await loadCart();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

async function deleteProduct(productId) {
  const product = state.products.find((item) => item.id === productId);
  const confirmed = window.confirm(`Delete ${product?.name || "this product"} from the active catalog?`);
  if (!confirmed) return;

  try {
    await api(`/api/products/${productId}`, { method: "DELETE" });
    showToast("Product deleted from catalog");
    await loadProducts(qs("#searchInput")?.value.trim() || "");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateProduct(productId) {
  const price = Number(qs(`#editPrice-${productId}`)?.value || 0);
  const stockQuantity = Number(qs(`#editStock-${productId}`)?.value || 0);
  const button = qs(`[data-save-product="${productId}"]`);

  if (price <= 0) {
    showToast("Price must be greater than zero.");
    return;
  }
  if (stockQuantity < 0) {
    showToast("Stock cannot be negative.");
    return;
  }

  try {
    setBusy(button, true, "Saving...");
    await api(`/api/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ price, stockQuantity }),
    });
    showToast("Inventory updated");
    await loadProducts(qs("#searchInput")?.value.trim() || "");
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

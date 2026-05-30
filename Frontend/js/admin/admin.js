import { api } from "../core/api.js?v=20260529-razorpay-errors";
import { state } from "../core/state.js?v=20260529-razorpay-errors";
import { escapeHtml, qs, showToast } from "../core/ui.js?v=20260529-razorpay-errors";
import { loadProducts, renderCategoryStrip } from "../user/products.js?v=20260529-razorpay-errors";
import { loadAdminOrders } from "./orders.js?v=20260529-razorpay-errors";

const PRODUCT_DRAFT_KEY = "freshcartProductDraft";
const FALLBACK_IMAGE = "assets/products/default.svg";
const MAX_UPLOAD_SIZE = 1_500_000;
let uploadedProductImage = "";

export async function loadCategories() {
  try {
    state.categories = await api("/api/categories", { auth: false });
  } catch (error) {
    state.categories = [];
    showToast(error.message);
  }
  renderCategoryOptions();
  renderCategoryStrip();
}

export function renderAdminAccess() {
  const adminView = qs("#adminAccess");
  const adminHint = qs("#adminHint");
  if (state.user?.role === "ADMIN") {
    adminView.hidden = false;
    adminHint.hidden = true;
    return;
  }
  adminView.hidden = true;
  adminHint.hidden = false;
}

export function bindAdminForms() {
  const productForm = qs("#productForm");
  hydrateProductDraft(productForm);
  bindProductDraft(productForm);

  qs("#categoryForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api("/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
        }),
      });
      formElement.reset();
      showToast("Category created");
      await loadCategories();
      await loadProducts();
    } catch (error) {
      showToast(error.message);
    }
  });

  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (!form.get("categoryId")) {
      showToast("Create a category before adding products.");
      return;
    }
    try {
      await api("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
          imageUrl: uploadedProductImage || form.get("customImageUrl") || form.get("imageUrl"),
          price: Number(form.get("price")),
          stockQuantity: Number(form.get("stockQuantity")),
          categoryId: Number(form.get("categoryId")),
        }),
      });
      formElement.reset();
      uploadedProductImage = "";
      localStorage.removeItem(PRODUCT_DRAFT_KEY);
      updateProductPreview(formElement);
      showToast("Product created");
      await loadProducts();
    } catch (error) {
      showToast(error.message);
    }
  });

  qs("#orderStatusForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/orders/${form.get("orderId")}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: form.get("status") }),
      });
      showToast("Order status updated");
      await loadAdminOrders();
    } catch (error) {
      showToast(error.message);
    }
  });
}

function renderCategoryOptions() {
  const select = qs("#productCategory");
  if (!select) return;
  const productForm = qs("#productForm");
  const draft = readProductDraft();
  const selectedCategoryId = productForm ? new FormData(productForm).get("categoryId") || draft.categoryId : draft.categoryId;
  const options = state.categories
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
    .join("");
  select.innerHTML = options || `<option value="">Create a category first</option>`;
  select.disabled = !state.categories.length;
  if (selectedCategoryId && state.categories.some((category) => String(category.id) === String(selectedCategoryId))) {
    select.value = selectedCategoryId;
  }
  if (productForm) updateProductPreview(productForm);
}

function bindProductDraft(formElement) {
  if (!formElement) return;
  const preview = qs("#productImagePreview");
  const clearButton = qs("#clearProductDraftBtn");
  const fileInput = qs("#productImageFile");
  formElement.addEventListener("input", () => {
    saveProductDraft(formElement);
    updateProductPreview(formElement);
  });
  formElement.addEventListener("change", () => {
    saveProductDraft(formElement);
    updateProductPreview(formElement);
  });
  if (preview) {
    preview.addEventListener("error", () => {
      preview.src = FALLBACK_IMAGE;
    });
  }
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      formElement.reset();
      uploadedProductImage = "";
      localStorage.removeItem(PRODUCT_DRAFT_KEY);
      updateProductPreview(formElement);
      showToast("Product draft cleared");
    });
  }
  if (fileInput) {
    fileInput.addEventListener("change", () => handleProductImageUpload(fileInput, formElement));
  }
  updateProductPreview(formElement);
}

function hydrateProductDraft(formElement) {
  if (!formElement) return;
  const draft = readProductDraft();
  uploadedProductImage = draft.uploadedProductImage || "";
  Object.entries(draft).forEach(([name, value]) => {
    const control = formElement.elements[name];
    if (control && control.type !== "file" && value !== null && value !== undefined) {
      control.value = value;
    }
  });
}

function readProductDraft() {
  try {
    return JSON.parse(localStorage.getItem(PRODUCT_DRAFT_KEY) || "{}");
  } catch {
    localStorage.removeItem(PRODUCT_DRAFT_KEY);
    return {};
  }
}

function saveProductDraft(formElement) {
  const form = new FormData(formElement);
  const draft = {
    name: form.get("name") || "",
    categoryId: form.get("categoryId") || "",
    description: form.get("description") || "",
    imageUrl: form.get("imageUrl") || "",
    customImageUrl: form.get("customImageUrl") || "",
    uploadedProductImage,
    price: form.get("price") || "",
    stockQuantity: form.get("stockQuantity") || "",
  };
  localStorage.setItem(PRODUCT_DRAFT_KEY, JSON.stringify(draft));
}

function updateProductPreview(formElement) {
  if (!formElement) return;
  const form = new FormData(formElement);
  const preview = qs("#productImagePreview");
  const title = qs("#productPreviewTitle");
  const meta = qs("#productPreviewMeta");
  const imageUrl = uploadedProductImage || form.get("customImageUrl") || form.get("imageUrl") || FALLBACK_IMAGE;
  const productName = form.get("name") || "Product preview";
  const category = formElement.elements.categoryId?.selectedOptions?.[0]?.textContent || "No category selected";
  const price = Number(form.get("price") || 0);
  const stock = Number(form.get("stockQuantity") || 0);
  if (preview && preview.getAttribute("src") !== imageUrl) {
    preview.src = imageUrl;
  }
  if (title) title.textContent = productName;
  if (meta) {
    const priceText = price > 0 ? `Rs ${price.toFixed(2)}` : "No price";
    const stockText = stock > 0 ? `${stock} in stock` : "No stock set";
    meta.textContent = `${category} | ${priceText} | ${stockText}`;
  }
}

function handleProductImageUpload(input, formElement) {
  const file = input.files?.[0];
  if (!file) {
    uploadedProductImage = "";
    saveProductDraft(formElement);
    updateProductPreview(formElement);
    return;
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    input.value = "";
    showToast("Choose an image under 1.5 MB.");
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    uploadedProductImage = String(reader.result || "");
    saveProductDraft(formElement);
    updateProductPreview(formElement);
    showToast("Product image ready");
  });
  reader.addEventListener("error", () => showToast("Could not read image file."));
  reader.readAsDataURL(file);
}

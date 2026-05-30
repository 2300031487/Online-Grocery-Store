import { api } from "../core/api.js?v=20260529-razorpay-errors";
import { setAddressBook, setCheckoutPreferences, state } from "../core/state.js?v=20260529-razorpay-errors";
import { backendHelp, emptyState, escapeHtml, loadingRows, money, qs, renderSummary, setBusy, showToast } from "../core/ui.js?v=20260529-razorpay-errors";
import { openOrderReceipt } from "../core/receipt.js?v=20260529-razorpay-errors";
import { loadOrders } from "./orders.js?v=20260529-razorpay-errors";
import { loadProducts } from "./products.js?v=20260529-razorpay-errors";

export async function loadCart() {
  if (!state.user) {
    state.cart = [];
    renderCart();
    renderSummary(state);
    return;
  }
  qs("#cartList").innerHTML = loadingRows(2);
  try {
    state.cart = await api(`/api/cart/${state.user.id}`);
    if (!state.products.length) {
      await loadProducts();
    }
  } catch (error) {
    state.cart = [];
    qs("#cartList").innerHTML = emptyState(backendHelp(error));
    renderSummary(state);
    return;
  }
  renderCart();
  renderSummary(state);
}

export function renderCart() {
  const list = qs("#cartList");
  const review = qs("#cartReview");
  const total = state.cart.reduce((sum, item) => sum + Number(item.lineTotal), 0);
  const delivery = total > 0 && total < 499 ? 29 : 0;
  qs("#cartTotal").textContent = money(total + delivery);
  qs("#checkoutSubtotal").textContent = money(total);
  qs("#checkoutDelivery").textContent = delivery ? money(delivery) : "Free";
  qs("#checkoutGrand").textContent = money(total + delivery);

  if (!state.user) {
    renderCartReview("Login to start checking cart availability.", "warn");
    list.innerHTML = emptyState("Login to start a cart.");
    return;
  }

  if (!state.cart.length) {
    renderCartReview("Your cart is ready when you add products.", "");
    list.innerHTML = emptyState("Your cart is empty.");
    return;
  }

  const availability = cartAvailability();
  renderCartReview(availability.message, availability.level);

  list.innerHTML = state.cart.map((item) => `
    <div class="cart-row ${cartRowClass(item)}">
      <div class="row-between">
        <strong>${escapeHtml(item.productName)}</strong>
        <span>${money(item.lineTotal)}</span>
      </div>
      <div class="muted">${item.quantity} x ${money(item.price)}${stockMessage(item)}</div>
      <div class="cart-item-actions">
        <input class="qty-input" type="number" min="1" value="${item.quantity}" id="cartQty-${item.id}" />
        <button class="btn secondary" data-update-cart-item="${item.id}">Update</button>
        <button class="btn danger" data-remove-cart-item="${item.id}">Remove</button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll("[data-update-cart-item]").forEach((button) => {
    button.addEventListener("click", () => updateCartItem(Number(button.dataset.updateCartItem)));
  });

  document.querySelectorAll("[data-remove-cart-item]").forEach((button) => {
    button.addEventListener("click", () => removeCartItem(Number(button.dataset.removeCartItem)));
  });
}

function renderCartReview(message, level) {
  const review = qs("#cartReview");
  if (!review) return;
  review.textContent = message;
  review.className = `cart-review show ${level || ""}`.trim();
}

function cartAvailability() {
  const issues = state.cart
    .map((item) => ({ item, product: productForCartItem(item) }))
    .filter(({ item, product }) => product && Number(item.quantity || 0) > Number(product.stockQuantity || 0));

  if (issues.length) {
    return {
      level: "danger",
      message: `${issues.length} cart item needs quantity adjustment before checkout.`,
    };
  }

  const lowStock = state.cart
    .map((item) => ({ item, product: productForCartItem(item) }))
    .filter(({ product }) => product && Number(product.stockQuantity || 0) <= 5);

  if (lowStock.length) {
    return {
      level: "warn",
      message: `${lowStock.length} cart item is low in stock. Checkout soon to avoid changes.`,
    };
  }

  return {
    level: "",
    message: "Cart availability looks good for checkout.",
  };
}

function productForCartItem(item) {
  return state.products.find((product) => Number(product.id) === Number(item.productId));
}

function stockMessage(item) {
  const product = productForCartItem(item);
  if (!product) return "";
  if (Number(item.quantity || 0) > Number(product.stockQuantity || 0)) {
    return ` - only ${product.stockQuantity} currently in stock`;
  }
  if (Number(product.stockQuantity || 0) <= 5) {
    return ` - low stock: ${product.stockQuantity} left`;
  }
  return ` - ${product.stockQuantity} available`;
}

function cartRowClass(item) {
  const product = productForCartItem(item);
  if (!product) return "";
  if (Number(item.quantity || 0) > Number(product.stockQuantity || 0)) return "cart-danger";
  if (Number(product.stockQuantity || 0) <= 5) return "cart-warning";
  return "";
}

export function bindCartActions() {
  hydrateCheckoutPreferences();
  renderAddressBook();
  ["#deliveryAddress", "#deliverySlot", "#paymentMethod"].forEach((selector) => {
    qs(selector)?.addEventListener("change", saveCheckoutPreferences);
  });
  qs("#deliveryAddress")?.addEventListener("input", saveCheckoutPreferences);
  qs("#addressLabel")?.addEventListener("change", saveCurrentAddress);
  qs("#savedAddressSelect")?.addEventListener("change", useSavedAddress);
  qs("#saveAddressBtn")?.addEventListener("click", saveCurrentAddress);
  qs("#removeAddressBtn")?.addEventListener("click", removeSelectedAddress);
  qs("#placeOrderBtn").addEventListener("click", placeOrder);
  qs("#clearCartBtn").addEventListener("click", clearCart);
}

function hydrateCheckoutPreferences() {
  if (qs("#deliveryAddress")) qs("#deliveryAddress").value = state.checkout.deliveryAddress;
  if (qs("#deliverySlot")) qs("#deliverySlot").value = state.checkout.deliverySlot;
  if (qs("#paymentMethod")) qs("#paymentMethod").value = state.checkout.paymentMethod;
  const saved = state.addressBook.find((entry) => entry.address === state.checkout.deliveryAddress);
  if (qs("#addressLabel")) qs("#addressLabel").value = saved?.label || "Home";
}

function saveCheckoutPreferences() {
  setCheckoutPreferences({
    deliveryAddress: qs("#deliveryAddress")?.value.trim() || "123 Grocery Street",
    deliverySlot: qs("#deliverySlot")?.value || "Today, 30-45 min",
    paymentMethod: qs("#paymentMethod")?.value || "COD",
  });
}

function renderAddressBook() {
  const select = qs("#savedAddressSelect");
  if (!select) return;
  const currentAddress = qs("#deliveryAddress")?.value.trim() || state.checkout.deliveryAddress;
  const currentLabel = qs("#addressLabel")?.value.trim() || "Home";
  if (currentAddress && !state.addressBook.some((entry) => entry.address === currentAddress)) {
    setAddressBook([{ label: currentLabel, address: currentAddress }, ...state.addressBook]);
  }
  select.innerHTML = state.addressBook
    .map((entry) => `<option value="${escapeHtml(entry.address)}">${escapeHtml(entry.label)} - ${escapeHtml(shortAddress(entry.address))}</option>`)
    .join("");
  if (state.addressBook.some((entry) => entry.address === currentAddress)) {
    select.value = currentAddress;
  }
}

function useSavedAddress(event) {
  const address = event.currentTarget.value;
  if (!address) return;
  const saved = state.addressBook.find((entry) => entry.address === address);
  if (qs("#addressLabel")) qs("#addressLabel").value = saved?.label || "Saved";
  qs("#deliveryAddress").value = address;
  saveCheckoutPreferences();
}

function saveCurrentAddress() {
  const address = qs("#deliveryAddress")?.value.trim();
  if (!address) {
    showToast("Enter a delivery address before saving.");
    return;
  }
  const label = qs("#addressLabel")?.value.trim() || "Home";
  setAddressBook([{ label, address }, ...state.addressBook]);
  renderAddressBook();
  saveCheckoutPreferences();
  showToast("Address saved");
}

function removeSelectedAddress() {
  const select = qs("#savedAddressSelect");
  const selectedAddress = select?.value;
  if (!selectedAddress) return;
  setAddressBook(state.addressBook.filter((entry) => entry.address !== selectedAddress));
  const nextEntry = state.addressBook[0] || { label: "Home", address: "123 Grocery Street" };
  if (qs("#addressLabel")) qs("#addressLabel").value = nextEntry.label;
  qs("#deliveryAddress").value = nextEntry.address;
  saveCheckoutPreferences();
  renderAddressBook();
  showToast("Address removed");
}

function shortAddress(address) {
  return address.length > 52 ? `${address.slice(0, 49)}...` : address;
}

async function placeOrder(event) {
  if (!state.user) {
    showToast("Login before placing an order.");
    return;
  }
  if (state.appRole === "CUSTOMER" && state.user.role !== "CUSTOMER") {
    showToast("Please use a customer account to place an order.");
    return;
  }
  if (!state.cart.length) {
    showToast("Add at least one item before placing an order.");
    return;
  }
  const availability = cartAvailability();
  if (availability.level === "danger") {
    showToast(availability.message);
    return;
  }
  const deliveryAddress = qs("#deliveryAddress").value.trim();
  const deliverySlot = qs("#deliverySlot")?.value || "Today, 30-45 min";
  const paymentMethod = qs("#paymentMethod")?.value || "COD";
  if (!deliveryAddress) {
    showToast("Delivery address is required.");
    return;
  }
  try {
    saveCheckoutPreferences();
    setBusy(event?.currentTarget, true, "Placing...");
    const paymentPayload = paymentMethod === "ONLINE" ? await collectOnlinePayment(event?.currentTarget) : {};
    const order = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({ userId: state.user.id, deliveryAddress, deliverySlot, paymentMethod, ...paymentPayload }),
    });
    showToast(`Order #${order.id} placed`);
    openOrderReceipt(order, "Checkout confirmed");
    await Promise.all([loadCart(), loadOrders(), loadProducts()]);
  } catch (error) {
    if (error.message.toLowerCase().includes("product not found")) {
      showToast("One cart item is no longer available. Cart refreshed.");
      await Promise.all([loadCart(), loadProducts()]);
      return;
    }
    showToast(error.message);
  } finally {
    setBusy(event?.currentTarget, false);
  }
}

async function collectOnlinePayment(button) {
  setBusy(button, true, "Opening payment...");
  const paymentOrder = await api("/api/payments/razorpay/order", {
    method: "POST",
    body: JSON.stringify({ userId: state.user.id }),
  });
  await loadRazorpayCheckout();

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: paymentOrder.keyId,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      name: "FreshCart",
      description: "Online grocery order",
      order_id: paymentOrder.orderId,
      prefill: {
        name: state.user.fullName,
        email: state.user.email,
        contact: state.user.phoneNumber,
      },
      handler(response) {
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss() {
          reject(new Error("Online payment was cancelled"));
        },
      },
    });
    checkout.on("payment.failed", (response) => {
      reject(new Error(response?.error?.description || "Online payment failed"));
    });
    checkout.open();
  });
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Razorpay checkout"));
    document.head.appendChild(script);
  });
}

async function clearCart(event) {
  if (!state.user) return;
  try {
    setBusy(event?.currentTarget, true, "Clearing...");
    await api(`/api/cart/${state.user.id}`, { method: "DELETE" });
    showToast("Cart cleared");
    await loadCart();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(event?.currentTarget, false);
  }
}

async function updateCartItem(cartItemId) {
  const quantity = Number(qs(`#cartQty-${cartItemId}`).value || 1);
  if (quantity < 1) {
    showToast("Quantity must be at least 1.");
    return;
  }
  try {
    const button = qs(`[data-update-cart-item="${cartItemId}"]`);
    setBusy(button, true, "Updating...");
    await api(`/api/cart/items/${cartItemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
    showToast("Cart updated");
    await loadCart();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(qs(`[data-update-cart-item="${cartItemId}"]`), false);
  }
}

async function removeCartItem(cartItemId) {
  try {
    const button = qs(`[data-remove-cart-item="${cartItemId}"]`);
    setBusy(button, true, "Removing...");
    await api(`/api/cart/items/${cartItemId}`, { method: "DELETE" });
    showToast("Item removed");
    await loadCart();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(qs(`[data-remove-cart-item="${cartItemId}"]`), false);
  }
}

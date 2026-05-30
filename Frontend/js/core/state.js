const defaultCheckout = {
  deliveryAddress: "123 Grocery Street",
  deliverySlot: "Today, 30-45 min",
  paymentMethod: "COD",
};

export const state = {
  apiBaseUrl: localStorage.getItem("apiBaseUrl") || "http://localhost:8080",
  token: localStorage.getItem("token") || "",
  refreshToken: localStorage.getItem("refreshToken") || "",
  user: readStoredUser(),
  products: [],
  cart: [],
  orders: [],
  categories: [],
  selectedCategoryId: "",
  activeView: "products",
  appRole: "",
  checkout: readStoredCheckout(),
  addressBook: readStoredAddressBook(),
};

function readStoredCheckout() {
  const storedCheckout = localStorage.getItem("checkoutPreferences");
  if (!storedCheckout) return defaultCheckout;

  try {
    return { ...defaultCheckout, ...JSON.parse(storedCheckout) };
  } catch {
    localStorage.removeItem("checkoutPreferences");
    return defaultCheckout;
  }
}

function readStoredAddressBook() {
  const storedAddresses = localStorage.getItem("freshcartAddressBook");
  if (!storedAddresses) return [{ label: "Home", address: defaultCheckout.deliveryAddress }];

  try {
    const addresses = JSON.parse(storedAddresses);
    if (!Array.isArray(addresses)) return [{ label: "Home", address: defaultCheckout.deliveryAddress }];
    const cleanAddresses = addresses
            .map((entry) => typeof entry === "string"
                    ? { label: "Saved", address: entry.trim() }
                    : {
                        label: String(entry.label || "Saved").trim(),
                        address: String(entry.address || "").trim(),
                    })
            .filter((entry) => entry.address);
    return cleanAddresses.length ? cleanAddresses : [{ label: "Home", address: defaultCheckout.deliveryAddress }];
  } catch {
    localStorage.removeItem("freshcartAddressBook");
    return [{ label: "Home", address: defaultCheckout.deliveryAddress }];
  }
}

function readStoredUser() {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    return null;
  }
}

export function setAuth(authResponse) {
  state.token = authResponse.token;
  state.refreshToken = authResponse.refreshToken;
  state.user = authResponse.user;
  localStorage.setItem("token", state.token);
  localStorage.setItem("refreshToken", state.refreshToken || "");
  localStorage.setItem("user", JSON.stringify(state.user));
}

export function clearAuth() {
  state.token = "";
  state.refreshToken = "";
  state.user = null;
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

export function setApiBaseUrl(value) {
  state.apiBaseUrl = value.replace(/\/$/, "");
  localStorage.setItem("apiBaseUrl", state.apiBaseUrl);
}

export function setCheckoutPreferences(preferences) {
  state.checkout = { ...state.checkout, ...preferences };
  localStorage.setItem("checkoutPreferences", JSON.stringify(state.checkout));
}

export function setAddressBook(addresses) {
  const seen = new Set();
  state.addressBook = addresses
    .map((entry) => typeof entry === "string"
      ? { label: "Saved", address: entry.trim() }
      : {
          label: String(entry.label || "Saved").trim(),
          address: String(entry.address || "").trim(),
        })
    .filter((entry) => {
      if (!entry.address || seen.has(entry.address)) return false;
      seen.add(entry.address);
      return true;
    })
    .slice(0, 6);
  if (!state.addressBook.length) {
    state.addressBook = [{ label: "Home", address: defaultCheckout.deliveryAddress }];
  }
  localStorage.setItem("freshcartAddressBook", JSON.stringify(state.addressBook));
}

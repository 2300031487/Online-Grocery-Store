import { api } from "../core/api.js?v=20260529-razorpay-errors";
import { clearAuth, setAuth, state } from "../core/state.js?v=20260529-razorpay-errors";
import { escapeHtml, qs, setBusy, showToast } from "../core/ui.js?v=20260529-razorpay-errors";

let authChangeHandler = () => {};

export function setAuthChangeHandler(handler) {
  authChangeHandler = handler;
}

export function renderAuth(options = {}) {
  const {
    appRole = "",
    title = "Join the store",
    message = "Login or create an account to continue.",
    registerRole = "customer",
    allowRegister = true,
  } = options;
  const box = qs("#authBox");
  if (state.user) {
    const roleMismatch = appRole && state.user.role !== appRole;
    box.innerHTML = `
      <div class="identity">
        <div class="row-between">
          <div class="avatar">${state.user.fullName?.charAt(0) || "U"}</div>
          <span class="chip">${state.user.role}</span>
        </div>
        <div>
          <h3>${escapeHtml(state.user.fullName)}</h3>
          <div class="muted">${escapeHtml(state.user.email)}</div>
        </div>
        ${roleMismatch ? `<p class="muted">This account belongs to ${state.user.role}. Please logout and use a ${appRole} account here.</p>` : ""}
        ${roleMismatch ? `<button class="btn full" id="switchDemoBtn">Switch to demo ${appRole.toLowerCase()}</button>` : ""}
        <button class="btn secondary full" id="logoutBtn">Logout</button>
      </div>
    `;
    qs("#switchDemoBtn")?.addEventListener("click", async (event) => {
      await createDemoAccount(event.currentTarget, appRole, authChangeHandler);
    });
    qs("#logoutBtn").addEventListener("click", () => {
      clearAuth();
      showToast("Logged out");
      authChangeHandler();
    });
    return;
  }

  box.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <p class="muted">${escapeHtml(message)}</p>
    <div class="auth-tabs">
      <button class="active" data-auth-tab="login">Login</button>
      ${allowRegister ? `<button data-auth-tab="register">Register</button>` : ""}
    </div>
    <form id="authForm" class="form-grid">
      <div class="field register-only" hidden>
        <span>Full name</span>
        <input name="fullName" value="${registerRole === "admin" ? "Fresh Admin" : "Fresh Customer"}" />
        <small class="field-error" data-field-error="fullName"></small>
      </div>
      <div class="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          value="${registerRole === "admin" ? "admin@gmail.com" : "customer@gmail.com"}"
          pattern="^[A-Za-z0-9._%+\\-]+@gmail\\.com$"
          title="Use a Gmail address, for example freshcart@gmail.com"
          required
        />
        <small class="field-error" data-field-error="email"></small>
      </div>
      <div class="field">
        <span>Password</span>
        <input name="password" type="password" value="password123" required />
        <small class="field-error" data-field-error="password"></small>
      </div>
      <div class="field register-only" hidden>
        <span>Phone</span>
        <input
          name="phoneNumber"
          value="9999999999"
          pattern="^[6-9][0-9]{9}$"
          maxlength="10"
          inputmode="numeric"
          title="Use a valid 10 digit Indian mobile number"
        />
        <small class="field-error" data-field-error="phoneNumber"></small>
      </div>
      <button class="btn full" type="submit">Login</button>
    </form>
    <div class="segmented">
      <button type="button" id="forgotPasswordBtn">Forgot password</button>
      <button type="button" id="changePasswordBtn">Change password</button>
    </div>
    <button class="btn secondary full demo-login-btn" type="button" id="demoLoginBtn">
      Create demo ${appRole === "ADMIN" ? "admin" : "customer"}
    </button>
    <form id="passwordHelpForm" class="form-grid" hidden>
      <input type="hidden" name="mode" value="forgot" />
      <label class="field">
        <span>Email</span>
        <input name="email" type="email" value="${registerRole === "admin" ? "admin@gmail.com" : "customer@gmail.com"}" />
        <small class="field-error" data-field-error="email"></small>
      </label>
      <label class="field change-only" hidden>
        <span>Current password</span>
        <input name="currentPassword" type="password" />
        <small class="field-error" data-field-error="currentPassword"></small>
      </label>
      <label class="field">
        <span>New password</span>
        <input name="newPassword" type="password" value="password123" />
        <small class="field-error" data-field-error="newPassword"></small>
      </label>
      <button class="btn full" type="submit">Reset Password</button>
    </form>
  `;

  let mode = "login";
  qs("[data-auth-tab='login']").addEventListener("click", () => switchMode("login"));
  qs("[data-auth-tab='register']")?.addEventListener("click", () => switchMode("register"));
  qs("#forgotPasswordBtn")?.addEventListener("click", () => showPasswordHelp("forgot"));
  qs("#changePasswordBtn")?.addEventListener("click", () => showPasswordHelp("change"));

  function switchMode(nextMode) {
    mode = nextMode;
    box.querySelectorAll("[data-auth-tab]").forEach((btn) => btn.classList.toggle("active", btn.dataset.authTab === mode));
    document.querySelectorAll(".register-only").forEach((node) => {
      node.hidden = mode !== "register";
    });
    qs("#authForm button").textContent = mode === "login" ? "Login" : "Create account";
  }

  qs("#authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submitButton = event.currentTarget.querySelector("button[type='submit']");
    try {
      setBusy(submitButton, true, mode === "login" ? "Logging in..." : "Creating...");
      clearFieldErrors(event.currentTarget);
      if (mode === "register") {
        await api(registerRole === "admin" ? "/api/auth/register-admin" : "/api/auth/register", {
          method: "POST",
          auth: false,
          body: JSON.stringify({
            fullName: form.get("fullName"),
            email: form.get("email"),
            password: form.get("password"),
            phoneNumber: form.get("phoneNumber"),
          }),
        });
      }

      const auth = await api("/api/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      if (appRole && auth.user.role !== appRole) {
        clearAuth();
        showToast(`Please use a ${appRole} account for this app.`);
        return;
      }
      setAuth(auth);
      showToast(`Welcome, ${auth.user.fullName}`);
      authChangeHandler();
    } catch (error) {
      showFieldErrors(event.currentTarget, error.validationErrors);
      showToast(error.message);
    } finally {
      setBusy(submitButton, false);
    }
  });

  qs("#demoLoginBtn").addEventListener("click", async (event) => {
    await createDemoAccount(event.currentTarget, appRole, authChangeHandler);
  });

  qs("#passwordHelpForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const submitButton = formElement.querySelector("button[type='submit']");
    const helpMode = form.get("mode");
    try {
      clearFieldErrors(formElement);
      setBusy(submitButton, true, helpMode === "change" ? "Changing..." : "Resetting...");
      if (helpMode === "change") {
        const user = state.user || await loginForPasswordChange(form);
        await api("/api/auth/change-password", {
          method: "POST",
          body: JSON.stringify({
            userId: user.id,
            currentPassword: form.get("currentPassword"),
            newPassword: form.get("newPassword"),
          }),
        });
      } else {
        await api("/api/auth/forgot-password", {
          method: "POST",
          auth: false,
          body: JSON.stringify({
            email: form.get("email"),
            newPassword: form.get("newPassword"),
          }),
        });
      }
      showToast(helpMode === "change" ? "Password changed" : "Password reset");
      formElement.hidden = true;
    } catch (error) {
      showFieldErrors(formElement, error.validationErrors);
      showToast(error.message);
    } finally {
      setBusy(submitButton, false);
    }
  });

  function showPasswordHelp(helpMode) {
    const form = qs("#passwordHelpForm");
    if (!form) return;
    form.hidden = false;
    form.elements.mode.value = helpMode;
    form.querySelectorAll(".change-only").forEach((node) => {
      node.hidden = helpMode !== "change";
    });
    form.querySelector("button[type='submit']").textContent = helpMode === "change" ? "Change Password" : "Reset Password";
  }
}

async function loginForPasswordChange(form) {
  const auth = await api("/api/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({
      email: form.get("email"),
      password: form.get("currentPassword"),
    }),
  });
  setAuth(auth);
  authChangeHandler();
  return auth.user;
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

async function createDemoAccount(button, appRole, authChangeHandler) {
  const demoRole = appRole === "ADMIN" ? "admin" : "customer";
  const timestamp = Date.now();
  const demoUser = {
    fullName: demoRole === "admin" ? "Demo Store Admin" : "Demo Fresh Customer",
    email: `${demoRole}.${timestamp}@gmail.com`,
    password: "password123",
    phoneNumber: "9999999999",
  };

  try {
    clearAuth();
    setBusy(button, true, "Creating demo...");
    await api(demoRole === "admin" ? "/api/auth/register-admin" : "/api/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify(demoUser),
    });

    const auth = await api("/api/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({
        email: demoUser.email,
        password: demoUser.password,
      }),
    });

    setAuth(auth);
    showToast(`Demo ${demoRole} ready`);
    authChangeHandler();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

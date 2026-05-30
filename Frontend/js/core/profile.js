import { state } from "./state.js?v=20260529-razorpay-errors";
import { emptyState, escapeHtml, qs } from "./ui.js?v=20260529-razorpay-errors";

export function renderProfile(appLabel) {
  const panel = qs("#profilePanel");
  if (!panel) return;

  if (!state.user) {
    panel.innerHTML = emptyState(`Login to view your ${appLabel.toLowerCase()} profile.`);
    return;
  }

  panel.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar">${escapeHtml(state.user.fullName?.charAt(0) || "U")}</div>
      <div>
        <p class="page-kicker">${escapeHtml(appLabel)} profile</p>
        <h2>${escapeHtml(state.user.fullName)}</h2>
        <p class="muted">${escapeHtml(state.user.email)}</p>
      </div>
    </div>
    <div class="profile-grid">
      <div class="profile-field"><span>Role</span><strong>${escapeHtml(state.user.role)}</strong></div>
      <div class="profile-field"><span>Phone</span><strong>${escapeHtml(state.user.phoneNumber || "Not set")}</strong></div>
      <div class="profile-field"><span>Account ID</span><strong>#${escapeHtml(state.user.id)}</strong></div>
      <div class="profile-field"><span>Session</span><strong>${state.token ? "JWT active" : "Not logged in"}</strong></div>
    </div>
  `;
}

import { state } from "../core/state.js?v=20260529-razorpay-errors";
import { showToast } from "../core/ui.js?v=20260529-razorpay-errors";

let socket;
let connected = false;
const subscriptions = new Set();

export function subscribeToOrderUpdates(orders, renderOrders) {
  if (!orders.length) return;

  try {
    if (socket && socket.readyState === WebSocket.OPEN && connected) {
      subscribeOrders(orders);
      return;
    }

    if (socket && socket.readyState === WebSocket.CONNECTING) return;

    socket = new WebSocket(`${state.apiBaseUrl.replace("http", "ws")}/ws`);
    socket.addEventListener("open", () => {
      socket.send("CONNECT\naccept-version:1.2\nheart-beat:10000,10000\n\n\0");
    });
    socket.addEventListener("message", (event) => {
      if (event.data.includes("CONNECTED")) {
        connected = true;
        subscribeOrders(orders);
        return;
      }
      if (!event.data.includes("MESSAGE")) return;
      const body = event.data.split("\n\n")[1]?.replace("\0", "");
      if (!body) return;
      const update = JSON.parse(body);
      const order = state.orders.find((item) => item.id === update.orderId);
      if (order) order.status = update.status;
      renderOrders();
      showToast(`Order #${update.orderId} is now ${update.status}`);
    });
    socket.addEventListener("close", () => {
      connected = false;
      subscriptions.clear();
    });
    socket.addEventListener("error", () => {
      connected = false;
    });
  } catch {
    // WebSocket is a real-time enhancement; API flow still works without it.
  }
}

export function disconnectOrderUpdates() {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send("DISCONNECT\n\n\0");
    socket.close();
  }
  socket = undefined;
  connected = false;
  subscriptions.clear();
}

function subscribeOrders(orders) {
  orders.forEach((order) => {
    if (subscriptions.has(order.id)) return;
    socket.send(`SUBSCRIBE\nid:order-${order.id}\ndestination:/topic/orders/${order.id}\n\n\0`);
    subscriptions.add(order.id);
  });
}

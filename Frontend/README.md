# FreshCart Control Frontend

Vanilla HTML/CSS/JavaScript frontend for the Online Grocery Store backend.

This app is intentionally simple: no React yet, no build tools, and no frontend framework. That helps you understand the real browser basics first: HTML structure, CSS layout, JavaScript modules, API calls, JWT storage, and DOM updates.

## Run

From the `Frontend` folder:

```bash
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## Backend

The frontend expects the backend at:

```text
http://localhost:8080
```

You can change the API base URL from the frontend connection panel.

Make sure the Spring Boot backend is running before testing product, cart, order, login, or admin flows.

## Features

- Customer/admin register and login
- JWT storage in browser local storage
- Product catalog and search
- Product images using local fallback assets
- Add to cart
- Place order
- View order history
- Admin category creation
- Admin product creation
- Admin order status update
- WebSocket order status subscription

## Frontend Architecture

```text
Browser screen
  -> index.html creates the page sections
  -> css/styles.css controls layout and visual design
  -> js/app.js starts the app and connects all modules
  -> js/core/api.js sends requests to Spring Boot
  -> js/core/state.js remembers current user, JWT, products, cart, and orders
  -> js/user handles customer shopping flows
  -> js/admin handles admin catalog and order tools
  -> js/auth handles login and registration
  -> js/realtime handles WebSocket updates
```

## How It Connects To Backend Concepts

```text
Login form
  -> POST /api/auth/login
  -> receives JWT
  -> stores JWT in localStorage
  -> sends JWT in Authorization header for protected APIs

Product screen
  -> GET /api/products
  -> public catalog API

Cart screen
  -> POST /api/cart/items
  -> DELETE /api/cart/{userId}
  -> protected customer flow

Order screen
  -> POST /api/orders
  -> GET /api/orders/user/{userId}
  -> WebSocket listens for live order status changes

Admin screen
  -> POST /api/categories
  -> POST /api/products
  -> PATCH /api/orders/{orderId}/status
  -> protected admin flow
```

## Interview Explanation

The frontend is a browser client for the Spring Boot REST API. It keeps only UI state locally, while business rules stay in the backend. Public pages can load products without a token. Protected actions, such as cart, order, and admin operations, attach the JWT using the `Authorization: Bearer <token>` header. This separation keeps the frontend focused on user interaction and the backend responsible for validation, security, and database changes.

## Files

```text
index.html       -> app layout
css/styles.css   -> visual design
js/app.js                 -> app bootstrapping
js/core/api.js            -> API helper
js/core/state.js          -> app state and local storage
js/core/ui.js             -> shared UI helpers
js/auth/auth.js           -> register/login/logout
js/user/products.js       -> product catalog
js/user/cart.js           -> cart and checkout
js/user/orders.js         -> order history
js/admin/admin.js         -> admin tools
js/realtime/orderSocket.js -> WebSocket order updates
assets/products           -> local fallback product images
```

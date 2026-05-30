# Online Grocery Store Backend

Spring Boot backend for the Online Grocery Store Platform.

## Tech Stack

- Java 21
- Spring Boot 3.3.5
- Spring Web
- Spring Data JPA
- MySQL
- Spring Security
- JWT and refresh tokens
- OAuth2 Client
- Redis caching on `localhost:6387`
- WebSocket/STOMP
- Swagger/OpenAPI
- Lombok
- H2 for integration tests

## Local Configuration

Backend server:

```text
http://localhost:8080
```

MySQL:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/grocery_store
spring.datasource.username=root
spring.datasource.password=root
```

Redis:

```properties
spring.data.redis.host=localhost
spring.data.redis.port=6387
```

The default profile uses simple in-memory cache so the app can start even when Redis is not running.

## Run

Create the database:

```sql
CREATE DATABASE grocery_store;
```

Run from the `Backend` folder:

```bash
mvn spring-boot:run
```

Run with Redis:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=redis
```

Run tests:

```bash
mvn test
```

Swagger:

```text
http://localhost:8080/swagger-ui.html
```

Health check:

```text
GET http://localhost:8080/api/health
```

## Profiles

```text
default  -> MySQL + simple in-memory cache
redis    -> MySQL + Redis cache on localhost:6387
oauth2   -> enables Google OAuth2 configuration
test     -> H2 in-memory database for integration tests
```

## Architecture

```text
Controller -> Service -> Repository -> Entity -> MySQL
```

Supporting packages:

```text
dto        -> request and response models
security   -> JWT, OAuth2, role rules
exception  -> global API error handling
config     -> cache, security, WebSocket
```

## APIs

Authentication:

```text
POST /api/auth/register
POST /api/auth/register-admin
POST /api/auth/login
POST /api/auth/refresh
GET  /api/oauth2/google
```

Catalog:

```text
GET  /api/categories
POST /api/categories
GET  /api/products
GET  /api/products?search=milk
GET  /api/products/category/{categoryId}
POST /api/products
```

Cart:

```text
POST   /api/cart/items
GET    /api/cart/{userId}
DELETE /api/cart/{userId}
```

Orders:

```text
POST  /api/orders
GET   /api/orders/user/{userId}
PATCH /api/orders/{orderId}/status
```

WebSocket:

```text
Endpoint: /ws
Topic:    /topic/orders/{orderId}
```

## Security Rules

Public:

```text
/api/auth/**
/api/oauth2/**
/api/health
GET /api/products/**
GET /api/categories/**
```

Admin:

```text
POST /api/products
POST /api/categories
PATCH /api/orders/{orderId}/status
```

Customer/Admin:

```text
/api/cart/**
/api/orders/**
```

Protected calls require:

```text
Authorization: Bearer <token>
```

## Business Rules

- Cart quantity cannot exceed product stock.
- Empty carts cannot be converted into orders.
- Order items store `priceAtPurchase`.
- Placing an order reduces product stock.
- Placing an order clears the cart.
- Admin status updates publish WebSocket messages.

## Tests

Integration tests use MockMvc and H2. The tested flow covers registration, login, refresh tokens, role checks, catalog creation, cart, order placement, stock reduction, and order status update.

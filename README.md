# Online Grocery Store Platform

Full-stack Online Grocery Store project.

## Project Structure

```text
Online grocery store/
  Backend/
    pom.xml
    src/
    tools/
    README.md
    Online_Grocery_Store_Backend_Beginner_Handbook.docx

  Frontend/
    index.html
    css/
    js/
    assets/

  README.md
  .gitignore
```

## Backend

The backend is a Spring Boot application with MySQL, JWT, OAuth2, Redis caching, WebSocket updates, Swagger, role-based authorization, and integration tests.

Backend docs:

```text
Backend/README.md
```

Run backend from the `Backend` folder:

```bash
mvn spring-boot:run
```

Backend URL:

```text
http://localhost:8080
```

Swagger:

```text
http://localhost:8080/swagger-ui.html
```

Redis:

```text
localhost:6387
```

## Frontend

The frontend will be a polished single-page grocery app.

Planned screens:

```text
Auth       -> login, register, logout
Products   -> browse, search, add to cart
Cart       -> view cart, clear cart, place order
Orders     -> order history and status
Admin      -> create category, create product, update order status
```

Frontend URL when served locally:

```text
http://localhost:5173
```

Run frontend from the `Frontend` folder:

```bash
python -m http.server 5173
```

## Development Order

```text
1. Start backend
2. Start frontend
3. Login/register from frontend
4. Test product, cart, order, and admin flows
5. Add WebSocket order status display
```

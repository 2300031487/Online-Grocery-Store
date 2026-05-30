package com.grocery.store;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GroceryApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registerLoginRefreshAndPlaceOrderFlowWorks() throws Exception {
        JsonNode admin = register("/api/auth/register-admin", "Admin User", "admin@gmail.com");
        JsonNode customer = register("/api/auth/register", "Customer User", "customer@gmail.com");

        JsonNode adminLogin = login("admin@gmail.com");
        JsonNode customerLogin = login("customer@gmail.com");

        String adminToken = adminLogin.get("token").asText();
        String customerToken = customerLogin.get("token").asText();
        String refreshToken = customerLogin.get("refreshToken").asText();

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", refreshToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());

        JsonNode category = postWithToken("/api/categories", adminToken, Map.of(
                "name", "Fruits",
                "description", "Fresh fruits"
        ));

        JsonNode product = postWithToken("/api/products", adminToken, Map.of(
                "name", "Apple",
                "description", "Fresh apple",
                "price", BigDecimal.valueOf(40.50),
                "stockQuantity", 10,
                "categoryId", category.get("id").asLong()
        ));

        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "name", "Blocked",
                                "description", "Should fail",
                                "price", BigDecimal.ONE,
                                "stockQuantity", 1,
                                "categoryId", category.get("id").asLong()
                        ))))
                .andExpect(status().isForbidden());

        JsonNode cartItem = postWithToken("/api/cart/items", customerToken, Map.of(
                "userId", customer.get("id").asLong(),
                "productId", product.get("id").asLong(),
                "quantity", 2
        ));

        assertThat(cartItem.get("lineTotal").decimalValue()).isEqualByComparingTo("81.00");

        JsonNode order = postWithToken("/api/orders", customerToken, Map.of(
                "userId", customer.get("id").asLong(),
                "deliveryAddress", "123 Grocery Street"
        ));

        assertThat(order.get("status").asText()).isEqualTo("PLACED");
        assertThat(order.get("totalAmount").decimalValue()).isEqualByComparingTo("81.00");

        mockMvc.perform(patch("/api/orders/{orderId}/status", order.get("id").asLong())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("status", "CONFIRMED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        mockMvc.perform(patch("/api/orders/{orderId}/status", order.get("id").asLong())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("status", "PACKED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PACKED"));

        mockMvc.perform(patch("/api/orders/{orderId}/status", order.get("id").asLong())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("status", "OUT_FOR_DELIVERY"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OUT_FOR_DELIVERY"));

        mockMvc.perform(patch("/api/orders/{orderId}/status", order.get("id").asLong())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("status", "DELIVERED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"));

        mockMvc.perform(get("/api/orders/user/{userId}", customer.get("id").asLong())
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].items.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("DELIVERED"));

        mockMvc.perform(get("/api/orders")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].items.length()").value(1));

        JsonNode review = postWithToken("/api/reviews", customerToken, Map.of(
                "userId", customer.get("id").asLong(),
                "productId", product.get("id").asLong(),
                "rating", 5,
                "comment", "Fresh and delivered on time"
        ));
        assertThat(review.get("rating").asInt()).isEqualTo(5);

        mockMvc.perform(get("/api/reviews/product/{productId}", product.get("id").asLong()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].comment").value("Fresh and delivered on time"));

        JsonNode undeliveredProduct = postWithToken("/api/products", adminToken, Map.of(
                "name", "Review Blocked Product",
                "description", "No delivered order yet",
                "price", BigDecimal.valueOf(20.00),
                "stockQuantity", 5,
                "categoryId", category.get("id").asLong()
        ));
        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "userId", customer.get("id").asLong(),
                                "productId", undeliveredProduct.get("id").asLong(),
                                "rating", 4,
                                "comment", "Trying too early"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You can review this product after it is delivered in your order history"));

        mockMvc.perform(post("/api/auth/change-password")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "userId", customer.get("id").asLong(),
                                "currentPassword", "password123",
                                "newPassword", "newpass123"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password changed successfully."));

        String changedLoginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "email", "customer@gmail.com",
                                "password", "newpass123"
                        ))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        assertThat(objectMapper.readTree(changedLoginResponse).get("token").asText()).isNotBlank();

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "email", "customer@gmail.com",
                                "newPassword", "password123"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password reset successfully. You can login with the new password."));

        String productsResponse = mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode products = objectMapper.readTree(productsResponse);
        JsonNode orderedProduct = null;
        for (JsonNode item : products) {
            if (item.get("id").asLong() == product.get("id").asLong()) {
                orderedProduct = item;
                break;
            }
        }
        assertThat(orderedProduct).isNotNull();
        assertThat(orderedProduct.get("stockQuantity").asInt()).isEqualTo(8);

        assertThat(admin.get("role").asText()).isEqualTo("ADMIN");
    }

    @Test
    void deletedProductsAreRemovedFromCustomerCarts() throws Exception {
        JsonNode admin = register("/api/auth/register-admin", "Delete Admin", "delete.admin@gmail.com");
        JsonNode customer = register("/api/auth/register", "Delete Customer", "delete.customer@gmail.com");

        String adminToken = login("delete.admin@gmail.com").get("token").asText();
        String customerToken = login("delete.customer@gmail.com").get("token").asText();

        JsonNode category = postWithToken("/api/categories", adminToken, Map.of(
                "name", "Temporary",
                "description", "Temporary products"
        ));

        JsonNode product = postWithToken("/api/products", adminToken, Map.of(
                "name", "Temporary Apple",
                "description", "Will be removed",
                "price", BigDecimal.valueOf(25.00),
                "stockQuantity", 5,
                "categoryId", category.get("id").asLong()
        ));

        postWithToken("/api/cart/items", customerToken, Map.of(
                "userId", customer.get("id").asLong(),
                "productId", product.get("id").asLong(),
                "quantity", 1
        ));

        mockMvc.perform(delete("/api/products/{productId}", product.get("id").asLong())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/cart/{userId}", customer.get("id").asLong())
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "userId", customer.get("id").asLong(),
                                "deliveryAddress", "123 Grocery Street"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cart is empty"));
    }

    private JsonNode register(String url, String fullName, String email) throws Exception {
        String response = mockMvc.perform(post(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "fullName", fullName,
                                "email", email,
                                "password", "password123",
                                "phoneNumber", "9999999999"
                        ))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response);
    }

    private JsonNode login(String email) throws Exception {
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "email", email,
                                "password", "password123"
                        ))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response);
    }

    private JsonNode postWithToken(String url, String token, Map<String, Object> body) throws Exception {
        String response = mockMvc.perform(post(url)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response);
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }
}

package com.grocery.store.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grocery.store.dto.response.PaymentOrderResponse;
import com.grocery.store.entity.CartItem;
import com.grocery.store.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final CartService cartService;
    private final ObjectMapper objectMapper;

    @Value("${razorpay.key-id:}")
    private String keyId;

    @Value("${razorpay.key-secret:}")
    private String keySecret;

    public PaymentOrderResponse createRazorpayOrder(Long userId) {
        requireKeys();
        List<CartItem> cartItems = cartService.getCartItems(userId);
        if (cartItems.isEmpty()) {
            throw new BusinessRuleException("Cart is empty");
        }

        BigDecimal total = cartItems.stream()
                .map(item -> item.getProduct().getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int amountInPaise = total.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .intValueExact();

        String response;
        try {
            response = RestClient.create("https://api.razorpay.com/v1")
                    .post()
                    .uri("/orders")
                    .headers(headers -> headers.setBasicAuth(keyId, keySecret))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "amount", amountInPaise,
                            "currency", "INR",
                            "receipt", receiptFor(userId)
                    ))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException exception) {
            throw new BusinessRuleException(razorpayErrorMessage(exception));
        } catch (RestClientException exception) {
            throw new BusinessRuleException("Could not reach Razorpay. Check your internet connection and backend network access.");
        } catch (Exception exception) {
            throw new BusinessRuleException("Could not create Razorpay order. Please check the backend payment configuration.");
        }

        try {
            JsonNode json = objectMapper.readTree(response);
            return new PaymentOrderResponse(
                    keyId,
                    json.get("id").asText(),
                    json.get("amount").asInt(),
                    json.get("currency").asText()
            );
        } catch (Exception exception) {
            throw new BusinessRuleException("Could not create payment order");
        }
    }

    public void verifyRazorpayPayment(String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) {
        requireKeys();
        if (isBlank(razorpayOrderId) || isBlank(razorpayPaymentId) || isBlank(razorpaySignature)) {
            throw new BusinessRuleException("Online payment verification is required");
        }
        String payload = razorpayOrderId + "|" + razorpayPaymentId;
        String expectedSignature = hmacSha256(payload, keySecret);
        if (!expectedSignature.equals(razorpaySignature)) {
            throw new BusinessRuleException("Online payment verification failed");
        }
    }

    private void requireKeys() {
        if (isBlank(keyId) || isBlank(keySecret)) {
            throw new BusinessRuleException("Razorpay keys are not configured on the backend");
        }
    }

    private String hmacSha256(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new BusinessRuleException("Could not verify payment signature");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String razorpayErrorMessage(RestClientResponseException exception) {
        try {
            JsonNode json = objectMapper.readTree(exception.getResponseBodyAsString());
            JsonNode description = json.path("error").path("description");
            if (!description.isMissingNode() && !description.asText().isBlank()) {
                return "Razorpay error: " + description.asText();
            }
        } catch (Exception ignored) {
            // Fall through to a concise status-based message.
        }
        return "Razorpay rejected the payment order request. Status: " + exception.getStatusCode();
    }

    private String receiptFor(Long userId) {
        String receipt = "fc-" + userId + "-" + System.currentTimeMillis();
        return receipt.length() <= 40 ? receipt : receipt.substring(0, 40);
    }
}

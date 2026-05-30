package com.grocery.store.dto.response;

public record PaymentOrderResponse(
        String keyId,
        String orderId,
        Integer amount,
        String currency
) {
}

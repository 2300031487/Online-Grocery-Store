package com.grocery.store.dto.response;

import com.grocery.store.entity.OrderItem;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        Long productId,
        String productName,
        BigDecimal priceAtPurchase,
        Integer quantity,
        BigDecimal lineTotal
) {

    public static OrderItemResponse from(OrderItem orderItem) {
        BigDecimal lineTotal = orderItem.getPriceAtPurchase()
                .multiply(BigDecimal.valueOf(orderItem.getQuantity()));

        return new OrderItemResponse(
                orderItem.getId(),
                orderItem.getProduct().getId(),
                orderItem.getProduct().getName(),
                orderItem.getPriceAtPurchase(),
                orderItem.getQuantity(),
                lineTotal
        );
    }
}

package com.grocery.store.dto.response;

import com.grocery.store.entity.CartItem;

import java.math.BigDecimal;

public record CartItemResponse(
        Long id,
        Long productId,
        String productName,
        BigDecimal price,
        Integer quantity,
        BigDecimal lineTotal
) {

    public static CartItemResponse from(CartItem cartItem) {
        BigDecimal lineTotal = cartItem.getProduct()
                .getPrice()
                .multiply(BigDecimal.valueOf(cartItem.getQuantity()));

        return new CartItemResponse(
                cartItem.getId(),
                cartItem.getProduct().getId(),
                cartItem.getProduct().getName(),
                cartItem.getProduct().getPrice(),
                cartItem.getQuantity(),
                lineTotal
        );
    }
}

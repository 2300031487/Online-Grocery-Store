package com.grocery.store.dto.response;

import com.grocery.store.entity.OrderStatus;

import java.time.LocalDateTime;

public record OrderStatusUpdateResponse(
        Long orderId,
        OrderStatus status,
        LocalDateTime updatedAt
) {
}

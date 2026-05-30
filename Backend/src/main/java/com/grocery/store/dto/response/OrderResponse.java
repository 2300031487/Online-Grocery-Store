package com.grocery.store.dto.response;

import com.grocery.store.entity.Order;
import com.grocery.store.entity.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        Long id,
        Long userId,
        BigDecimal totalAmount,
        OrderStatus status,
        String deliveryAddress,
        String deliverySlot,
        String paymentMethod,
        String paymentStatus,
        String paymentReference,
        String razorpayOrderId,
        LocalDateTime createdAt,
        List<OrderItemResponse> items
) {

    public static OrderResponse from(Order order) {
        return from(order, List.of());
    }

    public static OrderResponse from(Order order, List<OrderItemResponse> items) {
        return new OrderResponse(
                order.getId(),
                order.getUser().getId(),
                order.getTotalAmount(),
                order.getStatus(),
                order.getDeliveryAddress(),
                order.getDeliverySlot(),
                order.getPaymentMethod(),
                order.getPaymentStatus(),
                order.getPaymentReference(),
                order.getRazorpayOrderId(),
                order.getCreatedAt(),
                items
        );
    }
}

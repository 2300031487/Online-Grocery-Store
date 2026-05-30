package com.grocery.store.controller;

import com.grocery.store.dto.request.CancelOrderRequest;
import com.grocery.store.dto.request.PlaceOrderRequest;
import com.grocery.store.dto.request.UpdateOrderStatusRequest;
import com.grocery.store.dto.response.OrderResponse;
import com.grocery.store.entity.Order;
import com.grocery.store.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse placeOrder(@Valid @RequestBody PlaceOrderRequest request) {
        Order order = orderService.placeOrder(
                request.userId(),
                request.deliveryAddress(),
                request.deliverySlot(),
                request.paymentMethod(),
                request.razorpayOrderId(),
                request.razorpayPaymentId(),
                request.razorpaySignature()
        );
        return orderService.toResponse(order);
    }

    @GetMapping("/user/{userId}")
    public List<OrderResponse> getUserOrders(@PathVariable Long userId) {
        return orderService.getUserOrders(userId)
                .stream()
                .map(orderService::toResponse)
                .toList();
    }

    @GetMapping
    public List<OrderResponse> getAllOrders() {
        return orderService.getAllOrders()
                .stream()
                .map(orderService::toResponse)
                .toList();
    }

    @PatchMapping("/{orderId}/status")
    public OrderResponse updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody UpdateOrderStatusRequest request
    ) {
        Order order = orderService.updateOrderStatus(orderId, request.status());
        return orderService.toResponse(order);
    }

    @PostMapping("/{orderId}/cancel")
    public OrderResponse cancelOrder(
            @PathVariable Long orderId,
            @Valid @RequestBody CancelOrderRequest request
    ) {
        Order order = orderService.cancelOrder(orderId, request.userId());
        return orderService.toResponse(order);
    }
}

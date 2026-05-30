package com.grocery.store.service;

import com.grocery.store.entity.CartItem;
import com.grocery.store.dto.response.OrderItemResponse;
import com.grocery.store.dto.response.OrderResponse;
import com.grocery.store.entity.Order;
import com.grocery.store.entity.OrderItem;
import com.grocery.store.entity.OrderStatus;
import com.grocery.store.entity.User;
import com.grocery.store.dto.response.OrderStatusUpdateResponse;
import com.grocery.store.exception.BusinessRuleException;
import com.grocery.store.exception.ResourceNotFoundException;
import com.grocery.store.repository.OrderItemRepository;
import com.grocery.store.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserService userService;
    private final CartService cartService;
    private final ProductService productService;
    private final PaymentService paymentService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Order placeOrder(
            Long userId,
            String deliveryAddress,
            String deliverySlot,
            String paymentMethod,
            String razorpayOrderId,
            String razorpayPaymentId,
            String razorpaySignature
    ) {
        User user = userService.getById(userId);
        List<CartItem> cartItems = cartService.getCartItems(userId);

        if (cartItems.isEmpty()) {
            throw new BusinessRuleException("Cart is empty");
        }
        String normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
        String paymentStatus = "COD".equals(normalizedPaymentMethod) ? "PENDING" : "PAID";
        if ("ONLINE".equals(normalizedPaymentMethod)) {
            paymentService.verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        }

        BigDecimal totalAmount = cartItems.stream()
                .map(item -> item.getProduct().getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = Order.builder()
                .user(user)
                .totalAmount(totalAmount)
                .status(OrderStatus.PLACED)
                .deliveryAddress(deliveryAddress)
                .deliverySlot(normalizeDeliverySlot(deliverySlot))
                .paymentMethod(normalizedPaymentMethod)
                .paymentStatus(paymentStatus)
                .paymentReference(razorpayPaymentId)
                .razorpayOrderId(razorpayOrderId)
                .createdAt(LocalDateTime.now())
                .build();

        Order savedOrder = orderRepository.save(order);

        List<OrderItem> orderItems = cartItems.stream()
                .map(item -> OrderItem.builder()
                        .order(savedOrder)
                        .product(item.getProduct())
                        .quantity(item.getQuantity())
                        .priceAtPurchase(item.getProduct().getPrice())
                        .build())
                .toList();

        orderItemRepository.saveAll(orderItems);
        cartItems.forEach(item -> productService.decreaseStock(item.getProduct().getId(), item.getQuantity()));
        cartService.clearCart(userId);

        return savedOrder;
    }

    private String normalizeDeliverySlot(String deliverySlot) {
        if (deliverySlot == null || deliverySlot.isBlank()) {
            return "Today, 30-45 min";
        }
        return deliverySlot;
    }

    private String normalizePaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return "COD";
        }
        if (paymentMethod.equalsIgnoreCase("online payment") || paymentMethod.equalsIgnoreCase("online")) {
            return "ONLINE";
        }
        return "COD";
    }

    public List<Order> getUserOrders(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc();
    }

    public OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = orderItemRepository.findByOrderId(order.getId())
                .stream()
                .map(OrderItemResponse::from)
                .toList();

        return OrderResponse.from(order, items);
    }

    @Transactional
    public Order cancelOrder(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (!order.getUser().getId().equals(userId)) {
            throw new BusinessRuleException("You can only cancel your own orders");
        }

        if (order.getStatus() != OrderStatus.PLACED && order.getStatus() != OrderStatus.CONFIRMED) {
            throw new BusinessRuleException("Only placed or confirmed orders can be cancelled");
        }

        order.setStatus(OrderStatus.CANCELLED);
        Order savedOrder = orderRepository.save(order);

        messagingTemplate.convertAndSend(
                "/topic/orders/" + savedOrder.getId(),
                new OrderStatusUpdateResponse(savedOrder.getId(), savedOrder.getStatus(), LocalDateTime.now())
        );

        return savedOrder;
    }

    @Transactional
    public Order updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        order.setStatus(status);
        Order savedOrder = orderRepository.save(order);

        messagingTemplate.convertAndSend(
                "/topic/orders/" + savedOrder.getId(),
                new OrderStatusUpdateResponse(savedOrder.getId(), savedOrder.getStatus(), LocalDateTime.now())
        );

        return savedOrder;
    }
}

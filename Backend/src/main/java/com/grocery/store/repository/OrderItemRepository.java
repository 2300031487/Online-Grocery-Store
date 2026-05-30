package com.grocery.store.repository;

import com.grocery.store.entity.OrderItem;
import com.grocery.store.entity.OrderStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @EntityGraph(attributePaths = "product")
    List<OrderItem> findByOrderId(Long orderId);

    boolean existsByOrderUserIdAndProductIdAndOrderStatus(Long userId, Long productId, OrderStatus status);
}

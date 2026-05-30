package com.grocery.store.repository;

import com.grocery.store.entity.Order;
import com.grocery.store.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Order> findByStatus(OrderStatus status);

    List<Order> findAllByOrderByCreatedAtDesc();
}

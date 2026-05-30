package com.grocery.store.config;

import com.grocery.store.entity.Category;
import com.grocery.store.entity.Order;
import com.grocery.store.entity.OrderItem;
import com.grocery.store.entity.OrderStatus;
import com.grocery.store.entity.Product;
import com.grocery.store.entity.ProductReview;
import com.grocery.store.entity.User;
import com.grocery.store.entity.UserRole;
import com.grocery.store.repository.CategoryRepository;
import com.grocery.store.repository.OrderItemRepository;
import com.grocery.store.repository.OrderRepository;
import com.grocery.store.repository.ProductRepository;
import com.grocery.store.repository.ProductReviewRepository;
import com.grocery.store.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductReviewRepository productReviewRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedUser("Fresh Admin", "admin@gmail.com", "9876543210", UserRole.ADMIN);
        User customer = seedUser("Fresh Customer", "customer@gmail.com", "9876543211", UserRole.CUSTOMER);

        Category fruits = seedCategory("Fruits", "Fresh seasonal fruits and daily essentials.");
        Category vegetables = seedCategory("Vegetables", "Handpicked vegetables for home cooking.");
        Category dairy = seedCategory("Dairy", "Milk, curd, butter, and breakfast dairy.");
        Category bakery = seedCategory("Bakery", "Fresh bread and bakery staples.");

        Product apple = seedProduct("Apple", "Crisp red apples for snacking and lunch boxes.", "assets/products/apple.svg", BigDecimal.valueOf(120), 24, fruits);
        Product mango = seedProduct("Mango", "Sweet seasonal mangoes picked for ripeness.", "assets/products/mango.svg", BigDecimal.valueOf(180), 16, fruits);
        Product tomato = seedProduct("Tomato", "Fresh tomatoes for curries, salads, and sauces.", "assets/products/tomato.svg", BigDecimal.valueOf(42), 35, vegetables);
        Product vegetablesPack = seedProduct("Mixed Vegetables", "Daily vegetable pack for quick cooking.", "assets/products/vegetable.svg", BigDecimal.valueOf(95), 22, vegetables);
        Product milk = seedProduct("Milk", "Fresh full cream milk, 1 litre pack.", "assets/products/dairy.svg", BigDecimal.valueOf(64), 30, dairy);
        Product bread = seedProduct("Brown Bread", "Soft whole wheat bread baked fresh.", "assets/products/bakery.svg", BigDecimal.valueOf(55), 18, bakery);

        seedOrders(customer, apple, mango, tomato, vegetablesPack, milk, bread);
        seedReview(customer, apple);
    }

    private User seedUser(String fullName, String email, String phoneNumber, UserRole role) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> userRepository.save(User.builder()
                .fullName(fullName)
                .email(email)
                .password(passwordEncoder.encode("password123"))
                .phoneNumber(phoneNumber)
                .role(role)
                .build()));
    }

    private Category seedCategory(String name, String description) {
        return categoryRepository.findByName(name)
                .orElseGet(() -> categoryRepository.save(Category.builder()
                        .name(name)
                        .description(description)
                        .build()));
    }

    private Product seedProduct(String name, String description, String imageUrl, BigDecimal price, Integer stockQuantity, Category category) {
        return productRepository.findFirstByNameIgnoreCase(name)
                .orElseGet(() -> productRepository.save(Product.builder()
                .name(name)
                .description(description)
                .imageUrl(imageUrl)
                .price(price)
                .stockQuantity(stockQuantity)
                .active(true)
                .category(category)
                .build()));
    }

    private void seedOrders(User customer, Product apple, Product mango, Product tomato, Product vegetablesPack, Product milk, Product bread) {
        if (!orderRepository.findByUserIdOrderByCreatedAtDesc(customer.getId()).isEmpty()) {
            return;
        }

        createSeedOrder(
                customer,
                OrderStatus.OUT_FOR_DELIVERY,
                "Home - 123 Grocery Street, Pune",
                "Today, 6 PM - 8 PM",
                "UPI on delivery",
                LocalDateTime.now().minusHours(2),
                List.of(
                        new SeedOrderLine(apple, 2),
                        new SeedOrderLine(milk, 1),
                        new SeedOrderLine(bread, 1)
                )
        );

        createSeedOrder(
                customer,
                OrderStatus.DELIVERED,
                "Office - 45 Market Road, Pune",
                "Yesterday, 5 PM - 7 PM",
                "Cash on delivery",
                LocalDateTime.now().minusDays(1),
                List.of(
                        new SeedOrderLine(mango, 1),
                        new SeedOrderLine(tomato, 2),
                        new SeedOrderLine(vegetablesPack, 1)
                )
        );
    }

    private void createSeedOrder(
            User customer,
            OrderStatus status,
            String deliveryAddress,
            String deliverySlot,
            String paymentMethod,
            LocalDateTime createdAt,
            List<SeedOrderLine> lines
    ) {
        BigDecimal total = lines.stream()
                .map(line -> line.product().getPrice().multiply(BigDecimal.valueOf(line.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = orderRepository.save(Order.builder()
                .user(customer)
                .totalAmount(total)
                .status(status)
                .deliveryAddress(deliveryAddress)
                .deliverySlot(deliverySlot)
                .paymentMethod(paymentMethod)
                .paymentStatus(paymentMethod.equals("ONLINE") ? "PAID" : "PENDING")
                .createdAt(createdAt)
                .build());

        List<OrderItem> items = lines.stream()
                .map(line -> OrderItem.builder()
                        .order(order)
                        .product(line.product())
                        .quantity(line.quantity())
                        .priceAtPurchase(line.product().getPrice())
                        .build())
                .toList();
        orderItemRepository.saveAll(items);
    }

    private void seedReview(User customer, Product product) {
        if (!productReviewRepository.findByProductIdOrderByCreatedAtDesc(product.getId()).isEmpty()) {
            return;
        }

        productReviewRepository.save(ProductReview.builder()
                .user(customer)
                .product(product)
                .rating(5)
                .comment("Fresh quality and quick delivery.")
                .createdAt(LocalDateTime.now().minusHours(1))
                .build());
    }

    private record SeedOrderLine(Product product, int quantity) {
    }
}

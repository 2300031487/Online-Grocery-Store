package com.grocery.store.service;

import com.grocery.store.entity.Category;
import com.grocery.store.entity.Product;
import com.grocery.store.exception.BusinessRuleException;
import com.grocery.store.exception.ResourceNotFoundException;
import com.grocery.store.repository.CartItemRepository;
import com.grocery.store.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryService categoryService;
    private final CartItemRepository cartItemRepository;

    @CacheEvict(value = {"products", "productsByCategory", "productSearch"}, allEntries = true)
    public Product createProduct(String name, String description, String imageUrl, BigDecimal price, Integer stockQuantity, Long categoryId) {
        Category category = categoryService.getById(categoryId);

        Product product = Product.builder()
                .name(name)
                .description(description)
                .imageUrl(imageUrl)
                .price(price)
                .stockQuantity(stockQuantity)
                .active(true)
                .category(category)
                .build();

        return productRepository.save(product);
    }

    @Cacheable("products")
    public List<Product> getActiveProducts() {
        return productRepository.findByActiveTrue();
    }

    @Cacheable(value = "productsByCategory", key = "#categoryId")
    public List<Product> getProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryIdAndActiveTrue(categoryId);
    }

    @Cacheable(value = "productSearch", key = "#name.toLowerCase()")
    public List<Product> searchProducts(String name) {
        return productRepository.findByNameContainingIgnoreCaseAndActiveTrue(name);
    }

    @CacheEvict(value = {"products", "productsByCategory", "productSearch"}, allEntries = true)
    public Product updateProduct(Long productId, String name, String description, String imageUrl, BigDecimal price, Integer stockQuantity, Long categoryId) {
        Product product = getActiveProductById(productId);

        if (name != null && !name.isBlank()) {
            product.setName(name);
        }
        if (description != null) {
            product.setDescription(description);
        }
        if (imageUrl != null) {
            product.setImageUrl(imageUrl);
        }
        if (price != null) {
            product.setPrice(price);
        }
        if (stockQuantity != null) {
            product.setStockQuantity(stockQuantity);
        }
        if (categoryId != null) {
            product.setCategory(categoryService.getById(categoryId));
        }

        return productRepository.save(product);
    }

    public Product getActiveProductById(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        if (!Boolean.TRUE.equals(product.getActive())) {
            throw new ResourceNotFoundException("Product not found");
        }

        return product;
    }

    @CacheEvict(value = {"products", "productsByCategory", "productSearch"}, allEntries = true)
    @Transactional
    public void deleteProduct(Long productId) {
        Product product = getActiveProductById(productId);
        cartItemRepository.deleteByProductId(productId);
        product.setActive(false);
        productRepository.save(product);
    }

    @CacheEvict(value = {"products", "productsByCategory", "productSearch"}, allEntries = true)
    public void decreaseStock(Long productId, Integer quantity) {
        Product product = getActiveProductById(productId);

        if (product.getStockQuantity() < quantity) {
            throw new BusinessRuleException("Not enough stock available for " + product.getName());
        }

        product.setStockQuantity(product.getStockQuantity() - quantity);
        productRepository.save(product);
    }
}

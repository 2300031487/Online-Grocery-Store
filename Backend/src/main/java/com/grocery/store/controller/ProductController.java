package com.grocery.store.controller;

import com.grocery.store.dto.request.CreateProductRequest;
import com.grocery.store.dto.request.UpdateProductRequest;
import com.grocery.store.dto.response.ProductResponse;
import com.grocery.store.entity.Product;
import com.grocery.store.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse createProduct(@Valid @RequestBody CreateProductRequest request) {
        Product product = productService.createProduct(
                request.name(),
                request.description(),
                request.imageUrl(),
                request.price(),
                request.stockQuantity(),
                request.categoryId()
        );

        return ProductResponse.from(product);
    }

    @GetMapping
    public List<ProductResponse> getProducts(@RequestParam(required = false) String search) {
        List<Product> products = search == null || search.isBlank()
                ? productService.getActiveProducts()
                : productService.searchProducts(search);

        return products.stream()
                .map(ProductResponse::from)
                .toList();
    }

    @GetMapping("/category/{categoryId}")
    public List<ProductResponse> getProductsByCategory(@PathVariable Long categoryId) {
        return productService.getProductsByCategory(categoryId)
                .stream()
                .map(ProductResponse::from)
                .toList();
    }

    @DeleteMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(@PathVariable Long productId) {
        productService.deleteProduct(productId);
    }

    @PatchMapping("/{productId}")
    public ProductResponse updateProduct(
            @PathVariable Long productId,
            @Valid @RequestBody UpdateProductRequest request
    ) {
        Product product = productService.updateProduct(
                productId,
                request.name(),
                request.description(),
                request.imageUrl(),
                request.price(),
                request.stockQuantity(),
                request.categoryId()
        );

        return ProductResponse.from(product);
    }
}

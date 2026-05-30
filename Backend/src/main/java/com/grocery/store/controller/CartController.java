package com.grocery.store.controller;

import com.grocery.store.dto.request.AddToCartRequest;
import com.grocery.store.dto.request.UpdateCartItemRequest;
import com.grocery.store.dto.response.CartItemResponse;
import com.grocery.store.entity.CartItem;
import com.grocery.store.service.CartService;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public CartItemResponse addProduct(@Valid @RequestBody AddToCartRequest request) {
        CartItem cartItem = cartService.addProduct(
                request.userId(),
                request.productId(),
                request.quantity()
        );

        return CartItemResponse.from(cartItem);
    }

    @GetMapping("/{userId}")
    public List<CartItemResponse> getCartItems(@PathVariable Long userId) {
        return cartService.getCartItems(userId)
                .stream()
                .map(CartItemResponse::from)
                .toList();
    }

    @PatchMapping("/items/{cartItemId}")
    public CartItemResponse updateCartItem(
            @PathVariable Long cartItemId,
            @Valid @RequestBody UpdateCartItemRequest request
    ) {
        CartItem cartItem = cartService.updateCartItem(cartItemId, request.quantity());
        return CartItemResponse.from(cartItem);
    }

    @DeleteMapping("/items/{cartItemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeCartItem(@PathVariable Long cartItemId) {
        cartService.removeCartItem(cartItemId);
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearCart(@PathVariable Long userId) {
        cartService.clearCart(userId);
    }
}

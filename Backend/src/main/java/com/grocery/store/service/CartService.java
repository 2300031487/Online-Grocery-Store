package com.grocery.store.service;

import com.grocery.store.entity.Cart;
import com.grocery.store.entity.CartItem;
import com.grocery.store.entity.Product;
import com.grocery.store.entity.User;
import com.grocery.store.exception.BusinessRuleException;
import com.grocery.store.exception.ResourceNotFoundException;
import com.grocery.store.repository.CartItemRepository;
import com.grocery.store.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final UserService userService;
    private final ProductService productService;

    @Transactional
    public Cart getOrCreateCart(Long userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userService.getById(userId);
                    Cart cart = Cart.builder()
                            .user(user)
                            .build();
                    return cartRepository.save(cart);
                });
    }

    @Transactional
    public CartItem addProduct(Long userId, Long productId, Integer quantity) {
        Cart cart = getOrCreateCart(userId);
        Product product = productService.getActiveProductById(productId);

        CartItem cartItem = cartItemRepository.findByCartIdAndProductId(cart.getId(), productId)
                .map(existingItem -> {
                    int updatedQuantity = existingItem.getQuantity() + quantity;
                    validateStock(product, updatedQuantity);
                    existingItem.setQuantity(updatedQuantity);
                    return existingItem;
                })
                .orElseGet(() -> {
                    validateStock(product, quantity);
                    return CartItem.builder()
                            .cart(cart)
                            .product(product)
                            .quantity(quantity)
                            .build();
                });

        return cartItemRepository.save(cartItem);
    }

    @Transactional
    public List<CartItem> getCartItems(Long userId) {
        Cart cart = getOrCreateCart(userId);
        List<CartItem> cartItems = cartItemRepository.findByCartId(cart.getId());
        List<CartItem> activeItems = cartItems.stream()
                .filter(item -> Boolean.TRUE.equals(item.getProduct().getActive()))
                .toList();

        cartItems.stream()
                .filter(item -> !Boolean.TRUE.equals(item.getProduct().getActive()))
                .forEach(cartItemRepository::delete);

        return activeItems;
    }

    @Transactional
    public CartItem updateCartItem(Long cartItemId, Integer quantity) {
        CartItem cartItem = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));

        validateStock(cartItem.getProduct(), quantity);
        cartItem.setQuantity(quantity);
        return cartItemRepository.save(cartItem);
    }

    @Transactional
    public void removeCartItem(Long cartItemId) {
        if (!cartItemRepository.existsById(cartItemId)) {
            throw new ResourceNotFoundException("Cart item not found");
        }
        cartItemRepository.deleteById(cartItemId);
    }

    @Transactional
    public void clearCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        cartItemRepository.deleteByCartId(cart.getId());
    }

    private void validateStock(Product product, Integer requestedQuantity) {
        if (product.getStockQuantity() < requestedQuantity) {
            throw new BusinessRuleException("Not enough stock available for " + product.getName());
        }
    }
}

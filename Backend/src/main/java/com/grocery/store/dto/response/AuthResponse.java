package com.grocery.store.dto.response;

public record AuthResponse(
        String token,
        String refreshToken,
        String tokenType,
        UserResponse user
) {

    public static AuthResponse bearer(String token, String refreshToken, UserResponse user) {
        return new AuthResponse(token, refreshToken, "Bearer", user);
    }
}

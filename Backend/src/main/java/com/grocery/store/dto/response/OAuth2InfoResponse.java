package com.grocery.store.dto.response;

public record OAuth2InfoResponse(
        String loginUrl,
        String callbackUrl,
        String provider
) {
}

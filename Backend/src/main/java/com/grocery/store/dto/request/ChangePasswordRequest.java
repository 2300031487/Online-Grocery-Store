package com.grocery.store.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotNull(message = "User ID is required")
        Long userId,

        @NotBlank(message = "Current password is required")
        String currentPassword,

        @Size(min = 6, message = "New password must have at least 6 characters")
        @NotBlank(message = "New password is required")
        String newPassword
) {
}

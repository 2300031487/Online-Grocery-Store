package com.grocery.store.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @Email(message = "Email should be valid")
        @NotBlank(message = "Email is required")
        @Pattern(regexp = "^[A-Za-z0-9._%+-]+@gmail\\.com$", message = "Only Gmail addresses are allowed")
        String email,

        @Size(min = 6, message = "New password must have at least 6 characters")
        @NotBlank(message = "New password is required")
        String newPassword
) {
}

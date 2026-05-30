package com.grocery.store.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LoginRequest(
        @Email(message = "Email should be valid")
        @NotBlank(message = "Email is required")
        @Pattern(regexp = "^[A-Za-z0-9._%+-]+@gmail\\.com$", message = "Only Gmail addresses are allowed")
        String email,

        @NotBlank(message = "Password is required")
        String password
) {
}

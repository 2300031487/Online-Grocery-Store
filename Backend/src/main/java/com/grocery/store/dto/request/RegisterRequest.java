package com.grocery.store.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Full name is required")
        String fullName,

        @Email(message = "Email should be valid")
        @NotBlank(message = "Email is required")
        @Pattern(regexp = "^[A-Za-z0-9._%+-]+@gmail\\.com$", message = "Only Gmail addresses are allowed")
        String email,

        @Size(min = 6, message = "Password must have at least 6 characters")
        @NotBlank(message = "Password is required")
        String password,

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^[6-9]\\d{9}$", message = "Phone number must be a valid 10 digit Indian mobile number")
        String phoneNumber
) {
}

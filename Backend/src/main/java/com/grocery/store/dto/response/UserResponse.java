package com.grocery.store.dto.response;

import com.grocery.store.entity.User;
import com.grocery.store.entity.UserRole;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        String phoneNumber,
        UserRole role
) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getRole()
        );
    }
}

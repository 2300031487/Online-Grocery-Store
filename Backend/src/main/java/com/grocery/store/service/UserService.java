package com.grocery.store.service;

import com.grocery.store.entity.User;
import com.grocery.store.entity.UserRole;
import com.grocery.store.exception.BusinessRuleException;
import com.grocery.store.exception.DuplicateResourceException;
import com.grocery.store.exception.ResourceNotFoundException;
import com.grocery.store.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User registerCustomer(String fullName, String email, String password, String phoneNumber) {
        return registerUser(fullName, email, password, phoneNumber, UserRole.CUSTOMER);
    }

    public User registerAdmin(String fullName, String email, String password, String phoneNumber) {
        return registerUser(fullName, email, password, phoneNumber, UserRole.ADMIN);
    }

    private User registerUser(String fullName, String email, String password, String phoneNumber, UserRole role) {
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email is already registered");
        }

        User user = User.builder()
                .fullName(fullName)
                .email(email)
                .password(passwordEncoder.encode(password))
                .phoneNumber(phoneNumber)
                .role(role)
                .build();

        return userRepository.save(user);
    }

    public User getById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public void resetPassword(String email, String newPassword) {
        User user = getByEmail(email);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = getById(userId);
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BusinessRuleException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}

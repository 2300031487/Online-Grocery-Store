package com.grocery.store.controller;

import com.grocery.store.dto.request.ChangePasswordRequest;
import com.grocery.store.dto.request.ForgotPasswordRequest;
import com.grocery.store.dto.request.LoginRequest;
import com.grocery.store.dto.request.RefreshTokenRequest;
import com.grocery.store.dto.request.RegisterRequest;
import com.grocery.store.dto.response.AuthResponse;
import com.grocery.store.dto.response.MessageResponse;
import com.grocery.store.dto.response.UserResponse;
import com.grocery.store.entity.User;
import com.grocery.store.security.JwtService;
import com.grocery.store.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.registerCustomer(
                request.fullName(),
                request.email(),
                request.password(),
                request.phoneNumber()
        );

        return UserResponse.from(user);
    }

    @PostMapping("/register-admin")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse registerAdmin(@Valid @RequestBody RegisterRequest request) {
        User user = userService.registerAdmin(
                request.fullName(),
                request.email(),
                request.password(),
                request.phoneNumber()
        );

        return UserResponse.from(user);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String token = jwtService.generateToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);
        User user = userService.getByEmail(request.email());

        return AuthResponse.bearer(token, refreshToken, UserResponse.from(user));
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        String email = jwtService.extractUsername(request.refreshToken());
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername(email)
                .password("")
                .authorities("ROLE_CUSTOMER")
                .build();

        if (!jwtService.isTokenValid(request.refreshToken(), userDetails)) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid refresh token");
        }

        User user = userService.getByEmail(email);
        UserDetails freshUserDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities("ROLE_" + user.getRole().name())
                .build();

        String token = jwtService.generateToken(freshUserDetails);
        String refreshToken = jwtService.generateRefreshToken(freshUserDetails);

        return AuthResponse.bearer(token, refreshToken, UserResponse.from(user));
    }

    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        userService.resetPassword(request.email(), request.newPassword());
        return new MessageResponse("Password reset successfully. You can login with the new password.");
    }

    @PostMapping("/change-password")
    public MessageResponse changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request.userId(), request.currentPassword(), request.newPassword());
        return new MessageResponse("Password changed successfully.");
    }
}

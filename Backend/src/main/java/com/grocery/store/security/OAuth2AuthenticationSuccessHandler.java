package com.grocery.store.security;

import com.grocery.store.entity.User;
import com.grocery.store.entity.UserRole;
import com.grocery.store.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");

        userRepository.findByEmail(email)
                .orElseGet(() -> userRepository.save(User.builder()
                        .fullName(name)
                        .email(email)
                        .password("OAUTH2_USER")
                        .phoneNumber("N/A")
                        .role(UserRole.CUSTOMER)
                        .build()));

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        String token = jwtService.generateToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        response.setContentType("application/json");
        response.getWriter().write("""
                {"token":"%s","refreshToken":"%s","tokenType":"Bearer"}
                """.formatted(token, refreshToken));
    }
}

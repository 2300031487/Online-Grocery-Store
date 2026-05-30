package com.grocery.store.controller;

import com.grocery.store.dto.response.OAuth2InfoResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/oauth2")
public class OAuth2Controller {

    @GetMapping("/google")
    public OAuth2InfoResponse googleLoginInfo() {
        return new OAuth2InfoResponse(
                "/oauth2/authorization/google",
                "/login/oauth2/code/google",
                "google"
        );
    }
}

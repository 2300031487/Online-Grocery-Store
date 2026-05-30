package com.grocery.store.controller;

import com.grocery.store.dto.request.CreatePaymentOrderRequest;
import com.grocery.store.dto.response.PaymentOrderResponse;
import com.grocery.store.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/razorpay/order")
    public PaymentOrderResponse createRazorpayOrder(@Valid @RequestBody CreatePaymentOrderRequest request) {
        return paymentService.createRazorpayOrder(request.userId());
    }
}
